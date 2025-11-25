import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * GET /api/settings
 * Получить настройки текущего пользователя
 */
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    console.log('⚙️ GET /api/settings - userId:', userId);

    if (!userId) {
      console.log('❌ Unauthorized - no userId');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Получаем настройки или создаем, если их нет
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      try {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            stopOnReply: false,
            resumeTime: 30,
            resumeUnit: 'дней',
          },
        });
        console.log('✅ Created settings:', settings);

        // If create returned null, query again
        if (!settings) {
          settings = await prisma.userSettings.findUnique({
            where: { userId },
          });
          console.log('✅ Found settings after create:', settings);
        }
      } catch (createError) {
        console.log('⚠️ Create failed, trying to find:', createError);
        // Maybe it already exists due to race condition
        settings = await prisma.userSettings.findUnique({
          where: { userId },
        });
      }
    } else {
      console.log('✅ Found settings:', settings);
    }

    // If still no settings, return default values
    if (!settings) {
      console.log('⚠️ No settings found, returning defaults');
      return res.json({
        stopOnReply: false,
        resumeTime: 30,
        resumeUnit: 'дней',
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/settings
 * Обновить настройки пользователя
 */
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

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
