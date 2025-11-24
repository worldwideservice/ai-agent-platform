import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma, pool } from '../config/database';
import { chatCompletion, ChatMessage } from '../services/openrouter.service';
import { getInstructionsForCurrentStage, buildEnhancedSystemPrompt } from '../services/pipeline.service';
import { getRelevantKnowledge, buildKnowledgeContext } from '../services/knowledge-base.service';

/**
 * POST /api/chat/message
 * Отправить сообщение агенту и получить ответ
 */
export const sendChatMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { agentId, message, history, pipelineId, stageId } = req.body;

    // Валидация
    if (!agentId || !message) {
      return res.status(400).json({ message: 'Agent ID and message are required' });
    }

    // Получаем агента
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Проверяем что агент принадлежит пользователю
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Получаем контекстно-зависимые инструкции для текущего этапа (если они есть)
    const stageInstructions = getInstructionsForCurrentStage(
      agent.pipelineSettings,
      pipelineId || null,
      stageId || null
    );

    // Получаем релевантные статьи из базы знаний (если БЗ настроена)
    let knowledgeContext: string | null = null;
    if (agent.kbSettings) {
      try {
        const knowledgeArticles = await getRelevantKnowledge(
          pool,
          userId,
          agent.kbSettings,
          message,
          3 // Максимум 3 релевантные статьи
        );
        knowledgeContext = buildKnowledgeContext(knowledgeArticles);

        if (knowledgeContext) {
          console.log(`📚 Using ${knowledgeArticles.length} knowledge base articles for context`);
        }
      } catch (error) {
        console.error('Error fetching knowledge base:', error);
        // Продолжаем без БЗ если произошла ошибка
      }
    }

    // Формируем расширенный системный промпт с контекстом текущего этапа и базой знаний
    const systemPrompt = buildEnhancedSystemPrompt(
      agent.systemInstructions,
      stageInstructions,
      knowledgeContext
    );

    // Логируем для дебага
    if (stageInstructions) {
      console.log(`🎯 Using context-aware instructions | Process: ${pipelineId} | Stage: ${stageId}`);
    }

    // Конвертируем историю из формата фронтенда в формат OpenRouter
    const messages: ChatMessage[] = [
      // Системное сообщение с инструкциями (базовые + инструкции этапа)
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Добавляем историю сообщений
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text || msg.content || '',
        });
      }
    }

    // Добавляем текущее сообщение пользователя
    messages.push({
      role: 'user',
      content: message,
    });

    // Отправляем запрос в OpenRouter
    const result = await chatCompletion({
      model: agent.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Извлекаем ответ
    const response = result.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';

    // Логируем в ChatLog
    await prisma.chatLog.create({
      data: {
        agentId: agent.id,
        message,
        response,
        model: agent.model,
        userId,
      },
    });

    // Обновляем счетчик использованных ответов
    await prisma.user.update({
      where: { id: userId },
      data: {
        responsesUsed: {
          increment: 1,
        },
      },
    });

    return res.json({
      response,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
