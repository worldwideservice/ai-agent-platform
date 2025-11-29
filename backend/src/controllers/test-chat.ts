/**
 * Test Chat Controller
 * Полноценный тестовый чат для проверки агента со ВСЕМИ настройками
 *
 * Этот чат использует ту же логику что и продакшн агент:
 * - База знаний (статьи, категории)
 * - Роли и источники обучения
 * - Расширенные настройки (модель, температура, язык)
 * - Memory (память о клиенте)
 * - Knowledge Graph (граф связей)
 * - Триггеры
 * - Настройки воронок и этапов (тестовые)
 */

import { Response } from "express";
import { AuthRequest } from "../types";
import { prisma, pool } from "../config/database";
import realPrisma from "../lib/prisma";
import { chatCompletion, ChatMessage } from "../services/openrouter.service";
import { buildEnhancedSystemPrompt } from "../services/pipeline.service";
import {
  getExtendedKnowledge,
  buildExtendedKnowledgeContext,
  parseKBSettings,
} from "../services/knowledge-base.service";
import { getAgentRoleKnowledge } from "../services/training.service";
import {
  getClientMemoryContext,
  extractAndStoreMemoryFacts,
  getGraphRelatedContext,
} from "../services/memory.service";
import {
  evaluateTriggerConditions,
  TriggerCondition,
} from "../services/ai-trigger.service";
import { processAgentResponse } from "../services/document-delivery.service";

/**
 * Генерирует краткое название для разговора на основе первых сообщений
 * Использует быструю модель gpt-4o-mini для минимальной задержки
 */
async function generateConversationTitle(
  userMessage: string
): Promise<string> {
  try {
    const result = await chatCompletion({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты генератор названий для диалогов. Придумай краткое название (3-6 слов) на основе ВОПРОСА клиента.

Правила:
- Название должно отражать ЧТО ИМЕННО спрашивает или хочет клиент
- Не используй кавычки
- Не начинай с "Вопрос о...", "Запрос о..."
- Пиши на том же языке, что и вопрос клиента
- Максимум 6 слов
- Если вопрос простой (приветствие), напиши что-то общее вроде "Новый разговор"

Примеры:
Вопрос: "как получить рабочую визу в польшу" → Рабочая виза в Польшу
Вопрос: "сколько стоит подписка?" → Стоимость подписки
Вопрос: "не работает API интеграция" → Проблема с API интеграцией
Вопрос: "привет" → Новый разговор`,
        },
        {
          role: "user",
          content: userMessage.substring(0, 300),
        },
      ],
      temperature: 0.5,
      max_tokens: 30,
    });

    const title = result.choices[0]?.message?.content?.trim();
    if (title && title.length > 0 && title.length <= 100) {
      return title;
    }
    return "Новый разговор";
  } catch (error) {
    console.error("Error generating conversation title:", error);
    return "Новый разговор";
  }
}

// Интерфейс для документа агента
interface AgentDocumentSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Форматирует размер файла в человекочитаемый вид
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Получает список документов агента
 */
async function getAvailableAgentDocuments(
  agentId: string,
  kbSettingsJson: string | null,
): Promise<AgentDocumentSummary[]> {
  try {
    const kbSettings = parseKBSettings(kbSettingsJson);
    const allowAllDocuments = kbSettings?.allowAllDocuments ?? true;

    const whereClause: any = { agentId };
    if (!allowAllDocuments) {
      whereClause.isEnabled = true;
    }

    const documents = await realPrisma.agentDocument.findMany({
      where: whereClause,
      select: { id: true, fileName: true, fileType: true, fileSize: true },
      orderBy: { fileName: "asc" },
      take: 30,
    });

    return documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
    }));
  } catch (error) {
    console.error("Error fetching agent documents:", error);
    return [];
  }
}

/**
 * Формирует промпт с доступными документами
 */
function buildAvailableDocumentsPrompt(
  documents: AgentDocumentSummary[],
): string {
  if (documents.length === 0) return "";

  const documentsList = documents
    .map(
      (d) =>
        `- "${d.fileName}" (${d.fileType.toUpperCase()}, ${formatFileSize(d.fileSize)})`,
    )
    .join("\n");

  return `

## Доступные документы для отправки клиенту

${documentsList}

Вы можете предложить клиенту эти документы когда это уместно в контексте разговора.`;
}

/**
 * Формирует инструкцию по языку ответа
 */
function buildLanguagePrompt(
  autoDetectLanguage: boolean,
  responseLanguage: string | null,
): string {
  if (autoDetectLanguage) {
    return `

## Язык общения
ВАЖНО: Автоматически определяй язык, на котором пишет пользователь, и ВСЕГДА отвечай на том же языке.`;
  }

  if (responseLanguage && responseLanguage.trim()) {
    return `

## Язык общения
ВАЖНО: ВСЕГДА отвечай на языке: ${responseLanguage.trim()}.`;
  }

  return "";
}

/**
 * POST /api/test-chat/conversations
 * Создать новый тестовый разговор
 */
export async function createTestConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { agentId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!agentId) {
      return res.status(400).json({ error: "agentId is required" });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const conversation = await prisma.testConversation.create({
      data: {
        userId,
        agentId,
        title: "Новый тестовый разговор",
      },
    });

    return res.json({ conversation });
  } catch (error: any) {
    console.error("Error creating test conversation:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/test-chat/conversations
 * Получить все тестовые разговоры пользователя для агента
 */
export async function getTestConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { agentId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!agentId) {
      return res.status(400).json({ error: "agentId is required" });
    }

    const conversations = await prisma.testConversation.findMany({
      where: { userId, agentId: agentId as string },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        agentId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ conversations });
  } catch (error: any) {
    console.error("Error getting test conversations:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/test-chat/conversations/:id
 * Получить разговор с сообщениями
 */
export async function getTestConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await prisma.testConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Парсим sources из JSON строки
    const conversationWithParsedSources = {
      ...conversation,
      messages: conversation.messages.map((msg: any) => ({
        ...msg,
        sources: msg.sources ? JSON.parse(msg.sources) : null,
      })),
    };

    return res.json({ conversation: conversationWithParsedSources });
  } catch (error: any) {
    console.error("Error getting test conversation:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/test-chat/conversations/:id
 * Удалить разговор
 */
export async function deleteTestConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await prisma.testConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await prisma.testConversation.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting test conversation:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/test-chat/conversations/:id
 * Обновить заголовок разговора
 */
export async function updateTestConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await prisma.testConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updated = await prisma.testConversation.update({
      where: { id },
      data: { title },
    });

    return res.json({ conversation: updated });
  } catch (error: any) {
    console.error("Error updating test conversation:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/test-chat/message
 * Отправить сообщение в тестовый чат
 * Использует ВСЕ настройки агента как в продакшне
 */
export async function sendTestMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { agentId, conversationId, message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!agentId || !message) {
      return res
        .status(400)
        .json({ error: "agentId and message are required" });
    }

    console.log(`\n🧪 [TestChat] Processing message for agent ${agentId}`);

    // 1. Получаем агента со всеми связями
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // 2. Получаем расширенные настройки агента
    const advancedSettings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // 3. Получаем или создаём разговор
    let conversation;
    if (conversationId) {
      conversation = await prisma.testConversation.findFirst({
        where: { id: conversationId, userId },
      });
    }

    if (!conversation) {
      conversation = await prisma.testConversation.create({
        data: {
          userId,
          agentId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        },
      });
    }

    // 4. Сохраняем сообщение пользователя
    await prisma.testConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // 5. Получаем историю сообщений
    const historyMessages = await prisma.testConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    // ============================================
    // СОБИРАЕМ ВСЕ КОНТЕКСТЫ АГЕНТА
    // ============================================

    const sources: any = {};

    // 6. База знаний (KB) - статьи, документы, файлы
    let knowledgeContext: string | null = null;
    let usedKnowledgeArticles: Array<{
      id: number;
      title: string;
      categoryName?: string;
      relevanceScore?: number;
    }> = [];
    let usedKBDocuments: Array<{ id: string; title: string; similarity: number }> = [];
    let usedKBFiles: Array<{ id: string; title: string; similarity: number }> = [];

    try {
      const extendedKnowledge = await getExtendedKnowledge(
        pool,
        userId,
        agentId,
        agent.kbSettings,
        message,
        5,
      );

      if (extendedKnowledge.totalResults > 0) {
        knowledgeContext = buildExtendedKnowledgeContext(extendedKnowledge);

        // Заполняем метаданные для трекинга источников
        if (extendedKnowledge.metadata) {
          // Статьи базы знаний
          usedKnowledgeArticles = extendedKnowledge.metadata.articles.map((a) => ({
            id: parseInt(a.id),
            title: a.title,
            categoryName: a.category,
            relevanceScore: Math.round(a.similarity * 100),
          }));

          // Документы
          usedKBDocuments = extendedKnowledge.metadata.documents.map((d) => ({
            id: d.id,
            title: d.title,
            similarity: Math.round(d.similarity * 100),
          }));

          // Файлы
          usedKBFiles = extendedKnowledge.metadata.files.map((f) => ({
            id: f.id,
            title: f.title,
            similarity: Math.round(f.similarity * 100),
          }));
        }

        console.log(
          `📚 Using extended knowledge: ${extendedKnowledge.articles.length} articles, ${extendedKnowledge.documents.length} documents, ${extendedKnowledge.files.length} files`,
        );

        // Добавляем в sources
        if (usedKnowledgeArticles.length > 0) {
          sources.knowledgeBase = { articles: usedKnowledgeArticles };
        }
        if (usedKBDocuments.length > 0) {
          sources.documents = { count: usedKBDocuments.length, items: usedKBDocuments };
        }
        if (usedKBFiles.length > 0) {
          sources.files = { count: usedKBFiles.length, items: usedKBFiles };
        }
      }
    } catch (error) {
      console.error("Error fetching extended knowledge:", error);
    }

    // 7. Роль и источники обучения
    let roleKnowledge: string | null = null;
    let usedRole: { id: string; name: string } | null = null;

    if (agent.trainingRoleId) {
      try {
        const role = await prisma.trainingRole.findUnique({
          where: { id: agent.trainingRoleId },
          select: { id: true, name: true },
        });
        if (role) {
          usedRole = { id: role.id, name: role.name };
          sources.trainingRole = usedRole;
        }

        roleKnowledge = await getAgentRoleKnowledge(
          agent.trainingRoleId,
          userId,
        );
        if (roleKnowledge) {
          console.log(
            `📖 Using role knowledge (${roleKnowledge.length} chars)`,
          );
        }
      } catch (error) {
        console.error("Error fetching role knowledge:", error);
      }
    }

    // 8. Memory - память о клиенте
    const memoryEnabled = advancedSettings?.memoryEnabled ?? true;
    const graphEnabled = advancedSettings?.graphEnabled ?? true;
    const contextWindowSize = advancedSettings?.contextWindow ?? 20;
    const semanticSearchEnabled =
      advancedSettings?.semanticSearchEnabled ?? true;

    let memoryContext: string = "";
    let graphContext: string = "";
    let existingFacts: string[] = [];
    let memoryNodeIds: string[] = [];

    // Используем ID разговора как "leadId" для тестового чата
    const testLeadId =
      parseInt(conversation.id.replace(/\D/g, "").substring(0, 8) || "0", 10) ||
      999999;

    if (memoryEnabled) {
      try {
        const memoryResult = await getClientMemoryContext(pool, {
          agentId,
          userId,
          leadId: testLeadId,
          currentMessage: message,
          limit: contextWindowSize,
          semanticSearchEnabled,
        });
        memoryContext = memoryResult.context;
        existingFacts = memoryResult.facts;
        memoryNodeIds = memoryResult.nodeIds;

        if (memoryContext) {
          console.log(`🧠 Memory context: ${existingFacts.length} facts`);
          sources.memory = {
            factsCount: existingFacts.length,
            facts: existingFacts.slice(0, 5),
          };
        }

        // Graph связи
        if (graphEnabled && memoryNodeIds.length > 0) {
          try {
            const graphResult = await getGraphRelatedContext(pool, {
              agentId,
              nodeIds: memoryNodeIds,
              limit: 5,
            });
            graphContext = graphResult.context;
            if (graphResult.relations.length > 0) {
              sources.graph = { relationsCount: graphResult.relations.length };
            }
          } catch (error) {
            console.error("Error fetching graph context:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching memory context:", error);
      }
    }

    // 9. Документы агента (для отправки клиенту через команды)
    const availableDocuments = await getAvailableAgentDocuments(
      agentId,
      agent.kbSettings,
    );
    if (availableDocuments.length > 0) {
      console.log(`📄 Loaded ${availableDocuments.length} agent documents for delivery`);
      // Примечание: sources.documents уже заполнен из extended knowledge выше
      // Здесь мы только загружаем список для delivery промпта
    }

    // 10. Триггеры
    let matchedTriggers: Array<{
      id: string;
      name: string;
      confidence: number;
    }> = [];
    try {
      const triggers = await prisma.trigger.findMany({
        where: { agentId, isActive: true },
        include: { actions: { orderBy: { order: "asc" } } },
      });

      if (triggers.length > 0) {
        const triggerConditions: TriggerCondition[] = triggers.map((t) => ({
          id: t.id,
          name: t.name,
          condition: t.condition,
        }));

        const conversationContext = historyMessages
          .filter((m: any) => m.role === "user")
          .map((m: any) => `Клиент: ${m.content}`);

        const evaluationResults = await evaluateTriggerConditions(
          message,
          conversationContext,
          triggerConditions,
          advancedSettings?.triggerEvaluationModel || "openai/gpt-4o-mini",
        );

        for (const result of evaluationResults) {
          if (result.matched) {
            console.log(
              `✅ Trigger matched: ${result.triggerName} (confidence: ${result.confidence})`,
            );
            matchedTriggers.push({
              id: result.triggerId,
              name: result.triggerName,
              confidence: result.confidence,
            });
          }
        }

        if (matchedTriggers.length > 0) {
          sources.triggers = matchedTriggers;
        }
      }
    } catch (error) {
      console.error("Error evaluating triggers:", error);
    }

    // ============================================
    // СТРОИМ СИСТЕМНЫЙ ПРОМПТ
    // ============================================

    let systemPrompt = buildEnhancedSystemPrompt(
      roleKnowledge,
      agent.systemInstructions,
      null, // stageInstructions - в тестовом чате нет этапов
      knowledgeContext,
    );

    // Добавляем контекст памяти
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    // Добавляем контекст графа
    if (graphContext) {
      systemPrompt += graphContext;
    }

    // Добавляем документы
    const documentsPrompt = buildAvailableDocumentsPrompt(availableDocuments);
    if (documentsPrompt) {
      systemPrompt += documentsPrompt;
    }

    // Добавляем языковые настройки
    const languagePrompt = buildLanguagePrompt(
      advancedSettings?.autoDetectLanguage ?? false,
      advancedSettings?.responseLanguage ?? null,
    );
    if (languagePrompt) {
      systemPrompt += languagePrompt;
    }

    // Добавляем контекст тестового чата
    systemPrompt += `

## Режим тестирования
Это тестовый чат для проверки настроек агента. Отвечай как будто общаешься с реальным клиентом.`;

    // ============================================
    // ГЕНЕРАЦИЯ ОТВЕТА
    // ============================================

    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    // Добавляем историю (кроме последнего сообщения пользователя - оно уже добавлено)
    for (const msg of historyMessages.slice(0, -1)) {
      messages.push({
        role:
          msg.role === "model"
            ? "assistant"
            : (msg.role as "user" | "assistant"),
        content: msg.content,
      });
    }

    // Добавляем текущее сообщение
    messages.push({
      role: "user",
      content: message,
    });

    // Используем модель из настроек
    const modelToUse =
      advancedSettings?.model || agent.model || "openai/gpt-4o-mini";

    console.log(`🧠 Generating response with model: ${modelToUse}`);

    const result = await chatCompletion({
      model: modelToUse,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const rawResponse =
      result.choices[0]?.message?.content ||
      "Извините, не удалось получить ответ.";

    console.log(`✅ Response generated (${rawResponse.length} chars)`);

    // 11. Обрабатываем ответ - парсим команды документов
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const { cleanResponse, attachedDocuments, emailDocuments } =
      await processAgentResponse(rawResponse, agentId, baseUrl);

    // Добавляем документы в sources если есть
    if (attachedDocuments.length > 0) {
      sources.attachedDocuments = attachedDocuments;
    }

    // 12. Сохраняем ответ ассистента (чистый, без команд)
    await prisma.testConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "model",
        content: cleanResponse,
        sources:
          Object.keys(sources).length > 0 ? JSON.stringify(sources) : null,
      },
    });

    // 13. Обновляем разговор и генерируем название если это первый обмен
    // historyMessages содержит сообщения ДО ответа ассистента
    // Если там только 1 сообщение (user), значит это первый обмен
    const messageCount = historyMessages.length;
    let generatedTitle: string | undefined;

    // Генерируем AI-название после первого обмена
    // messageCount === 1 означает что был только user message, сейчас добавляем assistant
    if (messageCount === 1) {
      // Генерируем название на основе ВОПРОСА клиента (не ответа агента)
      generatedTitle = await generateConversationTitle(message);

      await prisma.testConversation.update({
        where: { id: conversation.id },
        data: { title: generatedTitle, updatedAt: new Date() },
      });
      console.log(`📝 Generated title for conversation: "${generatedTitle}"`);
    } else {
      await prisma.testConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    // 14. Извлекаем факты для памяти (асинхронно)
    if (memoryEnabled) {
      extractAndStoreMemoryFacts(pool, {
        agentId,
        userId,
        leadId: testLeadId,
        userMessage: message,
        agentResponse: cleanResponse,
        existingFacts,
        systemInstructions: agent.systemInstructions || "",
        model: advancedSettings?.factExtractionModel || "openai/gpt-4o-mini",
      }).catch((err) => console.error("Memory extraction error:", err));
    }

    // Тестовый чат не отправляет реальные email - только логирует для отладки
    // Реальная отправка происходит через Kommo интеграцию в webhook-worker
    if (emailDocuments.length > 0) {
      console.log(`📧 Email documents requested: ${emailDocuments.map((d) => d.fileName).join(", ")}`);
    }

    return res.json({
      response: cleanResponse,
      conversationId: conversation.id,
      sources: Object.keys(sources).length > 0 ? sources : undefined,
      model: modelToUse,
      attachedDocuments: attachedDocuments.length > 0 ? attachedDocuments : undefined,
      triggeredActions:
        matchedTriggers.length > 0
          ? matchedTriggers.map((t) => t.name)
          : undefined,
      generatedTitle: generatedTitle,
    });
  } catch (error: any) {
    console.error("Error in test chat:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/test-chat/agent-info/:agentId
 * Получить информацию о настройках агента для отображения в UI
 */
export async function getAgentInfo(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Получаем расширенные настройки
    const advancedSettings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // Получаем роль
    let role = null;
    if (agent.trainingRoleId) {
      role = await prisma.trainingRole.findUnique({
        where: { id: agent.trainingRoleId },
        select: { id: true, name: true, description: true },
      });
    }

    // Получаем количество статей KB
    const kbSettings = agent.kbSettings
      ? parseKBSettings(agent.kbSettings)
      : null;
    let kbArticlesCount = 0;
    if (kbSettings) {
      kbArticlesCount = await prisma.kbArticle.count({
        where: { userId, isActive: true },
      });
    }

    // Получаем документы
    const documentsCount = await realPrisma.agentDocument.count({
      where: { agentId },
    });

    // Получаем триггеры
    const triggers = await prisma.trigger.findMany({
      where: { agentId, isActive: true },
      select: { id: true },
    });
    const triggersCount = triggers.length;

    return res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        model: advancedSettings?.model || agent.model,
        isActive: agent.isActive,
      },
      settings: {
        hasSystemInstructions: !!agent.systemInstructions,
        systemInstructionsLength: agent.systemInstructions?.length || 0,
        hasRole: !!role,
        roleName: role?.name,
        hasKnowledgeBase: kbArticlesCount > 0,
        kbArticlesCount,
        hasDocuments: documentsCount > 0,
        documentsCount,
        hasTrigggers: triggersCount > 0,
        triggersCount,
        memoryEnabled: advancedSettings?.memoryEnabled ?? true,
        graphEnabled: advancedSettings?.graphEnabled ?? true,
        autoDetectLanguage: advancedSettings?.autoDetectLanguage ?? false,
        responseLanguage: advancedSettings?.responseLanguage,
        scheduleEnabled: advancedSettings?.scheduleEnabled ?? false,
      },
    });
  } catch (error: any) {
    console.error("Error getting agent info:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/test-chat/prompts/:agentId
 * Генерирует релевантные подсказки для тестирования агента
 * на основе его настроек (KB, триггеры, документы, роль)
 */
export async function getAgentPrompts(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const prompts: Array<{
      icon: string;
      text: string;
      fullPrompt: string;
      testType: string;
    }> = [];

    // 1. Проверяем базу знаний - берём случайную статью
    const kbArticles = await prisma.kbArticle.findMany({
      where: { userId, isActive: true },
      select: { id: true, title: true },
      take: 5,
    });

    if (kbArticles.length > 0) {
      const randomArticle = kbArticles[Math.floor(Math.random() * kbArticles.length)];
      prompts.push({
        icon: "BookOpen",
        text: `Расскажи о: ${randomArticle.title.substring(0, 30)}${randomArticle.title.length > 30 ? '...' : ''}`,
        fullPrompt: `Расскажи подробнее о "${randomArticle.title}"`,
        testType: "knowledge_base",
      });
    }

    // 2. Проверяем документы агента
    const documents = await realPrisma.agentDocument.findMany({
      where: { agentId },
      select: { id: true, fileName: true, title: true },
      take: 3,
    });

    if (documents.length > 0) {
      const doc = documents[0];
      const docName = doc.title || doc.fileName;
      prompts.push({
        icon: "FileText",
        text: `Что есть в документе "${docName.substring(0, 25)}${docName.length > 25 ? '...' : ''}"`,
        fullPrompt: `Что содержится в документе "${docName}"? Расскажи основное.`,
        testType: "documents",
      });
    }

    // 3. Проверяем триггеры
    const triggers = await prisma.trigger.findMany({
      where: { agentId, isActive: true },
      select: { id: true, name: true, conditions: true },
      take: 3,
    });

    if (triggers.length > 0) {
      const trigger = triggers[0];
      // Пытаемся извлечь ключевые слова из условий
      let triggerPrompt = `Проверка триггера "${trigger.name}"`;
      try {
        const conditions = trigger.conditions as any[];
        if (conditions && conditions.length > 0) {
          const keywordCondition = conditions.find((c: any) => c.type === 'keyword');
          if (keywordCondition?.keywords?.length > 0) {
            triggerPrompt = keywordCondition.keywords[0];
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
      prompts.push({
        icon: "Zap",
        text: `Активировать триггер "${trigger.name.substring(0, 20)}${trigger.name.length > 20 ? '...' : ''}"`,
        fullPrompt: triggerPrompt,
        testType: "trigger",
      });
    }

    // 4. Проверяем роль агента
    if (agent.trainingRoleId) {
      const role = await prisma.trainingRole.findUnique({
        where: { id: agent.trainingRoleId },
        select: { name: true, description: true },
      });
      if (role) {
        prompts.push({
          icon: "GraduationCap",
          text: `Опиши свою роль`,
          fullPrompt: `Расскажи о себе. Кто ты и чем можешь помочь?`,
          testType: "role",
        });
      }
    }

    // 5. Добавляем общие подсказки если мало специфичных
    if (prompts.length < 4) {
      const generalPrompts = [
        {
          icon: "MessageCircle",
          text: "Привет! Чем можешь помочь?",
          fullPrompt: "Привет! Расскажи, чем ты можешь мне помочь?",
          testType: "general",
        },
        {
          icon: "HelpCircle",
          text: "Какие у тебя возможности?",
          fullPrompt: "Какие у тебя есть возможности? Что ты умеешь делать?",
          testType: "general",
        },
        {
          icon: "Search",
          text: "Найди информацию",
          fullPrompt: "Помоги мне найти нужную информацию",
          testType: "general",
        },
      ];

      for (const gp of generalPrompts) {
        if (prompts.length >= 4) break;
        prompts.push(gp);
      }
    }

    return res.json({ prompts: prompts.slice(0, 4) });
  } catch (error: any) {
    console.error("Error getting agent prompts:", error);
    return res.status(500).json({ error: error.message });
  }
}
