import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentPlan: true,
        trialEndsAt: true,
        responsesUsed: true,
        responsesLimit: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Вычисляем оставшиеся дни пробного периода
    let daysRemaining = 0;
    if (user.trialEndsAt) {
      const now = new Date();
      const trialEndDate = new Date(user.trialEndsAt);
      const diffTime = trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Вычисляем процент использования
    const usagePercentage = user.responsesLimit > 0
      ? Math.round((user.responsesUsed / user.responsesLimit) * 100)
      : 0;

    // Проверяем статус
    const isActive = user.currentPlan === 'trial'
      ? daysRemaining > 0
      : true;

    return res.json({
      currentPlan: user.currentPlan,
      isActive,
      daysRemaining,
      responsesUsed: user.responsesUsed,
      responsesLimit: user.responsesLimit,
      usagePercentage,
      trialEndsAt: user.trialEndsAt,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
