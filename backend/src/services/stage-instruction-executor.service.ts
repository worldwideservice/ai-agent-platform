/**
 * Stage Instruction Executor Service
 *
 * Processes natural language instructions for pipeline stages.
 * AI understands instructions like:
 * - "Отправь приветственное сообщение клиенту"
 * - "Создай задачу для менеджера на завтра"
 * - "Добавь тег 'новый клиент' к сделке"
 * - "Переведи сделку на этап 'В работе'"
 */

import { chatCompletion } from './openrouter.service';
import {
  executeTriggerAction,
  TriggerAction,
  TriggerContext,
  ActionResult,
} from './trigger-executor.service';

// ============================================================================
// Types
// ============================================================================

// Структура прикреплённой статьи KB
export interface StageAttachment {
  id: number;
  title: string;
  type: 'article';
  content?: string; // Содержимое статьи (загружается при выполнении)
}

export interface StageInstructionContext {
  integrationId: string;
  leadId: number;
  leadName?: string;
  contactId?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  pipelineId: number;
  pipelineName?: string;
  stageId: number;
  stageName?: string;
  responsibleUserId?: number;
  responsibleUserName?: string;
  chatId?: string;
  // Прикреплённые статьи KB для этого этапа
  attachments?: StageAttachment[];
}

export interface ParsedAction {
  action: string;
  params: Record<string, any>;
  reasoning: string;
}

export interface InstructionParseResult {
  actions: ParsedAction[];
  reasoning: string;
}

// Available actions that AI can use
const AVAILABLE_ACTIONS = [
  {
    id: 'change_stage',
    name: 'Изменить этап сделки',
    params: ['stageId', 'pipelineId'],
    description: 'Перевести сделку на другой этап воронки',
  },
  {
    id: 'assign_user',
    name: 'Назначить ответственного',
    params: ['userId', 'applyTo'],
    description: 'Изменить ответственного пользователя для сделки или контакта',
  },
  {
    id: 'create_task',
    name: 'Создать задачу',
    params: ['taskDescription', 'taskUserId'],
    description: 'Создать задачу для менеджера',
  },
  {
    id: 'add_deal_tags',
    name: 'Добавить теги к сделке',
    params: ['tags'],
    description: 'Добавить один или несколько тегов к сделке',
  },
  {
    id: 'add_contact_tags',
    name: 'Добавить теги к контакту',
    params: ['tags'],
    description: 'Добавить один или несколько тегов к контакту',
  },
  {
    id: 'add_deal_note',
    name: 'Добавить примечание к сделке',
    params: ['noteText'],
    description: 'Добавить текстовое примечание к сделке',
  },
  {
    id: 'add_contact_note',
    name: 'Добавить примечание к контакту',
    params: ['noteText'],
    description: 'Добавить текстовое примечание к контакту',
  },
  {
    id: 'send_message',
    name: 'Отправить сообщение',
    params: ['messageText'],
    description: 'Отправить сообщение в чат клиенту',
  },
  {
    id: 'send_email',
    name: 'Отправить email',
    params: ['emailInstructions'],
    description: 'Сгенерировать и отправить email клиенту',
  },
  {
    id: 'run_salesbot',
    name: 'Запустить Salesbot',
    params: ['salesbotId'],
    description: 'Запустить автоматизацию Salesbot',
  },
  {
    id: 'send_webhook',
    name: 'Отправить webhook',
    params: ['webhookUrl', 'webhookMethod', 'webhookBody'],
    description: 'Отправить HTTP запрос на внешний URL',
  },
  {
    id: 'send_kb_article',
    name: 'Отправить статью из базы знаний',
    params: ['articleId', 'channel'],
    description: 'Отправить содержимое статьи из базы знаний клиенту (в чат или по email)',
  },
];

// ============================================================================
// AI Instruction Parser
// ============================================================================

/**
 * Parse natural language instruction into executable actions using AI
 */
export async function parseStageInstruction(
  instruction: string,
  context: StageInstructionContext,
  systemPrompt?: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<InstructionParseResult> {
  const actionsDescription = AVAILABLE_ACTIONS.map(
    (a) => `- ${a.id}: ${a.description} (параметры: ${a.params.join(', ')})`
  ).join('\n');

  // Формируем описание доступных статей KB
  const attachmentsDescription = context.attachments && context.attachments.length > 0
    ? `\nДоступные статьи/файлы для отправки клиенту:\n${context.attachments.map(a => `- ID: ${a.id}, Название: "${a.title}"`).join('\n')}`
    : '';

  const contextDescription = `
Контекст сделки:
- Сделка: "${context.leadName || 'Без названия'}" (ID: ${context.leadId})
- Воронка: "${context.pipelineName || 'Неизвестная'}" (ID: ${context.pipelineId})
- Этап: "${context.stageName || 'Неизвестный'}" (ID: ${context.stageId})
${context.contactName ? `- Контакт: "${context.contactName}"` : ''}
${context.contactEmail ? `- Email: ${context.contactEmail}` : ''}
${context.contactPhone ? `- Телефон: ${context.contactPhone}` : ''}
${context.responsibleUserName ? `- Ответственный: ${context.responsibleUserName}` : ''}
${context.chatId ? `- Чат доступен для отправки сообщений` : '- Чат недоступен'}${attachmentsDescription}`;

  const prompt = `Ты - система автоматизации CRM. Твоя задача - преобразовать инструкцию на естественном языке в конкретные действия.

${systemPrompt ? `Общий контекст агента:\n${systemPrompt}\n\n` : ''}
${contextDescription}

Доступные действия:
${actionsDescription}

Инструкция пользователя:
"${instruction}"

Проанализируй инструкцию и верни JSON с действиями, которые нужно выполнить:
{
  "actions": [
    {
      "action": "id действия",
      "params": { "param1": "value1", ... },
      "reasoning": "почему это действие нужно"
    }
  ],
  "reasoning": "общее объяснение как ты понял инструкцию"
}

Правила:
1. Если инструкция неясна или невозможна - верни пустой массив actions
2. Если чат недоступен - не добавляй send_message
3. Для send_message - messageText должен быть готовым текстом сообщения
4. Для send_email - emailInstructions должны описывать что написать в письме
5. Для tags - передавай массив строк в параметре tags
6. Если нужно несколько действий - добавь все в массив
7. НЕ выдумывай ID этапов или пользователей - используй только те что есть в контексте
8. Для send_kb_article - используй ID статьи из списка доступных и укажи канал: "chat" или "email"
9. Если в инструкции упоминается отправка файла/документа/договора - используй send_kb_article с подходящей статьёй из доступных`;

  try {
    console.log(`🧠 Parsing stage instruction: "${instruction.substring(0, 50)}..."`);

    const response = await chatCompletion({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ Failed to parse AI response:', content);
      return { actions: [], reasoning: 'Не удалось распознать инструкцию' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ Parsed ${parsed.actions?.length || 0} actions from instruction`);

    return {
      actions: parsed.actions || [],
      reasoning: parsed.reasoning || '',
    };
  } catch (error: any) {
    console.error('❌ Error parsing stage instruction:', error);
    return { actions: [], reasoning: `Ошибка: ${error.message}` };
  }
}

// ============================================================================
// Instruction Executor
// ============================================================================

/**
 * Execute parsed actions
 */
export async function executeStageInstruction(
  instruction: string,
  context: StageInstructionContext,
  systemPrompt?: string,
  instructionParsingModel: string = 'openai/gpt-4o-mini'
): Promise<ActionResult[]> {
  // Parse instruction into actions
  const parseResult = await parseStageInstruction(instruction, context, systemPrompt, instructionParsingModel);

  if (parseResult.actions.length === 0) {
    console.log(`⚠️ No actions parsed from instruction: ${parseResult.reasoning}`);
    return [];
  }

  console.log(`🎬 Executing ${parseResult.actions.length} actions from stage instruction`);

  // Convert to trigger actions and execute
  const results: ActionResult[] = [];

  for (const parsedAction of parseResult.actions) {
    const triggerAction: TriggerAction = {
      id: `stage-${context.stageId}-${Date.now()}`,
      action: parsedAction.action,
      params: parsedAction.params,
    };

    const triggerContext: TriggerContext = {
      integrationId: context.integrationId,
      leadId: context.leadId,
      contactId: context.contactId,
      chatId: context.chatId,
      pipelineId: context.pipelineId,
    };

    const result = await executeTriggerAction(triggerAction, triggerContext);
    results.push(result);

    if (result.success) {
      console.log(`✅ Stage action ${parsedAction.action}: ${result.message}`);
    } else {
      console.error(`❌ Stage action ${parsedAction.action} failed: ${result.error}`);
    }
  }

  return results;
}

/**
 * Process stage instruction for a lead entering a new stage
 * This is the main entry point called from webhook processing
 */
export async function processStageInstructionForLead(
  integrationId: string,
  leadId: number,
  pipelineId: number,
  stageId: number,
  stageInstruction: string,
  agentSystemPrompt?: string,
  additionalContext?: {
    leadName?: string;
    pipelineName?: string;
    stageName?: string;
    contactId?: number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    responsibleUserId?: number;
    responsibleUserName?: string;
    chatId?: string;
  },
  instructionParsingModel: string = 'openai/gpt-4o-mini'
): Promise<ActionResult[]> {
  if (!stageInstruction || stageInstruction.trim() === '') {
    console.log(`⚠️ No instruction for stage ${stageId}, skipping`);
    return [];
  }

  const context: StageInstructionContext = {
    integrationId,
    leadId,
    pipelineId,
    stageId,
    ...additionalContext,
  };

  console.log(`📋 Processing stage instruction for lead ${leadId} on stage "${additionalContext?.stageName || stageId}"`);
  console.log(`   Instruction: "${stageInstruction.substring(0, 100)}..."`);

  return executeStageInstruction(stageInstruction, context, agentSystemPrompt, instructionParsingModel);
}

export default {
  parseStageInstruction,
  executeStageInstruction,
  processStageInstructionForLead,
};
