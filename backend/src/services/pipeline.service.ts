/**
 * Pipeline Service
 * Сервис для работы с контекстно-зависимыми инструкциями агента
 * Позволяет агенту адаптировать свое поведение в зависимости от текущего этапа процесса
 */

interface PipelineConfig {
  name: string;
  active: boolean;
  stages: string[];
  stageInstructions?: Record<string, string>; // { stageId: "instructions" }
}

interface PipelineSettings {
  pipelines: Record<string, PipelineConfig>;
}

/**
 * Парсит настройки воронок из JSON строки
 */
export function parsePipelineSettings(pipelineSettingsJson: string | null): PipelineSettings | null {
  if (!pipelineSettingsJson) return null;

  try {
    return JSON.parse(pipelineSettingsJson) as PipelineSettings;
  } catch (error) {
    console.error('Error parsing pipeline settings:', error);
    return null;
  }
}

/**
 * Получает инструкции для конкретного этапа
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса (например, 'sales_funnel_1', 'support_workflow', 'hiring_process')
 * @param stageId - ID этапа (например, 'new_lead', 'initial_contact', 'interview')
 * @returns Инструкции для этапа или null если не найдены
 */
export function getStageInstructions(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string,
  stageId: string
): string | null {
  if (!pipelineSettings?.pipelines) return null;

  const pipeline = pipelineSettings.pipelines[pipelineId];
  if (!pipeline || !pipeline.active) return null;

  if (!pipeline.stageInstructions) return null;

  return pipeline.stageInstructions[stageId] || null;
}

/**
 * Проверяет, активен ли процесс для агента
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса
 * @returns true если процесс активен
 */
export function isPipelineActive(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string
): boolean {
  if (!pipelineSettings?.pipelines) return false;

  const pipeline = pipelineSettings.pipelines[pipelineId];
  return pipeline?.active === true;
}

/**
 * Проверяет, работает ли агент на конкретном этапе процесса
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса
 * @param stageId - ID этапа
 * @returns true если агент активен на этом этапе
 */
export function isStageEnabled(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string,
  stageId: string
): boolean {
  if (!pipelineSettings?.pipelines) return false;

  const pipeline = pipelineSettings.pipelines[pipelineId];
  if (!pipeline || !pipeline.active) return false;

  // Если stages пустой массив, значит выбраны все этапы
  if (!pipeline.stages || pipeline.stages.length === 0) return true;

  return pipeline.stages.includes(stageId);
}

/**
 * Получает контекстно-зависимые инструкции для текущего этапа
 * Использует данные о текущем процессе и этапе для адаптации поведения агента
 * @param pipelineSettingsJson - JSON строка с настройками процессов агента
 * @param currentPipelineId - ID текущего процесса (из CRM или другой системы)
 * @param currentStageId - ID текущего этапа процесса
 * @returns Специфичные инструкции для этапа или null
 */
export function getInstructionsForCurrentStage(
  pipelineSettingsJson: string | null,
  currentPipelineId: string | null,
  currentStageId: string | null
): string | null {
  if (!pipelineSettingsJson || !currentPipelineId || !currentStageId) return null;

  const pipelineSettings = parsePipelineSettings(pipelineSettingsJson);
  if (!pipelineSettings) return null;

  // Проверяем что воронка активна
  if (!isPipelineActive(pipelineSettings, currentPipelineId)) return null;

  // Проверяем что агент работает на этом этапе
  if (!isStageEnabled(pipelineSettings, currentPipelineId, currentStageId)) {
    return null;
  }

  // Получаем инструкции для конкретного этапа
  return getStageInstructions(pipelineSettings, currentPipelineId, currentStageId);
}

/**
 * Формирует расширенный системный промпт с контекстно-зависимыми инструкциями
 * @param baseSystemInstructions - Базовые системные инструкции агента (кто вы, личность)
 * @param stageInstructions - Специфичные инструкции для текущего этапа (что делать)
 * @param knowledgeContext - Контекст из базы знаний (факты и знания агента)
 * @returns Объединенный промпт с контекстом текущего этапа и базой знаний
 */
export function buildEnhancedSystemPrompt(
  baseSystemInstructions: string | null,
  stageInstructions: string | null,
  knowledgeContext: string | null = null
): string {
  const base = baseSystemInstructions || 'Вы - полезный помощник.';

  // Собираем промпт по частям
  let prompt = base;

  // Добавляем базу знаний если есть
  if (knowledgeContext) {
    prompt += `\n\n${knowledgeContext}`;
  }

  // Добавляем инструкции этапа если есть
  if (stageInstructions) {
    prompt += `\n\n## Контекст текущего этапа
${stageInstructions}

ВАЖНО: Строго следуйте инструкциям для текущего этапа. Адаптируйте свое поведение, тон и подход в соответствии с этими специфичными указаниями.`;
  }

  return prompt;
}
