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

    const now = new Date();

    // 1. Ответы ИИ за текущий месяц
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const responsesThisMonth = await prisma.chatLog.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Ответы за прошлый месяц для расчета процента изменения
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const responsesLastMonth = await prisma.chatLog.count({
      where: {
        userId,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // Рассчитываем процент изменения
    let changePercent = '0%';
    let trend: 'up' | 'down' = 'up';
    if (responsesLastMonth > 0) {
      const change = ((responsesThisMonth - responsesLastMonth) / responsesLastMonth) * 100;
      changePercent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      trend = change >= 0 ? 'up' : 'down';
    } else if (responsesThisMonth > 0) {
      changePercent = '+100%';
      trend = 'up';
    }

    // 2. Ответы ИИ за последние 7 дней
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const responsesLast7Days = await prisma.chatLog.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 3. Ответы ИИ сегодня
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const responsesToday = await prisma.chatLog.count({
      where: {
        userId,
        createdAt: { gte: startOfToday },
      },
    });

    // 4. Всего агентов
    const totalAgents = await prisma.agent.count({
      where: { userId },
    });

    // График: Ответы ИИ за последние 6 месяцев
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allMessages = await prisma.chatLog.findMany({
      where: {
        userId,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    // Группируем по месяцам
    const monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const monthlyData: { name: string; value: number }[] = [];

    console.log('📊 Monthly Data Debug:', {
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear(),
      currentDate: now.toISOString()
    });

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const count = allMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return msgDate >= monthStart && msgDate <= monthEnd;
      }).length;

      console.log(`  Month ${i}:`, {
        monthName,
        monthIndex: date.getMonth(),
        count,
        dateRange: `${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`
      });

      monthlyData.push({ name: monthName, value: count });
    }

    // График: Ответы ИИ за сегодня (по часам)
    const todayMessages = await prisma.chatLog.findMany({
      where: {
        userId,
        createdAt: { gte: startOfToday },
      },
      select: { createdAt: true },
    });

    // Группируем по часам (с 0 до 23)
    const hourlyData: { name: string; value: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      const count = todayMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return msgDate.getHours() === hour;
      }).length;
      hourlyData.push({ name: hourLabel, value: count });
    }

    // Мини-график для карточки "Ответы ИИ за месяц" (последние 7 дней)
    const miniChartData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = allMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return msgDate >= dayStart && msgDate <= dayEnd;
      }).length;
      miniChartData.push(count);
    }

    return res.json({
      stats: {
        responsesThisMonth,
        responsesLast7Days,
        responsesToday,
        totalAgents,
        changePercent,
        trend,
        miniChartData,
      },
      charts: {
        monthlyData,
        hourlyData,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
