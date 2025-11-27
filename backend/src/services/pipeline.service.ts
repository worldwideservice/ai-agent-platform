/**
 * Pipeline Service
 * Сервис для работы с контекстно-зависимыми инструкциями агента
 * Позволяет агенту адаптировать свое поведение в зависимости от текущего этапа процесса
 */

interface PipelineConfig {
  name: string;
  active: boolean;
  allStages: boolean; // true = все этапы активны
  stages: string[];   // массив включенных этапов (если allStages = false)
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
 * Нормализует ID воронки к формату с префиксом pipeline_
 */
function normalizePipelineId(pipelineId: string): string {
  if (pipelineId.startsWith('pipeline_')) return pipelineId;
  return `pipeline_${pipelineId}`;
}

/**
 * Нормализует ID этапа к формату с префиксом stage_
 */
function normalizeStageId(stageId: string): string {
  if (stageId.startsWith('stage_')) return stageId;
  return `stage_${stageId}`;
}

/**
 * Получает инструкции для конкретного этапа
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса (raw ID или с префиксом pipeline_)
 * @param stageId - ID этапа (raw ID или с префиксом stage_)
 * @returns Инструкции для этапа или null если не найдены
 */
export function getStageInstructions(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string,
  stageId: string
): string | null {
  if (!pipelineSettings?.pipelines) return null;

  const normalizedPipelineId = normalizePipelineId(pipelineId);
  const normalizedStageId = normalizeStageId(stageId);

  const pipeline = pipelineSettings.pipelines[normalizedPipelineId];
  if (!pipeline || !pipeline.active) return null;

  if (!pipeline.stageInstructions) return null;

  return pipeline.stageInstructions[normalizedStageId] || null;
}

/**
 * Проверяет, активен ли процесс для агента
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса (raw ID или с префиксом pipeline_)
 * @returns true если процесс активен
 */
export function isPipelineActive(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string
): boolean {
  if (!pipelineSettings?.pipelines) return false;

  const normalizedPipelineId = normalizePipelineId(pipelineId);
  const pipeline = pipelineSettings.pipelines[normalizedPipelineId];
  return pipeline?.active === true;
}

/**
 * Проверяет, работает ли агент на конкретном этапе процесса
 * @param pipelineSettings - Настройки процессов агента
 * @param pipelineId - ID процесса (raw ID или с префиксом pipeline_)
 * @param stageId - ID этапа (raw ID или с префиксом stage_)
 * @returns true если агент активен на этом этапе
 */
export function isStageEnabled(
  pipelineSettings: PipelineSettings | null,
  pipelineId: string,
  stageId: string
): boolean {
  if (!pipelineSettings?.pipelines) return false;

  const normalizedPipelineId = normalizePipelineId(pipelineId);
  const normalizedStageId = normalizeStageId(stageId);

  const pipeline = pipelineSettings.pipelines[normalizedPipelineId];
  if (!pipeline || !pipeline.active) return false;

  // Если allStages = true, агент работает на всех этапах
  if (pipeline.allStages) return true;

  // Иначе проверяем что этап в списке выбранных
  if (!pipeline.stages || pipeline.stages.length === 0) return false;

  return pipeline.stages.includes(normalizedStageId);
}

/**
 * Проверяет, активен ли агент на данной воронке и этапе
 * Это главная проверка перед тем как агент начнёт работать
 * @param pipelineSettingsJson - JSON строка с настройками процессов агента
 * @param currentPipelineId - ID текущего процесса (raw ID или с префиксом)
 * @param currentStageId - ID текущего этапа (raw ID или с префиксом)
 * @returns true если агент должен работать на этом этапе
 */
export function isAgentEnabledForStage(
  pipelineSettingsJson: string | null,
  currentPipelineId: string | null,
  currentStageId: string | null
): boolean {
  if (!pipelineSettingsJson || !currentPipelineId || !currentStageId) return false;

  const pipelineSettings = parsePipelineSettings(pipelineSettingsJson);
  if (!pipelineSettings) return false;

  // Проверяем что воронка активна
  if (!isPipelineActive(pipelineSettings, currentPipelineId)) {
    return false;
  }

  // Проверяем что этап включён
  return isStageEnabled(pipelineSettings, currentPipelineId, currentStageId);
}

/**
 * Получает контекстно-зависимые инструкции для текущего этапа
 * Использует данные о текущем процессе и этапе для адаптации поведения агента
 * @param pipelineSettingsJson - JSON строка с настройками процессов агента
 * @param currentPipelineId - ID текущего процесса (из CRM или другой системы)
 * @param currentStageId - ID текущего этапа процесса
 * @returns Специфичные инструкции для этапа или null (если нет инструкций)
 */
export function getInstructionsForCurrentStage(
  pipelineSettingsJson: string | null,
  currentPipelineId: string | null,
  currentStageId: string | null
): string | null {
  if (!pipelineSettingsJson || !currentPipelineId || !currentStageId) return null;

  const pipelineSettings = parsePipelineSettings(pipelineSettingsJson);
  if (!pipelineSettings) return null;

  // Получаем инструкции для конкретного этапа (может быть null если нет инструкций)
  return getStageInstructions(pipelineSettings, currentPipelineId, currentStageId);
}

/**
 * Формирует расширенный системный промпт с контекстно-зависимыми инструкциями
 * @param roleKnowledge - Знания из роли (методологии продаж, навыки, техники)
 * @param baseSystemInstructions - Базовые системные инструкции агента (кто вы, личность)
 * @param stageInstructions - Специфичные инструкции для текущего этапа (что делать)
 * @param knowledgeContext - Контекст из базы знаний (факты о продукте)
 * @returns Объединенный промпт с контекстом текущего этапа и базой знаний
 */
export function buildEnhancedSystemPrompt(
  roleKnowledge: string | null,
  baseSystemInstructions: string | null,
  stageInstructions: string | null,
  knowledgeContext: string | null = null
): string {
  // Собираем промпт по частям
  const parts: string[] = [];

  // 1. Знания роли (КАК продавать - методологии, техники, навыки)
  if (roleKnowledge) {
    parts.push(`## Методологии и навыки

${roleKnowledge}`);
  }

  // 2. Базовые инструкции (личность агента, дополнительные указания)
  const base = baseSystemInstructions || 'Вы - полезный помощник.';
  parts.push(base);

  // 3. База знаний (ЧТО продавать - информация о продукте)
  if (knowledgeContext) {
    parts.push(knowledgeContext);
  }

  // 4. Инструкции этапа (контекст текущего этапа процесса)
  if (stageInstructions) {
    parts.push(`## Контекст текущего этапа
${stageInstructions}

ВАЖНО: Строго следуйте инструкциям для текущего этапа. Адаптируйте свое поведение, тон и подход в соответствии с этими специфичными указаниями.`);
  }

  return parts.join('\n\n');
}
