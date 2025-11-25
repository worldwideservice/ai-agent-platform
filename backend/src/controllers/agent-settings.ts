import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * GET /api/agents/:agentId/advanced-settings
 * Получить расширенные настройки агента
 */
export const getAdvancedSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ищем настройки
    let settings = await prisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.agentAdvancedSettings.create({
        data: {
          agentId,
          model: 'OpenAI GPT-4.1',
          autoDetectLanguage: false,
          responseLanguage: '',
          scheduleEnabled: false,
          creativity: 'balanced',
          responseDelaySeconds: 45,
        },
      });
    }

    return res.json(settings);
  } catch (error: any) {
    console.error('Error fetching advanced settings:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/agents/:agentId/advanced-settings
 * Обновить расширенные настройки агента
 */
export const updateAdvancedSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const {
      model,
      autoDetectLanguage,
      responseLanguage,
      scheduleEnabled,
      creativity,
      responseDelaySeconds,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ищем существующие настройки
    const existingSettings = await prisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    let settings;

    if (existingSettings) {
      // Обновляем существующие
      settings = await prisma.agentAdvancedSettings.update({
        where: { agentId },
        data: {
          model: model ?? existingSettings.model,
          autoDetectLanguage: autoDetectLanguage ?? existingSettings.autoDetectLanguage,
          responseLanguage: responseLanguage ?? existingSettings.responseLanguage,
          scheduleEnabled: scheduleEnabled ?? existingSettings.scheduleEnabled,
          creativity: creativity ?? existingSettings.creativity,
          responseDelaySeconds: responseDelaySeconds ?? existingSettings.responseDelaySeconds,
        },
      });
    } else {
      // Создаем новые
      settings = await prisma.agentAdvancedSettings.create({
        data: {
          agentId,
          model: model ?? 'OpenAI GPT-4.1',
          autoDetectLanguage: autoDetectLanguage ?? false,
          responseLanguage: responseLanguage ?? '',
          scheduleEnabled: scheduleEnabled ?? false,
          creativity: creativity ?? 'balanced',
          responseDelaySeconds: responseDelaySeconds ?? 45,
        },
      });
    }

    return res.json(settings);
  } catch (error: any) {
    console.error('Error updating advanced settings:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
