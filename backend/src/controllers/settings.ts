import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * GET /api/settings
 * Получить настройки текущего пользователя
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Получаем или создаем настройки
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          stopOnReply: false,
          resumeTime: 30,
          resumeUnit: 'дней',
        },
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/settings
 * Обновить настройки пользователя
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { stopOnReply, resumeTime, resumeUnit } = req.body;

    // Валидация
    if (typeof stopOnReply !== 'boolean') {
      return res.status(400).json({ message: 'stopOnReply must be a boolean' });
    }

    if (typeof resumeTime !== 'number' || resumeTime < 1) {
      return res.status(400).json({ message: 'resumeTime must be a positive number' });
    }

    if (!['дней', 'часов', 'минут'].includes(resumeUnit)) {
      return res.status(400).json({ message: 'resumeUnit must be дней, часов, or минут' });
    }

    // Обновляем или создаем настройки
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        stopOnReply,
        resumeTime,
        resumeUnit,
      },
      create: {
        userId,
        stopOnReply,
        resumeTime,
        resumeUnit,
      },
    });

    return res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
