/**
 * Notifications Controller
 * Управление уведомлениями пользователя
 */

import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * GET /api/notifications
 * Получить все уведомления пользователя
 */
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit = '50', unreadOnly = 'false' } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Подсчёт непрочитанных
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Не удалось получить уведомления' });
  }
}

/**
 * POST /api/notifications
 * Создать новое уведомление
 */
export async function createNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type, title, message, isRead = true } = req.body;

    if (!type || !title || !message) {
      res.status(400).json({ error: 'type, title и message обязательны' });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        isRead,
      },
    });

    res.status(201).json({ notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Не удалось создать уведомление' });
  }
}

/**
 * PUT /api/notifications/:id/read
 * Отметить уведомление как прочитанное
 */
export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (notification.count === 0) {
      res.status(404).json({ error: 'Уведомление не найдено' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Не удалось обновить уведомление' });
  }
}

/**
 * PUT /api/notifications/read-all
 * Отметить все уведомления как прочитанные
 */
export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Не удалось обновить уведомления' });
  }
}

/**
 * DELETE /api/notifications/:id
 * Удалить уведомление
 */
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const notification = await prisma.notification.deleteMany({
      where: { id, userId },
    });

    if (notification.count === 0) {
      res.status(404).json({ error: 'Уведомление не найдено' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Не удалось удалить уведомление' });
  }
}

/**
 * DELETE /api/notifications
 * Удалить все уведомления пользователя
 */
export async function deleteAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Не удалось удалить уведомления' });
  }
}
