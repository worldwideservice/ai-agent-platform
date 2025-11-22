import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * GET /api/analytics/dashboard
 * Получить аналитику для Dashboard
 */
export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Получаем количество активных агентов
    const activeAgentsCount = await prisma.agent.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // Получаем общее количество сообщений из ChatLog
    const totalMessagesCount = await prisma.chatLog.count({
      where: { userId },
    });

    // Для новых лидов и уровня отклика пока возвращаем 0 (нужна CRM интеграция)
    const newLeads = 0;
    const responseRate = totalMessagesCount > 0 ? '100%' : '0%';

    // Получаем сообщения по месяцам (последние 6 месяцев)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const messagesData = await prisma.chatLog.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    });

    // Преобразуем данные в формат для графика
    const monthlyMessages = messagesData.reduce((acc: any, item: any) => {
      const month = new Date(item.createdAt).toLocaleDateString('ru-RU', { month: 'short' });
      acc[month] = (acc[month] || 0) + item._count;
      return acc;
    }, {});

    const messagesChartData = Object.entries(monthlyMessages).map(([name, value]) => ({
      name,
      value,
    }));

    // Для конверсий пока возвращаем пустой массив
    const conversionsChartData: any[] = [];

    return res.json({
      stats: {
        activeAgents: activeAgentsCount,
        totalMessages: totalMessagesCount,
        newLeads,
        responseRate,
      },
      charts: {
        messagesData: messagesChartData,
        conversionsData: conversionsChartData,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
