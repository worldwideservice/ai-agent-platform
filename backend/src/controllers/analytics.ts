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

    // Получаем все сообщения за последние 6 месяцев
    const allMessages = await prisma.chatLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Группируем сообщения по месяцам вручную
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const monthlyMessages: Record<string, number> = {};

    // Инициализируем последние 6 месяцев нулями
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      monthlyMessages[monthKey] = 0;
    }

    // Подсчитываем сообщения по месяцам
    allMessages.forEach((message: any) => {
      const date = new Date(message.createdAt);
      const monthKey = monthNames[date.getMonth()];
      if (monthlyMessages.hasOwnProperty(monthKey)) {
        monthlyMessages[monthKey]++;
      }
    });

    // Преобразуем в формат для графика
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
