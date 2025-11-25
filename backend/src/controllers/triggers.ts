import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';

/**
 * POST /api/agents/:agentId/triggers
 * Создать новый триггер
 */
export const createTrigger = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { name, isActive, condition, cancelMessage, runLimit, actions } = req.body;

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

    // Создаем триггер с действиями
    const trigger = await prisma.trigger.create({
      data: {
        agentId,
        name,
        isActive: isActive ?? true,
        condition,
        cancelMessage,
        runLimit,
        actions: {
          create: actions?.map((action: any, index: number) => ({
            action: action.action,
            order: index,
          })) || [],
        },
      },
      include: {
        actions: true,
      },
    });

    return res.status(201).json(trigger);
  } catch (error: any) {
    console.error('Error creating trigger:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/triggers
 * Получить все триггеры агента
 */
export const getTriggers = async (req: AuthRequest, res: Response) => {
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

    const triggers = await prisma.trigger.findMany({
      where: { agentId },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(triggers);
  } catch (error: any) {
    console.error('Error fetching triggers:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/agents/:agentId/triggers/:triggerId
 * Обновить триггер
 */
export const updateTrigger = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, triggerId } = req.params;
    const { name, isActive, condition, cancelMessage, runLimit, actions } = req.body;

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

    // Проверяем что триггер принадлежит агенту
    const existingTrigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
    });

    if (!existingTrigger || existingTrigger.agentId !== agentId) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    // Удаляем старые действия и создаем новые
    await prisma.triggerAction.deleteMany({
      where: { triggerId },
    });

    const trigger = await prisma.trigger.update({
      where: { id: triggerId },
      data: {
        name,
        isActive,
        condition,
        cancelMessage,
        runLimit,
        actions: {
          create: actions?.map((action: any, index: number) => ({
            action: action.action,
            order: index,
          })) || [],
        },
      },
      include: {
        actions: true,
      },
    });

    return res.json(trigger);
  } catch (error: any) {
    console.error('Error updating trigger:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/agents/:agentId/triggers/:triggerId
 * Удалить триггер
 */
export const deleteTrigger = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, triggerId } = req.params;

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

    // Проверяем что триггер принадлежит агенту
    const existingTrigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
    });

    if (!existingTrigger || existingTrigger.agentId !== agentId) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    await prisma.trigger.delete({
      where: { id: triggerId },
    });

    return res.json({ message: 'Trigger deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting trigger:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
