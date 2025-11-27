import { chatCompletion, ChatMessage } from './openrouter.service';

// Default model for trigger evaluation (fast and cheap)
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface TriggerCondition {
  id: string;
  name: string;
  condition: string;
}

export interface TriggerEvaluationResult {
  triggerId: string;
  triggerName: string;
  matched: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Evaluate if a message matches any of the trigger conditions using AI
 */
export async function evaluateTriggerConditions(
  message: string,
  conversationContext: string[],
  triggers: TriggerCondition[],
  model: string = DEFAULT_MODEL
): Promise<TriggerEvaluationResult[]> {
  if (!triggers.length) {
    return [];
  }

  // Build the prompt for trigger evaluation
  const triggersDescription = triggers
    .map((t, i) => `${i + 1}. ID: "${t.id}" | Название: "${t.name}" | Условие: "${t.condition}"`)
    .join('\n');

  const contextText = conversationContext.length > 0
    ? `Контекст предыдущих сообщений:\n${conversationContext.slice(-5).join('\n')}\n\n`
    : '';

  const systemPrompt = `Ты - система анализа сообщений для определения срабатывания триггеров.

Твоя задача: проанализировать последнее сообщение пользователя и определить, какие триггеры должны сработать.

Триггеры:
${triggersDescription}

${contextText}Правила:
1. Анализируй смысл сообщения, а не точное совпадение слов
2. Учитывай контекст предыдущих сообщений
3. Триггер срабатывает, если смысл сообщения соответствует условию
4. Для каждого триггера укажи уверенность (0.0 - 1.0)
5. Триггер считается сработавшим при уверенности >= 0.7

Ответь в формате JSON:
{
  "results": [
    {
      "triggerId": "id триггера",
      "matched": true/false,
      "confidence": 0.0-1.0,
      "reason": "краткое объяснение"
    }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Проанализируй сообщение: "${message}"` }
  ];

  try {
    const response = await chatCompletion({
      model,
      messages,
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Failed to parse AI trigger response:', content);
      return triggers.map(t => ({
        triggerId: t.id,
        triggerName: t.name,
        matched: false,
        confidence: 0,
        reason: 'Ошибка парсинга ответа AI'
      }));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const results: TriggerEvaluationResult[] = [];

    for (const trigger of triggers) {
      const result = parsed.results?.find((r: any) => r.triggerId === trigger.id);
      results.push({
        triggerId: trigger.id,
        triggerName: trigger.name,
        matched: result?.matched && result?.confidence >= 0.7,
        confidence: result?.confidence || 0,
        reason: result?.reason
      });
    }

    return results;
  } catch (error: any) {
    console.error('❌ Error evaluating triggers:', error);
    return triggers.map(t => ({
      triggerId: t.id,
      triggerName: t.name,
      matched: false,
      confidence: 0,
      reason: `Ошибка AI: ${error.message}`
    }));
  }
}

/**
 * Quick evaluation for a single trigger
 */
export async function evaluateSingleTrigger(
  message: string,
  condition: string,
  model: string = DEFAULT_MODEL
): Promise<{ matched: boolean; confidence: number; reason?: string }> {
  const systemPrompt = `Ты - система анализа сообщений.

Условие триггера: "${condition}"

Определи, соответствует ли сообщение пользователя этому условию.
Учитывай смысл, а не точное совпадение слов.

Ответь в формате JSON:
{
  "matched": true/false,
  "confidence": 0.0-1.0,
  "reason": "краткое объяснение"
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];

  try {
    const response = await chatCompletion({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { matched: false, confidence: 0, reason: 'Ошибка парсинга' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      matched: parsed.matched && parsed.confidence >= 0.7,
      confidence: parsed.confidence || 0,
      reason: parsed.reason
    };
  } catch (error: any) {
    console.error('❌ Error evaluating single trigger:', error);
    return { matched: false, confidence: 0, reason: error.message };
  }
}

/**
 * CRM Event context for AI evaluation
 */
export interface CRMEventContext {
  eventType: 'lead_created' | 'lead_status_changed' | 'lead_updated' | 'contact_created' | 'contact_updated';
  // Lead/Deal info
  leadId?: number;
  leadName?: string;
  // Pipeline/Stage info
  pipelineId?: number;
  pipelineName?: string;
  stageId?: number;
  stageName?: string;
  oldStageId?: number;
  oldStageName?: string;
  // Contact info
  contactId?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  // User info
  responsibleUserId?: number;
  responsibleUserName?: string;
}

/**
 * Evaluate CRM events against trigger conditions using AI
 * AI understands natural language conditions like:
 * - "Когда сделка создалась на этапе Generation Lead"
 * - "Когда сделка перешла на этап Deal Not Distributed"
 * - "Когда создан новый контакт"
 */
export async function evaluateCRMEventTriggers(
  eventContext: CRMEventContext,
  triggers: TriggerCondition[],
  model: string = DEFAULT_MODEL
): Promise<TriggerEvaluationResult[]> {
  if (!triggers.length) {
    return [];
  }

  // Build human-readable event description
  let eventDescription = '';
  switch (eventContext.eventType) {
    case 'lead_created':
      eventDescription = `Создана новая сделка "${eventContext.leadName || 'Без названия'}" в воронке "${eventContext.pipelineName || 'Неизвестная воронка'}" на этапе "${eventContext.stageName || 'Неизвестный этап'}"`;
      break;
    case 'lead_status_changed':
      eventDescription = `Сделка "${eventContext.leadName || 'Без названия'}" перешла с этапа "${eventContext.oldStageName || 'Неизвестный'}" на этап "${eventContext.stageName || 'Неизвестный'}" в воронке "${eventContext.pipelineName || 'Неизвестная воронка'}"`;
      break;
    case 'lead_updated':
      eventDescription = `Обновлена сделка "${eventContext.leadName || 'Без названия'}" в воронке "${eventContext.pipelineName || 'Неизвестная воронка'}" на этапе "${eventContext.stageName || 'Неизвестный этап'}"`;
      break;
    case 'contact_created':
      eventDescription = `Создан новый контакт "${eventContext.contactName || 'Без имени'}"${eventContext.contactEmail ? ` (${eventContext.contactEmail})` : ''}`;
      break;
    case 'contact_updated':
      eventDescription = `Обновлен контакт "${eventContext.contactName || 'Без имени'}"`;
      break;
  }

  // Build the prompt for CRM event trigger evaluation
  const triggersDescription = triggers
    .map((t, i) => `${i + 1}. ID: "${t.id}" | Название: "${t.name}" | Условие: "${t.condition}"`)
    .join('\n');

  const systemPrompt = `Ты - система анализа CRM событий для определения срабатывания триггеров.

Произошло следующее CRM событие:
${eventDescription}

Детали события:
- Тип события: ${eventContext.eventType}
${eventContext.pipelineName ? `- Воронка: ${eventContext.pipelineName}` : ''}
${eventContext.stageName ? `- Текущий этап: ${eventContext.stageName}` : ''}
${eventContext.oldStageName ? `- Предыдущий этап: ${eventContext.oldStageName}` : ''}
${eventContext.leadName ? `- Название сделки: ${eventContext.leadName}` : ''}
${eventContext.contactName ? `- Имя контакта: ${eventContext.contactName}` : ''}
${eventContext.responsibleUserName ? `- Ответственный: ${eventContext.responsibleUserName}` : ''}

Триггеры для проверки:
${triggersDescription}

Правила:
1. Анализируй смысл условия триггера - оно может быть написано на естественном языке
2. Условие может описывать создание сделки, переход на определенный этап, создание контакта и т.д.
3. Названия этапов и воронок могут быть написаны по-разному (например "Generation Lead" = "Генерация лидов" = "новые лиды")
4. Для каждого триггера укажи уверенность (0.0 - 1.0)
5. Триггер считается сработавшим при уверенности >= 0.7

Ответь в формате JSON:
{
  "results": [
    {
      "triggerId": "id триггера",
      "matched": true/false,
      "confidence": 0.0-1.0,
      "reason": "краткое объяснение почему триггер сработал или нет"
    }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Определи, какие триггеры должны сработать для этого CRM события.` }
  ];

  try {
    console.log(`🤖 Evaluating ${triggers.length} triggers for CRM event: ${eventContext.eventType}`);
    console.log(`   Event: ${eventDescription}`);

    const response = await chatCompletion({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Failed to parse AI CRM trigger response:', content);
      return triggers.map(t => ({
        triggerId: t.id,
        triggerName: t.name,
        matched: false,
        confidence: 0,
        reason: 'Ошибка парсинга ответа AI'
      }));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const results: TriggerEvaluationResult[] = [];

    for (const trigger of triggers) {
      const result = parsed.results?.find((r: any) => r.triggerId === trigger.id);
      results.push({
        triggerId: trigger.id,
        triggerName: trigger.name,
        matched: result?.matched && result?.confidence >= 0.7,
        confidence: result?.confidence || 0,
        reason: result?.reason
      });
    }

    return results;
  } catch (error: any) {
    console.error('❌ Error evaluating CRM event triggers:', error);
    return triggers.map(t => ({
      triggerId: t.id,
      triggerName: t.name,
      matched: false,
      confidence: 0,
      reason: `Ошибка AI: ${error.message}`
    }));
  }
}

export default {
  evaluateTriggerConditions,
  evaluateSingleTrigger,
  evaluateCRMEventTriggers,
};
