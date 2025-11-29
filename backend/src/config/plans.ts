/**
 * Plan Configurations
 * Конфигурация тарифных планов с лимитами
 */

export type PlanType = 'trial' | 'launch' | 'scale' | 'max' | 'unlimited';

export interface PlanLimits {
  // Основные лимиты
  agentsLimit: number;           // Количество агентов (-1 = безлимит)
  kbArticlesLimit: number;       // Статьи базы знаний (-1 = безлимит)
  responsesLimit: number;        // Ответов в месяц (для trial - всего)
  instructionsLimit: number;     // Символов в инструкциях агента

  // Фичи (доступ)
  canSendMedia: boolean;         // Отправка изображений, аудио, видео, документов
  canReceiveVoice: boolean;      // Входящие голосовые сообщения
  canReceiveImages: boolean;     // Входящие сообщения с изображениями
  canUpdateCrmFields: boolean;   // Обновление полей сделок и контактов

  // Период действия
  trialDays: number;             // Дней пробного периода (только для trial)
  isMonthlyReset: boolean;       // Сбрасываются ли ответы ежемесячно
}

export interface PlanConfig extends PlanLimits {
  name: PlanType;
  displayName: string;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  trial: {
    name: 'trial',
    displayName: 'Trial',
    agentsLimit: 3,
    kbArticlesLimit: 10,
    responsesLimit: 500,
    instructionsLimit: 10000,
    canSendMedia: false,
    canReceiveVoice: false,
    canReceiveImages: false,
    canUpdateCrmFields: false,
    trialDays: 15,
    isMonthlyReset: false, // Trial - это всего 500 ответов
  },
  launch: {
    name: 'launch',
    displayName: 'Launch',
    agentsLimit: 5,
    kbArticlesLimit: 20,
    responsesLimit: 1000, // Базовое значение, может меняться при покупке
    instructionsLimit: 20000,
    canSendMedia: true,
    canReceiveVoice: false,
    canReceiveImages: false,
    canUpdateCrmFields: false,
    trialDays: 0,
    isMonthlyReset: true,
  },
  scale: {
    name: 'scale',
    displayName: 'Scale',
    agentsLimit: 10,
    kbArticlesLimit: 100,
    responsesLimit: 15000, // Базовое значение
    instructionsLimit: 60000,
    canSendMedia: true,
    canReceiveVoice: true,
    canReceiveImages: true,
    canUpdateCrmFields: true,
    trialDays: 0,
    isMonthlyReset: true,
  },
  max: {
    name: 'max',
    displayName: 'Max',
    agentsLimit: -1, // Безлимит
    kbArticlesLimit: -1, // Безлимит
    responsesLimit: 15000, // Базовое значение
    instructionsLimit: 120000,
    canSendMedia: true,
    canReceiveVoice: true,
    canReceiveImages: true,
    canUpdateCrmFields: true,
    trialDays: 0,
    isMonthlyReset: true,
  },
  unlimited: {
    name: 'unlimited',
    displayName: 'Unlimited',
    agentsLimit: -1, // Безлимит
    kbArticlesLimit: -1, // Безлимит
    responsesLimit: -1, // Безлимит
    instructionsLimit: -1, // Безлимит
    canSendMedia: true,
    canReceiveVoice: true,
    canReceiveImages: true,
    canUpdateCrmFields: true,
    trialDays: 0,
    isMonthlyReset: false, // Нет ресета - безлимит
  },
};

/**
 * Получить конфигурацию плана
 */
export function getPlanConfig(plan: string): PlanConfig {
  const planType = plan as PlanType;
  return PLAN_CONFIGS[planType] || PLAN_CONFIGS.trial;
}

/**
 * Проверить, является ли лимит безлимитным
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}
