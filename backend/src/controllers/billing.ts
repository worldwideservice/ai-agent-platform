import { Response } from 'express';
import { AuthRequest } from '../types';
import { getSubscriptionInfo as getPlanLimitsInfo, changePlan, getUserLimits } from '../services/plan-limits.service';
import { PlanType, PLAN_CONFIGS } from '../config/plans';
import subscriptionService from '../services/subscription.service';

/**
 * GET /api/billing/subscription
 * Получить информацию о подписке и использовании
 */
export const getSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем и обновляем статус подписки
    const subscriptionInfo = await subscriptionService.checkAndUpdateSubscriptionStatus(userId);

    // Получаем дополнительную информацию о лимитах
    const planLimitsInfo = await getPlanLimitsInfo(userId);

    return res.json({
      ...planLimitsInfo,
      subscriptionStatus: subscriptionInfo.status,
      daysRemaining: subscriptionInfo.daysRemaining,
      gracePeriodDaysRemaining: subscriptionInfo.gracePeriodDaysRemaining,
      subscriptionEndsAt: subscriptionInfo.subscriptionEndsAt,
      gracePeriodEndsAt: subscriptionInfo.gracePeriodEndsAt,
      isActive: subscriptionInfo.isActive,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/billing/limits
 * Получить текущие лимиты пользователя
 */
export const getLimits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limits = await getUserLimits(userId);

    return res.json(limits);
  } catch (error) {
    console.error('Error fetching limits:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/billing/plans
 * Получить список доступных планов с их характеристиками
 */
export const getPlans = async (_req: AuthRequest, res: Response) => {
  try {
    const plans = Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.displayName,
      agentsLimit: config.agentsLimit,
      kbArticlesLimit: config.kbArticlesLimit,
      responsesLimit: config.responsesLimit,
      instructionsLimit: config.instructionsLimit,
      features: {
        canSendMedia: config.canSendMedia,
        canReceiveVoice: config.canReceiveVoice,
        canReceiveImages: config.canReceiveImages,
        canUpdateCrmFields: config.canUpdateCrmFields,
      },
      trialDays: config.trialDays,
      isMonthlyReset: config.isMonthlyReset,
    }));

    return res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/billing/change-plan
 * Изменить план пользователя
 */
export const updatePlan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { plan, responsesLimit } = req.body;

    // Валидация плана
    if (!plan || !['trial', 'launch', 'scale', 'max', 'unlimited'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid plan. Available plans: trial, launch, scale, max, unlimited'
      });
    }

    // Меняем план
    await changePlan(userId, plan as PlanType, responsesLimit);

    // Возвращаем обновленную информацию
    const subscription = await getPlanLimitsInfo(userId);

    return res.json({
      message: 'План успешно изменён',
      subscription,
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/billing/activate
 * Активировать подписку (после оплаты)
 */
export const activateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { plan, responsesCount, billingCycle } = req.body;

    // Валидация
    if (!plan || !['launch', 'scale', 'max'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid plan. Available plans: launch, scale, max'
      });
    }

    if (!responsesCount || responsesCount < 1000) {
      return res.status(400).json({
        message: 'Invalid responses count. Minimum: 1000'
      });
    }

    // Активируем подписку на 30 дней
    await subscriptionService.activateSubscription(
      userId,
      plan as PlanType,
      responsesCount,
      billingCycle || 'monthly'
    );

    // Возвращаем обновленную информацию
    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(userId);

    return res.json({
      message: 'Подписка успешно активирована',
      subscription: subscriptionInfo,
    });
  } catch (error) {
    console.error('Error activating subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/billing/renew
 * Продлить подписку (после оплаты)
 */
export const renewSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Продлеваем подписку на новый период
    await subscriptionService.renewSubscription(userId);

    // Возвращаем обновленную информацию
    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(userId);

    return res.json({
      message: 'Подписка успешно продлена',
      subscription: subscriptionInfo,
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/billing/cancel
 * Отменить подписку
 */
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await subscriptionService.cancelSubscription(userId);

    return res.json({
      message: 'Подписка отменена',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/billing/status
 * Получить детальный статус подписки
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const info = await subscriptionService.checkAndUpdateSubscriptionStatus(userId);

    return res.json(info);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/billing/check-access
 * Проверить, может ли пользователь использовать сервис
 */
export const checkAccess = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await subscriptionService.canUserUseService(userId);

    return res.json(result);
  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
