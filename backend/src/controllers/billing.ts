import { Response } from 'express';
import { AuthRequest } from '../types';
import { getSubscriptionInfo, changePlan, getUserLimits } from '../services/plan-limits.service';
import { PlanType, PLAN_CONFIGS } from '../config/plans';

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

    const subscription = await getSubscriptionInfo(userId);

    return res.json(subscription);
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
export const getPlans = async (req: AuthRequest, res: Response) => {
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
    if (!plan || !['trial', 'launch', 'scale', 'max'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid plan. Available plans: trial, launch, scale, max'
      });
    }

    // Меняем план
    await changePlan(userId, plan as PlanType, responsesLimit);

    // Возвращаем обновленную информацию
    const subscription = await getSubscriptionInfo(userId);

    return res.json({
      message: 'План успешно изменён',
      subscription,
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
