/**
 * Plan Limits Service
 * Сервис проверки и управления лимитами тарифных планов
 */

import { prisma } from '../config/database';
import { getPlanConfig, isUnlimited, PlanType, PLAN_CONFIGS } from '../config/plans';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}

export interface UserLimits {
  plan: string;
  trialEndsAt: Date | null;
  isTrialExpired: boolean;
  agents: LimitCheckResult;
  kbArticles: LimitCheckResult;
  responses: LimitCheckResult;
  instructions: number;
  features: {
    canSendMedia: boolean;
    canReceiveVoice: boolean;
    canReceiveImages: boolean;
    canUpdateCrmFields: boolean;
  };
}

/**
 * Получить текущие счетчики использования пользователя
 */
async function getUserUsage(userId: string) {
  const [agentsCount, articlesCount] = await Promise.all([
    prisma.agent.count({ where: { userId } }),
    prisma.kbArticle.count({ where: { userId } }),
  ]);

  return { agentsCount, articlesCount };
}

/**
 * Проверить, истек ли trial период
 */
export function isTrialExpired(user: { currentPlan: string; trialEndsAt: Date | null }): boolean {
  if (user.currentPlan !== 'trial') return false;
  if (!user.trialEndsAt) return true;
  return new Date() > new Date(user.trialEndsAt);
}

/**
 * Проверить и сбросить месячные лимиты если нужно
 */
export async function checkAndResetMonthlyLimits(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentPlan: true,
      responsesResetAt: true,
      responsesUsed: true,
    },
  });

  if (!user) return;

  const planConfig = getPlanConfig(user.currentPlan);

  // Trial не сбрасывается
  if (!planConfig.isMonthlyReset) return;

  const now = new Date();

  // Если дата сброса не установлена или уже прошла
  if (!user.responsesResetAt || now > new Date(user.responsesResetAt)) {
    // Устанавливаем дату сброса на первое число следующего месяца
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.user.update({
      where: { id: userId },
      data: {
        responsesUsed: 0,
        responsesResetAt: nextReset,
      },
    });
  }
}

/**
 * Получить все лимиты пользователя с текущим использованием
 */
export async function getUserLimits(userId: string): Promise<UserLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentPlan: true,
      trialEndsAt: true,
      responsesUsed: true,
      responsesLimit: true,
      agentsLimit: true,
      kbArticlesLimit: true,
      instructionsLimit: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const planConfig = getPlanConfig(user.currentPlan);
  const usage = await getUserUsage(userId);
  const trialExpired = isTrialExpired(user);

  return {
    plan: user.currentPlan,
    trialEndsAt: user.trialEndsAt,
    isTrialExpired: trialExpired,
    agents: {
      allowed: !trialExpired && (isUnlimited(user.agentsLimit) || usage.agentsCount < user.agentsLimit),
      current: usage.agentsCount,
      limit: user.agentsLimit,
      message: isUnlimited(user.agentsLimit) ? undefined :
        trialExpired ? 'Пробный период истёк' :
        usage.agentsCount >= user.agentsLimit ? `Достигнут лимит агентов (${user.agentsLimit})` : undefined,
    },
    kbArticles: {
      allowed: !trialExpired && (isUnlimited(user.kbArticlesLimit) || usage.articlesCount < user.kbArticlesLimit),
      current: usage.articlesCount,
      limit: user.kbArticlesLimit,
      message: isUnlimited(user.kbArticlesLimit) ? undefined :
        trialExpired ? 'Пробный период истёк' :
        usage.articlesCount >= user.kbArticlesLimit ? `Достигнут лимит статей базы знаний (${user.kbArticlesLimit})` : undefined,
    },
    responses: {
      allowed: !trialExpired && user.responsesUsed < user.responsesLimit,
      current: user.responsesUsed,
      limit: user.responsesLimit,
      message: trialExpired ? 'Пробный период истёк' :
        user.responsesUsed >= user.responsesLimit ? `Достигнут лимит ответов (${user.responsesLimit})` : undefined,
    },
    instructions: user.instructionsLimit,
    features: {
      canSendMedia: planConfig.canSendMedia,
      canReceiveVoice: planConfig.canReceiveVoice,
      canReceiveImages: planConfig.canReceiveImages,
      canUpdateCrmFields: planConfig.canUpdateCrmFields,
    },
  };
}

/**
 * Проверить можно ли создать агента
 */
export async function canCreateAgent(userId: string): Promise<LimitCheckResult> {
  await checkAndResetMonthlyLimits(userId);
  const limits = await getUserLimits(userId);
  return limits.agents;
}

/**
 * Проверить можно ли создать статью базы знаний
 */
export async function canCreateKbArticle(userId: string): Promise<LimitCheckResult> {
  await checkAndResetMonthlyLimits(userId);
  const limits = await getUserLimits(userId);
  return limits.kbArticles;
}

/**
 * Проверить можно ли использовать AI ответ
 */
export async function canUseResponse(userId: string): Promise<LimitCheckResult> {
  await checkAndResetMonthlyLimits(userId);
  const limits = await getUserLimits(userId);
  return limits.responses;
}

/**
 * Увеличить счетчик использованных ответов
 */
export async function incrementResponsesUsed(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      responsesUsed: { increment: 1 },
    },
  });
}

/**
 * Проверить лимит длины инструкций агента
 */
export async function checkInstructionsLimit(userId: string, instructionsLength: number): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instructionsLimit: true, currentPlan: true, trialEndsAt: true },
  });

  if (!user) {
    return { allowed: false, current: instructionsLength, limit: 0, message: 'Пользователь не найден' };
  }

  const trialExpired = isTrialExpired(user);
  if (trialExpired) {
    return { allowed: false, current: instructionsLength, limit: user.instructionsLimit, message: 'Пробный период истёк' };
  }

  return {
    allowed: instructionsLength <= user.instructionsLimit,
    current: instructionsLength,
    limit: user.instructionsLimit,
    message: instructionsLength > user.instructionsLimit
      ? `Превышен лимит символов инструкций (${user.instructionsLimit})`
      : undefined,
  };
}

/**
 * Проверить доступ к фиче плана
 */
export async function canUseFeature(userId: string, feature: keyof UserLimits['features']): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentPlan: true, trialEndsAt: true },
  });

  if (!user || isTrialExpired(user)) return false;

  const planConfig = getPlanConfig(user.currentPlan);
  return planConfig[feature];
}

/**
 * Изменить план пользователя
 */
export async function changePlan(
  userId: string,
  newPlan: PlanType,
  responsesLimit?: number
): Promise<void> {
  const planConfig = PLAN_CONFIGS[newPlan];

  const updateData: any = {
    currentPlan: newPlan,
    agentsLimit: planConfig.agentsLimit,
    kbArticlesLimit: planConfig.kbArticlesLimit,
    instructionsLimit: planConfig.instructionsLimit,
    responsesLimit: responsesLimit || planConfig.responsesLimit,
  };

  // Для trial устанавливаем дату окончания
  if (newPlan === 'trial') {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + planConfig.trialDays);
    updateData.trialEndsAt = trialEndsAt;
    updateData.responsesResetAt = null;
  } else {
    // Для платных планов - дата сброса на следующий месяц
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    updateData.responsesResetAt = nextReset;
    updateData.responsesUsed = 0; // Сбрасываем при смене плана
    updateData.trialEndsAt = null;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

/**
 * Получить информацию о подписке для отображения
 */
export async function getSubscriptionInfo(userId: string) {
  await checkAndResetMonthlyLimits(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentPlan: true,
      trialEndsAt: true,
      responsesUsed: true,
      responsesLimit: true,
      responsesResetAt: true,
      agentsLimit: true,
      kbArticlesLimit: true,
      instructionsLimit: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const trialExpired = isTrialExpired(user);
  const planConfig = getPlanConfig(user.currentPlan);

  // Вычисляем дни до окончания trial
  let daysRemaining = 0;
  if (user.currentPlan === 'trial' && user.trialEndsAt && !trialExpired) {
    const diff = new Date(user.trialEndsAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    plan: user.currentPlan,
    planDisplayName: planConfig.displayName,
    isActive: !trialExpired && user.responsesUsed < user.responsesLimit,
    isTrialExpired: trialExpired,
    trialEndsAt: user.trialEndsAt,
    daysRemaining,
    responsesUsed: user.responsesUsed,
    responsesLimit: user.responsesLimit,
    responsesResetAt: user.responsesResetAt,
    usagePercentage: Math.round((user.responsesUsed / user.responsesLimit) * 100),
    limits: {
      agents: user.agentsLimit,
      kbArticles: user.kbArticlesLimit,
      instructions: user.instructionsLimit,
    },
    features: {
      canSendMedia: planConfig.canSendMedia,
      canReceiveVoice: planConfig.canReceiveVoice,
      canReceiveImages: planConfig.canReceiveImages,
      canUpdateCrmFields: planConfig.canUpdateCrmFields,
    },
  };
}
