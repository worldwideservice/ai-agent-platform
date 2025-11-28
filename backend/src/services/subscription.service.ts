/**
 * Subscription Service
 * Сервис управления подписками пользователей
 *
 * Логика:
 * 1. Подписка активируется на 30 дней
 * 2. После окончания 30 дней счётчик ответов обнуляется
 * 3. Если нет оплаты - даётся grace period (10% = 3 дня)
 * 4. После grace period подписка деактивируется
 */

import { PrismaClient } from '@prisma/client';
import { getPlanConfig, PlanType } from '../config/plans';

const prisma = new PrismaClient();

// Константы
const SUBSCRIPTION_PERIOD_DAYS = 30;
const GRACE_PERIOD_PERCENT = 0.1; // 10%
const GRACE_PERIOD_DAYS = Math.ceil(SUBSCRIPTION_PERIOD_DAYS * GRACE_PERIOD_PERCENT); // 3 дня

export type SubscriptionStatus = 'trial' | 'active' | 'grace_period' | 'expired';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: string;
  responsesUsed: number;
  responsesLimit: number;
  daysRemaining: number;
  gracePeriodDaysRemaining: number | null;
  subscriptionEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  isActive: boolean; // Может ли пользователь использовать сервис
}

/**
 * Активировать подписку для пользователя
 */
export async function activateSubscription(
  userId: string,
  plan: PlanType,
  responsesCount: number,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
  const now = new Date();
  const periodDays = billingCycle === 'yearly' ? 365 : SUBSCRIPTION_PERIOD_DAYS;
  const subscriptionEndsAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const gracePeriodDays = Math.ceil(periodDays * GRACE_PERIOD_PERCENT);
  const gracePeriodEndsAt = new Date(subscriptionEndsAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  const planConfig = getPlanConfig(plan);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      currentPlan: plan,
      subscriptionStatus: 'active',
      subscriptionStartsAt: now,
      subscriptionEndsAt,
      gracePeriodEndsAt,
      billingCycle,
      selectedResponses: responsesCount,
      responsesLimit: responsesCount,
      responsesUsed: 0, // Сбрасываем счётчик при активации
      responsesResetAt: subscriptionEndsAt,
      agentsLimit: planConfig.agentsLimit,
      kbArticlesLimit: planConfig.kbArticlesLimit,
      instructionsLimit: planConfig.instructionsLimit,
    },
  });

  return user;
}

/**
 * Продлить подписку (после оплаты)
 */
export async function renewSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const periodDays = user.billingCycle === 'yearly' ? 365 : SUBSCRIPTION_PERIOD_DAYS;
  const subscriptionEndsAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const gracePeriodDays = Math.ceil(periodDays * GRACE_PERIOD_PERCENT);
  const gracePeriodEndsAt = new Date(subscriptionEndsAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'active',
      subscriptionStartsAt: now,
      subscriptionEndsAt,
      gracePeriodEndsAt,
      responsesUsed: 0, // Сбрасываем счётчик при продлении
      responsesResetAt: subscriptionEndsAt,
    },
  });

  return updatedUser;
}

/**
 * Получить информацию о подписке пользователя
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  let status = user.subscriptionStatus as SubscriptionStatus;
  let daysRemaining = 0;
  let gracePeriodDaysRemaining: number | null = null;
  let isActive = true;

  // Проверяем актуальный статус
  if (user.currentPlan === 'trial') {
    // Для trial проверяем trialEndsAt
    if (user.trialEndsAt && now > user.trialEndsAt) {
      status = 'expired';
      isActive = false;
    } else if (user.trialEndsAt) {
      daysRemaining = Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    }
  } else {
    // Для платных планов
    if (user.subscriptionEndsAt) {
      if (now > user.subscriptionEndsAt) {
        // Подписка истекла
        if (user.gracePeriodEndsAt && now <= user.gracePeriodEndsAt) {
          // В grace period
          status = 'grace_period';
          gracePeriodDaysRemaining = Math.ceil(
            (user.gracePeriodEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );
          isActive = true; // Ещё можно использовать
        } else {
          // Grace period тоже истёк
          status = 'expired';
          isActive = false;
        }
      } else {
        // Подписка активна
        daysRemaining = Math.ceil(
          (user.subscriptionEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
      }
    }
  }

  return {
    status,
    plan: user.currentPlan,
    responsesUsed: user.responsesUsed,
    responsesLimit: user.responsesLimit,
    daysRemaining,
    gracePeriodDaysRemaining,
    subscriptionEndsAt: user.subscriptionEndsAt,
    gracePeriodEndsAt: user.gracePeriodEndsAt,
    isActive,
  };
}

/**
 * Проверить и обновить статус подписки пользователя
 * Вызывается при каждом запросе для актуализации статуса
 */
export async function checkAndUpdateSubscriptionStatus(userId: string): Promise<SubscriptionInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  let newStatus = user.subscriptionStatus;
  let shouldUpdate = false;

  if (user.currentPlan === 'trial') {
    // Trial логика
    if (user.trialEndsAt && now > user.trialEndsAt && user.subscriptionStatus !== 'expired') {
      newStatus = 'expired';
      shouldUpdate = true;
    }
  } else {
    // Платные планы
    if (user.subscriptionEndsAt && now > user.subscriptionEndsAt) {
      if (user.gracePeriodEndsAt && now <= user.gracePeriodEndsAt) {
        // Переходим в grace period
        if (user.subscriptionStatus === 'active') {
          newStatus = 'grace_period';
          shouldUpdate = true;
        }
      } else if (user.gracePeriodEndsAt && now > user.gracePeriodEndsAt) {
        // Grace period истёк - деактивируем
        if (user.subscriptionStatus !== 'expired') {
          newStatus = 'expired';
          shouldUpdate = true;
        }
      }
    }
  }

  if (shouldUpdate) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: newStatus,
      },
    });
  }

  return getSubscriptionInfo(userId);
}

/**
 * Проверить, может ли пользователь использовать сервис
 */
export async function canUserUseService(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  subscriptionInfo: SubscriptionInfo;
}> {
  const info = await checkAndUpdateSubscriptionStatus(userId);

  if (!info.isActive) {
    return {
      allowed: false,
      reason: info.status === 'expired'
        ? 'Ваша подписка истекла. Пожалуйста, продлите подписку для продолжения использования.'
        : 'Ваш аккаунт неактивен.',
      subscriptionInfo: info,
    };
  }

  // Проверяем лимит ответов
  if (info.responsesUsed >= info.responsesLimit) {
    return {
      allowed: false,
      reason: 'Вы достигли лимита ответов. Пожалуйста, обновите план или дождитесь следующего периода.',
      subscriptionInfo: info,
    };
  }

  return {
    allowed: true,
    subscriptionInfo: info,
  };
}

/**
 * Обработать истёкшие подписки (для cron job)
 * Переводит в grace_period и затем в expired
 */
export async function processExpiredSubscriptions() {
  const now = new Date();

  // 1. Переводим в grace_period тех, у кого истекла подписка, но не grace period
  const toGracePeriod = await prisma.user.updateMany({
    where: {
      subscriptionStatus: 'active',
      subscriptionEndsAt: { lt: now },
      gracePeriodEndsAt: { gt: now },
    },
    data: {
      subscriptionStatus: 'grace_period',
    },
  });

  // 2. Деактивируем тех, у кого истёк grace period
  const toExpired = await prisma.user.updateMany({
    where: {
      subscriptionStatus: 'grace_period',
      gracePeriodEndsAt: { lt: now },
    },
    data: {
      subscriptionStatus: 'expired',
    },
  });

  // 3. Обрабатываем истёкшие trial
  const expiredTrials = await prisma.user.updateMany({
    where: {
      currentPlan: 'trial',
      subscriptionStatus: { not: 'expired' },
      trialEndsAt: { lt: now },
    },
    data: {
      subscriptionStatus: 'expired',
    },
  });

  return {
    movedToGracePeriod: toGracePeriod.count,
    movedToExpired: toExpired.count,
    expiredTrials: expiredTrials.count,
    processedAt: now,
  };
}

/**
 * Отменить подписку
 */
export async function cancelSubscription(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'expired',
      currentPlan: 'trial',
      responsesLimit: 0,
    },
  });

  return user;
}

/**
 * Понизить план до trial после истечения
 */
export async function downgradeToTrial(userId: string) {
  const trialConfig = getPlanConfig('trial');

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      currentPlan: 'trial',
      subscriptionStatus: 'expired',
      responsesLimit: 0, // У истёкшего trial нет ответов
      agentsLimit: trialConfig.agentsLimit,
      kbArticlesLimit: trialConfig.kbArticlesLimit,
      instructionsLimit: trialConfig.instructionsLimit,
    },
  });

  return user;
}

export default {
  activateSubscription,
  renewSubscription,
  getSubscriptionInfo,
  checkAndUpdateSubscriptionStatus,
  canUserUseService,
  processExpiredSubscriptions,
  cancelSubscription,
  downgradeToTrial,
  SUBSCRIPTION_PERIOD_DAYS,
  GRACE_PERIOD_DAYS,
};
