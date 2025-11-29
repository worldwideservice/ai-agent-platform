import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { systemNotifications } from '../services/system-notifications.service';

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

    // Валидация обязательных полей
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Название триггера обязательно' });
    }
    if (!condition || !condition.trim()) {
      return res.status(400).json({ message: 'Условие срабатывания обязательно' });
    }
    // Проверяем что есть хотя бы одно действие
    const validActions = actions?.filter((a: any) => a.action && a.action.trim() !== '') || [];
    if (validActions.length === 0) {
      return res.status(400).json({ message: 'Добавьте хотя бы одно действие' });
    }

    // Создаем триггер с действиями (используем только валидные)
    const trigger = await prisma.trigger.create({
      data: {
        agentId,
        name: name.trim(),
        isActive: isActive ?? true,
        condition: condition.trim(),
        cancelMessage,
        runLimit,
        actions: {
          create: validActions.map((action: any, index: number) => ({
            action: action.action,
            params: action.params ? JSON.stringify(action.params) : null,
            order: index,
          })),
        },
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Parse params JSON for response
    const triggerWithParsedParams = {
      ...trigger,
      actions: trigger.actions.map((a: any) => ({
        ...a,
        params: a.params ? JSON.parse(a.params) : {},
      })),
    };

    // Уведомление ПОСЛЕ успешного создания в БД
    await systemNotifications.success(
      userId,
      'Триггер создан',
      `Триггер "${trigger.name}" создан для агента "${agent.name}". Действий: ${validActions.length}`
    );

    return res.status(201).json(triggerWithParsedParams);
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

    // Parse params JSON for each trigger's actions
    const triggersWithParsedParams = triggers.map((trigger: any) => ({
      ...trigger,
      actions: trigger.actions.map((a: any) => ({
        ...a,
        params: a.params ? JSON.parse(a.params) : {},
      })),
    }));

    return res.json(triggersWithParsedParams);
  } catch (error: any) {
    console.error('Error fetching triggers:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/triggers/:triggerId
 * Получить триггер по ID
 */
export const getTriggerById = async (req: AuthRequest, res: Response) => {
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

    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!trigger || trigger.agentId !== agentId) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    // Parse params JSON for response
    const triggerWithParsedParams = {
      ...trigger,
      actions: trigger.actions.map((a: any) => ({
        ...a,
        params: a.params ? JSON.parse(a.params) : {},
      })),
    };

    return res.json(triggerWithParsedParams);
  } catch (error: any) {
    console.error('Error fetching trigger:', error);
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
            params: action.params ? JSON.stringify(action.params) : null,
            order: index,
          })) || [],
        },
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Parse params JSON for response
    const triggerWithParsedParams = {
      ...trigger,
      actions: trigger.actions.map((a: any) => ({
        ...a,
        params: a.params ? JSON.parse(a.params) : {},
      })),
    };

    // Уведомление ПОСЛЕ успешного обновления в БД
    await systemNotifications.success(
      userId,
      'Триггер обновлён',
      `Триггер "${trigger.name}" сохранён. Статус: ${trigger.isActive ? 'активен' : 'неактивен'}`
    );

    return res.json(triggerWithParsedParams);
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

    const triggerName = existingTrigger.name;

    await prisma.trigger.delete({
      where: { id: triggerId },
    });

    // Уведомление ПОСЛЕ успешного удаления из БД
    await systemNotifications.info(
      userId,
      'Триггер удалён',
      `Триггер "${triggerName}" удалён`
    );

    return res.json({ message: 'Trigger deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting trigger:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
