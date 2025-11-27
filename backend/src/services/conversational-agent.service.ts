/**
 * Conversational Agent Service
 * Обрабатывает входящие сообщения (chat + email) и генерирует ответы AI
 */

import { prisma, pool } from '../config/database';
import realPrisma from '../lib/prisma';
import { chatCompletion, ChatMessage } from './openrouter.service';
import { isAgentEnabledForStage, getInstructionsForCurrentStage, buildEnhancedSystemPrompt } from './pipeline.service';
import { getRelevantKnowledge, buildKnowledgeContext, parseKBSettings } from './knowledge-base.service';
import { sendChatMessage, sendChatFileMessage, sendEmail, getLeadContactEmail, createTask, fetchLeadById } from './kommo.service';
import { generatePublicDocumentUrl } from '../controllers/agent-documents';
import { getCrmContext, buildCrmContextPrompt, executeUpdateRules, CrmContext } from './crm-data.service';
import { getAgentRoleKnowledge } from './training.service';
import { checkAndExecuteChains } from './chain-executor.service';
import { getClientMemoryContext, extractAndStoreMemoryFacts, getGraphRelatedContext } from './memory.service';

// ============================================
// AGENT PAUSE MANAGEMENT (stopOnReply feature)
// ============================================

/**
 * Проверяет, находится ли агент на паузе для данного лида
 * @returns null если не на паузе, или дату паузы если на паузе
 */
export async function getAgentPauseStatus(
  integrationId: string,
  leadId: number
): Promise<{ paused: boolean; pausedAt: Date | null; pausedByUserId: number | null }> {
  const conversation = await prisma.leadConversation.findUnique({
    where: {
      leadId_integrationId: { leadId, integrationId },
    },
    select: { pausedAt: true, pausedByUserId: true },
  });

  if (!conversation || !conversation.pausedAt) {
    return { paused: false, pausedAt: null, pausedByUserId: null };
  }

  return {
    paused: true,
    pausedAt: conversation.pausedAt,
    pausedByUserId: conversation.pausedByUserId,
  };
}

/**
 * Ставит агента на паузу для данного лида (когда отвечает сотрудник)
 */
export async function pauseAgentForLead(
  integrationId: string,
  leadId: number,
  agentId: string,
  employeeUserId: number
): Promise<void> {
  await prisma.leadConversation.upsert({
    where: {
      leadId_integrationId: { leadId, integrationId },
    },
    update: {
      pausedAt: new Date(),
      pausedByUserId: employeeUserId,
    },
    create: {
      integrationId,
      leadId,
      agentId,
      pausedAt: new Date(),
      pausedByUserId: employeeUserId,
    },
  });
  console.log(`⏸️ Agent paused for lead ${leadId} by employee ${employeeUserId}`);
}

/**
 * Снимает паузу с агента для данного лида
 */
export async function resumeAgentForLead(
  integrationId: string,
  leadId: number
): Promise<void> {
  await prisma.leadConversation.updateMany({
    where: {
      leadId,
      integrationId,
    },
    data: {
      pausedAt: null,
      pausedByUserId: null,
    },
  });
  console.log(`▶️ Agent resumed for lead ${leadId}`);
}

/**
 * Проверяет, прошло ли время паузы и можно ли возобновить агента
 * @returns true если агент может отвечать, false если ещё на паузе
 */
export async function checkAndResumeIfExpired(
  integrationId: string,
  leadId: number,
  userId: string
): Promise<boolean> {
  // Получаем статус паузы
  const pauseStatus = await getAgentPauseStatus(integrationId, leadId);
  if (!pauseStatus.paused || !pauseStatus.pausedAt) {
    return true; // Не на паузе - агент может отвечать
  }

  // Получаем настройки пользователя
  const settings = await prisma.userSettings.findUnique({
    where: { userId: userId },
  });

  if (!settings || !settings.stopOnReply) {
    // Если настройка выключена - снимаем паузу и разрешаем
    await resumeAgentForLead(integrationId, leadId);
    return true;
  }

  // Вычисляем время возобновления
  const resumeTime = settings.resumeTime || 30;
  const resumeUnit = settings.resumeUnit || 'дней';

  let resumeAfterMs: number;
  switch (resumeUnit) {
    case 'минут':
      resumeAfterMs = resumeTime * 60 * 1000;
      break;
    case 'часов':
      resumeAfterMs = resumeTime * 60 * 60 * 1000;
      break;
    case 'дней':
    default:
      resumeAfterMs = resumeTime * 24 * 60 * 60 * 1000;
      break;
  }

  const pausedAt = new Date(pauseStatus.pausedAt).getTime();
  const now = Date.now();
  const elapsed = now - pausedAt;

  if (elapsed >= resumeAfterMs) {
    // Время паузы истекло - снимаем паузу
    await resumeAgentForLead(integrationId, leadId);
    console.log(`⏰ Auto-resumed agent for lead ${leadId} after ${resumeTime} ${resumeUnit}`);
    return true;
  }

  // Ещё на паузе
  const remainingMs = resumeAfterMs - elapsed;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  console.log(`⏸️ Agent still paused for lead ${leadId}, ${remainingMinutes} minutes remaining`);
  return false;
}

// Типы для настроек каналов
interface ChannelSettings {
  allChannels: boolean;
  selected: string[];
}

// Интерфейс для документа агента
interface AgentDocumentSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Получает список документов агента, которые он может отправлять клиентам
 * Учитывает настройку allowAllDocuments и isEnabled каждого документа
 */
async function getAvailableAgentDocuments(
  agentId: string,
  kbSettingsJson: string | null
): Promise<AgentDocumentSummary[]> {
  try {
    const kbSettings = parseKBSettings(kbSettingsJson);
    const allowAllDocuments = kbSettings?.allowAllDocuments ?? true;

    // Получаем документы агента
    const whereClause: any = {
      agentId,
    };

    // Если не все документы разрешены - фильтруем только включенные
    if (!allowAllDocuments) {
      whereClause.isEnabled = true;
    }

    const documents = await realPrisma.agentDocument.findMany({
      where: whereClause,
      select: { id: true, fileName: true, fileType: true, fileSize: true, isEnabled: true },
      orderBy: { fileName: 'asc' },
      take: 30,
    });

    // Если allowAllDocuments = true, возвращаем все документы
    // Если false - только isEnabled = true (уже отфильтровано выше)
    return documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
    }));
  } catch (error) {
    console.error('Error fetching agent documents:', error);
    return [];
  }
}

/**
 * Форматирует размер файла в человекочитаемый вид
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Формирует секцию промпта с доступными документами
 */
function buildAvailableDocumentsPrompt(documents: AgentDocumentSummary[]): string {
  if (documents.length === 0) return '';

  const documentsList = documents
    .map(d => `- [ID:${d.id}] "${d.fileName}" (${d.fileType.toUpperCase()}, ${formatFileSize(d.fileSize)})`)
    .join('\n');

  return `

## Доступные документы для отправки клиенту

${documentsList}

### Как отправить документ:
Добавьте команду в конец ответа:
- В чат: [SEND_DOC:ID:chat] например [SEND_DOC:abc123:chat]
- По email: [SEND_DOC:ID:email] например [SEND_DOC:abc123:email]

Команды автоматически удаляются перед отправкой клиенту.
Решайте сами когда уместно отправить документ на основе контекста разговора.
Документы прикрепляются как файлы к сообщению.`;
}

/**
 * Парсит команды отправки документов из ответа AI
 * Формат: [SEND_DOC:documentId:channel]
 */
function parseDocumentSendCommands(response: string): { documentId: string; channel: 'chat' | 'email' }[] {
  const commands: { documentId: string; channel: 'chat' | 'email' }[] = [];
  const regex = /\[SEND_DOC:([a-zA-Z0-9-]+):(chat|email)\]/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    commands.push({
      documentId: match[1],
      channel: match[2] as 'chat' | 'email',
    });
  }

  return commands;
}

/**
 * Удаляет команды отправки из текста ответа
 */
function removeDocumentSendCommands(response: string): string {
  return response.replace(/\[SEND_DOC:[a-zA-Z0-9-]+:(chat|email)\]/g, '').trim();
}

/**
 * Формирует инструкцию по языку ответа на основе настроек агента
 * @param autoDetectLanguage - если true, агент определяет язык по сообщению пользователя
 * @param responseLanguage - конкретный язык ответа (например, "Английский", "Русский")
 * @returns Языковая инструкция для системного промпта или пустая строка
 */
function buildLanguagePrompt(
  autoDetectLanguage: boolean,
  responseLanguage: string | null
): string {
  if (autoDetectLanguage) {
    return `

## Язык общения
ВАЖНО: Автоматически определяй язык, на котором пишет пользователь, и ВСЕГДА отвечай на том же языке.
Если пользователь пишет на английском - отвечай на английском.
Если пользователь пишет на русском - отвечай на русском.
И так далее для любого языка.`;
  }

  if (responseLanguage && responseLanguage.trim()) {
    return `

## Язык общения
ВАЖНО: ВСЕГДА отвечай на языке: ${responseLanguage.trim()}.
Независимо от языка сообщения пользователя, твои ответы должны быть на ${responseLanguage.trim()}.`;
  }

  return '';
}

// Интерфейс для расписания
interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

// Маппинг дней недели: JS dayOfWeek (0=воскресенье) -> название
const DAY_MAP: Record<number, string> = {
  0: 'Воскресенье',
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

/**
 * Проверяет, работает ли агент в текущее время по расписанию
 * @param scheduleEnabled - включено ли расписание
 * @param scheduleDataJson - JSON строка с расписанием
 * @returns true если агент должен работать, false если вне рабочих часов
 */
function isAgentWorkingNow(scheduleEnabled: boolean, scheduleDataJson: string | null): boolean {
  // Если расписание не включено - агент работает всегда
  if (!scheduleEnabled) return true;

  // Если нет данных расписания - агент работает всегда
  if (!scheduleDataJson) return true;

  try {
    const schedule: WorkingDay[] = JSON.parse(scheduleDataJson);
    if (!Array.isArray(schedule) || schedule.length === 0) return true;

    // Получаем текущее время (киевское время, UTC+2 зимой / UTC+3 летом)
    const now = new Date();
    // Используем Intl API для правильного определения киевского времени с учетом DST
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));

    const dayOfWeek = kyivTime.getDay(); // 0-6
    const currentDayName = DAY_MAP[dayOfWeek];
    // Форматируем время как HH:MM
    const hours = kyivTime.getHours().toString().padStart(2, '0');
    const minutes = kyivTime.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    // Ищем текущий день в расписании
    const todaySchedule = schedule.find(d => d.day === currentDayName);

    if (!todaySchedule) {
      console.log(`⏰ Schedule: Day "${currentDayName}" not found in schedule, allowing`);
      return true;
    }

    if (!todaySchedule.enabled) {
      console.log(`⏰ Schedule: Day "${currentDayName}" is disabled, blocking agent`);
      return false;
    }

    // Проверяем время
    const isWithinHours = currentTimeStr >= todaySchedule.start && currentTimeStr <= todaySchedule.end;

    if (!isWithinHours) {
      console.log(`⏰ Schedule: Current time ${currentTimeStr} is outside working hours ${todaySchedule.start}-${todaySchedule.end}, blocking agent`);
      return false;
    }

    console.log(`⏰ Schedule: Agent is working (${currentDayName} ${currentTimeStr}, hours: ${todaySchedule.start}-${todaySchedule.end})`);
    return true;
  } catch (error) {
    console.error('Error parsing schedule data:', error);
    return true; // В случае ошибки - разрешаем работу
  }
}

/**
 * Выполняет команды отправки документов агента
 */
async function executeDocumentSendCommands(
  commands: { documentId: string; channel: 'chat' | 'email' }[],
  integrationId: string,
  leadId: number,
  chatId?: string
): Promise<void> {
  const path = await import('path');
  const fs = await import('fs');
  const uploadDir = path.join(__dirname, '../../uploads/agent-documents');

  // Получаем публичный URL бекенда для Kommo
  const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || process.env.KOMMO_REDIRECT_URI?.replace('/api/kommo/callback', '') || 'http://localhost:3001';

  for (const cmd of commands) {
    try {
      const document = await realPrisma.agentDocument.findFirst({
        where: { id: cmd.documentId },
      });

      if (!document) {
        console.warn(`⚠️ Document ${cmd.documentId} not found`);
        continue;
      }

      const filePath = path.join(uploadDir, document.storageKey);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Document file not found: ${filePath}`);
        continue;
      }

      // Генерируем публичный URL с подписью для доступа Kommo
      const publicFileUrl = generatePublicDocumentUrl(cmd.documentId, backendPublicUrl);

      if (cmd.channel === 'chat' && chatId) {
        // Для чата - отправляем файл напрямую через Kommo Chat API
        try {
          await sendChatFileMessage(
            integrationId,
            chatId,
            publicFileUrl,
            document.fileName,
            document.fileSize,
            document.mimeType
          );
          console.log(`📄 Sent document file "${document.fileName}" to chat`);
        } catch (fileError: any) {
          // Если прямая отправка файла не удалась, отправляем как ссылку
          console.warn(`⚠️ Could not send file directly, sending as link: ${fileError.message}`);
          const message = `📎 Документ: *${document.fileName}*\n(${document.fileType.toUpperCase()}, ${formatFileSize(document.fileSize)})\n📥 Скачать: ${publicFileUrl}`;
          await sendChatMessage(integrationId, chatId, message);
          console.log(`📄 Sent document "${document.fileName}" as link to chat`);
        }
      } else if (cmd.channel === 'email') {
        const emailTo = await getLeadContactEmail(integrationId, leadId);
        if (emailTo) {
          // Для email - отправляем со ссылкой на скачивание
          // Kommo Notes API не поддерживает прямые вложения, поэтому отправляем ссылку
          await sendEmail(integrationId, {
            entityId: leadId,
            entityType: 'leads',
            to: emailTo,
            subject: `Документ: ${document.fileName}`,
            text: `Документ: ${document.fileName} (${document.fileType.toUpperCase()}, ${formatFileSize(document.fileSize)})\n\nСкачать: ${publicFileUrl}`,
          });
          console.log(`📧 Sent document "${document.fileName}" link to ${emailTo}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error sending document ${cmd.documentId}:`, error);
    }
  }
}

/**
 * Проверяет, активен ли канал для агента
 * @param channelSettingsJson - JSON строка с настройками каналов
 * @param channel - канал ('chat' | 'email')
 * @returns true если канал активен
 */
function isChannelEnabled(channelSettingsJson: any, channel: string): boolean {
  // Если настройки не заданы - разрешаем все каналы по умолчанию
  if (!channelSettingsJson) return true;

  try {
    const settings: ChannelSettings = typeof channelSettingsJson === 'string'
      ? JSON.parse(channelSettingsJson)
      : channelSettingsJson;

    // Если allChannels = true, разрешены все каналы
    if (settings.allChannels) return true;

    // Если нет выбранных каналов - разрешаем все
    if (!settings.selected || settings.selected.length === 0) return true;

    // Проверяем соответствие канала
    // channel = 'chat' может соответствовать 'whatsapp', 'telegram', 'instagram', 'facebook', 'viber'
    // channel = 'email' соответствует 'email'
    if (channel === 'email') {
      return settings.selected.includes('email');
    }

    // Для chat проверяем что выбран хотя бы один chat-канал
    const chatChannels = ['whatsapp', 'telegram', 'instagram', 'facebook', 'viber'];
    return settings.selected.some(ch => chatChannels.includes(ch));
  } catch {
    // При ошибке парсинга - разрешаем
    return true;
  }
}

// Типы
interface ProcessMessageParams {
  integrationId: string;
  agentId: string;
  channel: 'chat' | 'email';
  messageText: string;
  leadId: number;
  pipelineId: number;
  stageId: number;
  // Для chat
  chatId?: string;
  // Для email
  emailFrom?: string;
  emailSubject?: string;
  contactEmail?: string;
}

interface ProcessMessageResult {
  success: boolean;
  responded: boolean;
  response?: string;
  error?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  channel: string;
  createdAt: Date;
}

/**
 * Главная функция - обработка входящего сообщения
 */
export async function processIncomingMessage(
  params: ProcessMessageParams
): Promise<ProcessMessageResult> {
  const {
    integrationId,
    agentId,
    channel,
    messageText,
    leadId,
    pipelineId,
    stageId,
    chatId,
    emailFrom,
    emailSubject,
    contactEmail,
  } = params;

  console.log(`\n🤖 [ConversationalAgent] Processing ${channel} message for lead ${leadId}`);
  console.log(`   Agent: ${agentId}, Pipeline: ${pipelineId}, Stage: ${stageId}`);

  try {
    // 1. Получить агента
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      console.error(`❌ Agent ${agentId} not found`);
      return { success: false, responded: false, error: 'Agent not found' };
    }

    // 1.1 ПРОВЕРКА ПАУЗЫ АГЕНТА (stopOnReply feature)
    // Если агент на паузе (сотрудник отвечал) - проверяем время возобновления
    const canRespond = await checkAndResumeIfExpired(integrationId, leadId, agent.userId);
    if (!canRespond) {
      console.log(`⏸️ Agent is paused for lead ${leadId}, skipping AI response`);
      return { success: true, responded: false };
    }

    // 1.2 Получить расширенные настройки агента (язык, модель, креативность)
    // ВАЖНО: Используем realPrisma вместо кастомного prisma, т.к. agentAdvancedSettings там заглушка
    const advancedSettings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // 1.2 Получить список доступных документов агента для интеллектуальной отправки
    const availableDocuments = await getAvailableAgentDocuments(agent.id, agent.kbSettings);
    if (availableDocuments.length > 0) {
      console.log(`📄 Loaded ${availableDocuments.length} agent documents for intelligent sending`);
    }

    // 2. Получить или создать диалог
    const conversation = await getOrCreateConversation(integrationId, leadId, agentId);

    // 3. Сохранить входящее сообщение
    await saveMessage({
      conversationId: conversation.id,
      channel,
      role: 'user',
      content: messageText,
      chatId,
      emailSubject,
      emailFrom,
    });

    // 4. ВАЖНО: Проверить активен ли агент на этой воронке и этапе
    const isEnabled = isAgentEnabledForStage(
      agent.pipelineSettings,
      pipelineId.toString(),
      stageId.toString()
    );

    if (!isEnabled) {
      console.log(`⚠️ Agent is disabled for pipeline ${pipelineId} / stage ${stageId}, skipping AI response`);
      return { success: true, responded: false };
    }

    // 4.1 Проверить активен ли канал для агента
    const channelEnabled = isChannelEnabled(agent.channelSettings, channel);
    if (!channelEnabled) {
      console.log(`⚠️ Channel ${channel} is disabled for agent, skipping AI response`);
      return { success: true, responded: false };
    }

    // 4.2 Проверить расписание работы агента
    const isWorkingTime = isAgentWorkingNow(
      advancedSettings?.scheduleEnabled ?? false,
      advancedSettings?.scheduleData ?? null
    );
    if (!isWorkingTime) {
      console.log(`⏰ Agent is outside working hours, skipping AI response`);
      return { success: true, responded: false };
    }

    // 5. Получить инструкцию текущего этапа (может быть null)
    const stageInstruction = getInstructionsForCurrentStage(
      agent.pipelineSettings,
      pipelineId.toString(),
      stageId.toString()
    );

    if (stageInstruction) {
      console.log(`📋 Using stage instruction: "${stageInstruction.substring(0, 50)}..."`);
    } else {
      console.log(`ℹ️ No specific stage instruction, using base system instructions`);
    }

    // 6. Получить историю сообщений (увеличен лимит для полного контекста)
    const history = await getConversationHistory(conversation.id, 100);

    // 7. Проверить нужна ли суммаризация
    let summary = conversation.summary;
    if (conversation.messageCount > 30 && !summary) {
      console.log(`📝 Summarizing old messages (count: ${conversation.messageCount})`);
      summary = await summarizeOldMessages(conversation.id);
    }

    // 7. Получить контекст из базы знаний
    let knowledgeContext: string | null = null;
    const kbSettings = agent.kbSettings ? parseKBSettings(agent.kbSettings) : null;

    if (agent.kbSettings) {
      try {
        const knowledgeArticles = await getRelevantKnowledge(
          pool,
          agent.userId,
          agent.kbSettings,
          messageText,
          3
        );
        knowledgeContext = buildKnowledgeContext(knowledgeArticles);
        if (knowledgeContext) {
          console.log(`📚 Using ${knowledgeArticles.length} KB articles`);
        }

        // Если ответ не найден в KB и включена опция создания задачи
        if (knowledgeArticles.length === 0 && kbSettings?.createTaskIfNotFound) {
          console.log(`📋 No KB articles found, creating task for responsible user...`);
          try {
            // Получаем данные сделки для определения ответственного
            const lead = await fetchLeadById(integrationId, leadId);
            const responsibleUserId = lead.responsible_user_id;

            // Текст задачи из настроек или дефолтный
            const taskText = kbSettings.noAnswerMessage ||
              `Клиент задал вопрос, на который нет ответа в базе знаний. Сообщение: "${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}"`;

            // Создаём задачу с дедлайном сейчас (сразу появится в списке задач)
            const now = Math.floor(Date.now() / 1000);

            await createTask(integrationId, {
              text: taskText,
              complete_till: now,
              entity_id: leadId,
              entity_type: 'leads',
              responsible_user_id: responsibleUserId,
            });

            console.log(`✅ Task created for user ${responsibleUserId} on lead ${leadId}`);
          } catch (taskError) {
            console.error('Error creating task for unanswered question:', taskError);
          }
        }
      } catch (error) {
        console.error('Error fetching knowledge base:', error);
      }
    }

    // 7.1. Получить контекст из CRM (данные сделки и контакта)
    let crmContext: CrmContext = {};
    let crmContextPrompt: string = '';
    if (agent.crmData) {
      try {
        crmContext = await getCrmContext(integrationId, leadId, agent.crmData);
        crmContextPrompt = buildCrmContextPrompt(crmContext);
        if (crmContextPrompt) {
          console.log(`📊 Added CRM context to prompt`);
        }
      } catch (error) {
        console.error('Error fetching CRM context:', error);
      }
    }

    // 7.2. Получить знания из роли (методологии продаж, техники)
    let roleKnowledge: string | null = null;
    if (agent.trainingRoleId) {
      try {
        roleKnowledge = await getAgentRoleKnowledge(agent.trainingRoleId, agent.userId);
        if (roleKnowledge) {
          console.log(`📖 Using role knowledge (${roleKnowledge.length} chars)`);
        }
      } catch (error) {
        console.error('Error fetching role knowledge:', error);
      }
    }

    // 7.3. Получить контекст памяти о клиенте (факты из предыдущих разговоров)
    // Проверяем настройки памяти (по умолчанию включены)
    const memoryEnabled = advancedSettings?.memoryEnabled ?? true;
    const graphEnabled = advancedSettings?.graphEnabled ?? true;
    const contextWindowSize = advancedSettings?.contextWindow ?? 20;
    const semanticSearchEnabled = advancedSettings?.semanticSearchEnabled ?? true;

    let memoryContext: string = '';
    let graphContext: string = '';
    let existingFacts: string[] = [];

    if (memoryEnabled) {
      try {
        const memoryResult = await getClientMemoryContext(pool, {
          agentId,
          userId: agent.userId,
          leadId, // Факты привязаны к конкретному лиду
          currentMessage: messageText,
          limit: contextWindowSize,
          semanticSearchEnabled, // Используем настройку из UI
        });
        memoryContext = memoryResult.context;
        existingFacts = memoryResult.facts;
        if (memoryContext) {
          console.log(`🧠 Memory context loaded for lead ${leadId}: ${existingFacts.length} facts`);
        }

        // 7.4. Получить контекст графа связей (если включено)
        if (graphEnabled && memoryResult.nodeIds.length > 0) {
          try {
            const graphResult = await getGraphRelatedContext(pool, {
              agentId,
              nodeIds: memoryResult.nodeIds,
              limit: 5,
            });
            graphContext = graphResult.context;
          } catch (error) {
            console.error('Error fetching graph context:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching memory context:', error);
      }
    } else {
      console.log(`🧠 Memory disabled for agent ${agentId}`);
    }

    // 8. Построить системный промпт
    const systemPrompt = buildEnhancedSystemPrompt(
      roleKnowledge,
      agent.systemInstructions,
      stageInstruction,
      knowledgeContext
    );

    // Добавить контекст канала, суммаризацию и CRM данные
    let enhancedPrompt = systemPrompt;
    if (summary) {
      enhancedPrompt += `\n\n## Краткое содержание предыдущего разговора:\n${summary}`;
    }
    // Добавляем CRM контекст (данные сделки и контакта)
    if (crmContextPrompt) {
      enhancedPrompt += crmContextPrompt;
    }

    // Добавляем контекст памяти о клиенте (факты из предыдущих разговоров)
    if (memoryContext) {
      enhancedPrompt += memoryContext;
    }

    // Добавляем контекст графа связей (связи между фактами, компаниями, людьми)
    if (graphContext) {
      enhancedPrompt += graphContext;
    }

    // Добавляем список доступных документов для интеллектуальной отправки
    const documentsPrompt = buildAvailableDocumentsPrompt(availableDocuments);
    if (documentsPrompt) {
      enhancedPrompt += documentsPrompt;
    }

    enhancedPrompt += `\n\n## Канал общения: ${channel === 'chat' ? 'Чат' : 'Email'}`;
    if (channel === 'email' && emailSubject) {
      enhancedPrompt += `\nТема письма: ${emailSubject}`;
    }

    // Добавляем языковые инструкции из расширенных настроек
    const languagePrompt = buildLanguagePrompt(
      advancedSettings?.autoDetectLanguage ?? false,
      advancedSettings?.responseLanguage ?? null
    );
    if (languagePrompt) {
      enhancedPrompt += languagePrompt;
      console.log(`🌍 Language settings applied: ${advancedSettings?.autoDetectLanguage ? 'auto-detect' : advancedSettings?.responseLanguage || 'default'}`);
    }

    // 9. Построить массив сообщений для AI
    const messages: ChatMessage[] = [
      { role: 'system', content: enhancedPrompt },
    ];

    // Добавить историю
    for (const msg of history) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: formatMessageForContext(msg),
      });
    }

    // Добавить текущее сообщение
    messages.push({
      role: 'user',
      content: messageText,
    });

    // 10. Сгенерировать ответ
    console.log(`🧠 Generating AI response...`);
    const result = await chatCompletion({
      model: agent.model || 'openai/gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const rawResponse = result.choices[0]?.message?.content;
    if (!rawResponse) {
      console.error('❌ No response from AI');
      return { success: false, responded: false, error: 'No AI response' };
    }

    console.log(`✅ AI response generated (${rawResponse.length} chars)`);

    // 10.1. Обработка команд отправки документов агента
    const docSendCommands = parseDocumentSendCommands(rawResponse);
    const response = removeDocumentSendCommands(rawResponse);

    if (docSendCommands.length > 0) {
      console.log(`📄 Found ${docSendCommands.length} document send command(s) in AI response`);
      // Выполняем команды отправки документов
      await executeDocumentSendCommands(docSendCommands, integrationId, leadId, chatId);
    }

    // 10.2. Выполнить правила обновления CRM полей
    if (agent.crmData && crmContext) {
      try {
        const updateResult = await executeUpdateRules(
          integrationId,
          leadId,
          response,
          agent.crmData,
          crmContext
        );
        if (updateResult.updated) {
          console.log(`🔄 CRM update rules matched: ${updateResult.changes.join(', ')}`);
        }
      } catch (error) {
        console.error('Error executing CRM update rules:', error);
      }
    }

    // 11. Отправить ответ
    const recipientEmail = channel === 'email'
      ? (contactEmail || await getLeadContactEmail(integrationId, leadId) || undefined)
      : undefined;

    // Применить задержку ответа если настроено
    const responseDelaySeconds = advancedSettings?.responseDelaySeconds ?? 0;
    if (responseDelaySeconds > 0) {
      console.log(`⏳ Applying response delay: ${responseDelaySeconds} seconds`);
      await new Promise(resolve => setTimeout(resolve, responseDelaySeconds * 1000));
      console.log(`⏳ Delay completed, sending response`);
    }

    // Отправляем ответ
    if (channel === 'chat' && chatId) {
      console.log(`📤 Sending chat message to ${chatId}`);
      await sendChatMessage(integrationId, chatId, response);
    } else if (channel === 'email') {
      if (recipientEmail) {
        console.log(`📧 Sending email to ${recipientEmail}`);
        await sendEmail(integrationId, {
          entityId: leadId,
          entityType: 'leads',
          to: recipientEmail,
          subject: emailSubject ? `Re: ${emailSubject}` : 'Ответ на ваше письмо',
          text: response,
        });
      } else {
        console.error('❌ No recipient email found');
      }
    }

    // 12. Сохранить ответ в историю
    await saveMessage({
      conversationId: conversation.id,
      channel,
      role: 'assistant',
      content: response,
      chatId,
      emailTo: contactEmail,
    });

    // 13. Обновить счётчик сообщений
    await prisma.leadConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 2 }, // +1 user, +1 assistant
        lastMessageAt: new Date(),
      },
    });

    // 13.1. Извлечь и сохранить новые факты о клиенте в память (асинхронно)
    // AI читает системные инструкции агента и сам понимает что важно запомнить
    // Проверяем настройку memoryEnabled
    if (memoryEnabled) {
      extractAndStoreMemoryFacts(pool, {
        agentId,
        userId: agent.userId,
        leadId, // Привязываем факты к конкретному лиду
        userMessage: messageText,
        agentResponse: response,
        existingFacts,
        systemInstructions: agent.systemInstructions || '', // Передаём инструкции для понимания контекста
        model: advancedSettings?.factExtractionModel || 'openai/gpt-4o-mini', // Модель для извлечения фактов
      }).catch(err => console.error('Memory extraction error:', err));
    }

    // 14. Проверить и запустить цепочки автоматизации для текущего этапа
    // Запускаем асинхронно, чтобы не блокировать ответ
    checkAndExecuteChains(
      agentId,
      integrationId,
      leadId,
      stageId.toString(),
      chatId
    ).catch(err => console.error('Chain execution error:', err));

    return { success: true, responded: true, response };
  } catch (error: any) {
    console.error(`❌ [ConversationalAgent] Error:`, error.message);
    return { success: false, responded: false, error: error.message };
  }
}

/**
 * Получить или создать диалог
 */
async function getOrCreateConversation(
  integrationId: string,
  leadId: number,
  agentId: string
) {
  let conversation = await prisma.leadConversation.findUnique({
    where: {
      leadId_integrationId: {
        leadId,
        integrationId,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.leadConversation.create({
      data: {
        integrationId,
        leadId,
        agentId,
      },
    });
    console.log(`📝 Created new conversation for lead ${leadId}`);
  }

  return conversation;
}

/**
 * Сохранить сообщение в историю
 */
async function saveMessage(params: {
  conversationId: string;
  channel: string;
  role: 'user' | 'assistant';
  content: string;
  chatId?: string;
  emailSubject?: string;
  emailFrom?: string;
  emailTo?: string;
}) {
  await prisma.leadMessage.create({
    data: {
      conversationId: params.conversationId,
      channel: params.channel,
      role: params.role,
      content: params.content,
      chatId: params.chatId || null,
      emailSubject: params.emailSubject || null,
      emailFrom: params.emailFrom || null,
      emailTo: params.emailTo || null,
    },
  });
}

/**
 * Получить историю сообщений
 */
async function getConversationHistory(
  conversationId: string,
  limit: number = 25
): Promise<ConversationMessage[]> {
  const messages = await prisma.leadMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      role: true,
      content: true,
      channel: true,
      createdAt: true,
    },
  });

  return messages.map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
    channel: m.channel,
    createdAt: m.createdAt,
  }));
}

/**
 * Форматировать сообщение для контекста AI
 */
function formatMessageForContext(msg: ConversationMessage): string {
  const channelPrefix = msg.channel === 'email' ? '[Email] ' : '';
  return `${channelPrefix}${msg.content}`;
}

/**
 * Суммаризировать старые сообщения
 */
async function summarizeOldMessages(conversationId: string): Promise<string> {
  // Получить все сообщения кроме последних 10
  const allMessages = await prisma.leadMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      content: true,
      channel: true,
    },
  });

  if (allMessages.length <= 10) {
    return '';
  }

  const messagesToSummarize = allMessages.slice(0, -10);
  const summaryText = messagesToSummarize
    .map((m: any) => `${m.role === 'user' ? 'Клиент' : 'Менеджер'} (${m.channel}): ${m.content.substring(0, 200)}`)
    .join('\n');

  // Используем AI для суммаризации
  try {
    const result = await chatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Создай краткое резюме диалога между клиентом и менеджером. Укажи ключевые моменты: что клиент хотел, какие вопросы обсуждались, к чему пришли. Резюме должно быть на русском языке, 3-5 предложений.',
        },
        {
          role: 'user',
          content: summaryText,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = result.choices[0]?.message?.content || '';

    // Сохранить суммаризацию
    await prisma.leadConversation.update({
      where: { id: conversationId },
      data: { summary },
    });

    console.log(`📝 Summarized ${messagesToSummarize.length} old messages`);
    return summary;
  } catch (error) {
    console.error('Error summarizing messages:', error);
    return '';
  }
}

export default {
  processIncomingMessage,
  // Agent pause management
  getAgentPauseStatus,
  pauseAgentForLead,
  resumeAgentForLead,
  checkAndResumeIfExpired,
};
