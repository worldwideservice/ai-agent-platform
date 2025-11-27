import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';

/**
 * POST /api/agents/:agentId/chains
 * Создать новую цепочку
 */
export const createChain = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const {
      name,
      isActive,
      conditionType,
      conditionStages,
      conditionExclude,
      runLimit,
      steps,
      schedule,
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

    // Создаем цепочку со всеми связанными данными
    const chain = await prisma.chain.create({
      data: {
        agentId,
        name,
        isActive: isActive ?? true,
        conditionType,
        conditionExclude,
        runLimit,
        // Создаем условия для specific stages
        conditions: {
          create:
            conditionType === 'specific' && conditionStages
              ? conditionStages.map((stageId: string) => ({ stageId }))
              : [],
        },
        // Создаем шаги с действиями
        steps: {
          create: steps?.map((step: any, stepIndex: number) => ({
            stepOrder: stepIndex + 1,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit,
            actions: {
              create: step.actions?.map((action: any, actionIndex: number) => ({
                actionType: action.actionType || action.type,
                instruction: action.instruction || '',
                params: action.params || {},
                actionOrder: actionIndex,
              })) || [],
            },
          })) || [],
        },
        // Создаем расписание
        schedules: {
          create: schedule?.map((day: any) => ({
            dayOfWeek: getDayOfWeekNumber(day.day),
            enabled: day.enabled,
            startTime: day.start,
            endTime: day.end,
          })) || getDefaultSchedule(),
        },
      },
      include: {
        conditions: true,
        steps: {
          include: {
            actions: {
              orderBy: { actionOrder: 'asc' },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return res.status(201).json(chain);
  } catch (error: any) {
    console.error('Error creating chain:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/chains
 * Получить все цепочки агента
 */
export const getChains = async (req: AuthRequest, res: Response) => {
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

    const chains = await prisma.chain.findMany({
      where: { agentId },
      include: {
        conditions: true,
        steps: {
          include: {
            actions: {
              orderBy: { actionOrder: 'asc' },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(chains);
  } catch (error: any) {
    console.error('Error fetching chains:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/agents/:agentId/chains/:chainId
 * Обновить цепочку
 */
export const updateChain = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, chainId } = req.params;
    const {
      name,
      isActive,
      conditionType,
      conditionStages,
      conditionExclude,
      runLimit,
      steps,
      schedule,
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

    // Проверяем что цепочка принадлежит агенту
    const existingChain = await prisma.chain.findUnique({
      where: { id: chainId },
    });

    if (!existingChain || existingChain.agentId !== agentId) {
      return res.status(404).json({ message: 'Chain not found' });
    }

    // Удаляем старые связанные данные
    await prisma.chainCondition.deleteMany({ where: { chainId } });
    await prisma.chainStepAction.deleteMany({
      where: { step: { chainId } },
    });
    await prisma.chainStep.deleteMany({ where: { chainId } });
    await prisma.chainSchedule.deleteMany({ where: { chainId } });

    // Обновляем цепочку и создаем новые связанные данные
    const chain = await prisma.chain.update({
      where: { id: chainId },
      data: {
        name,
        isActive,
        conditionType,
        conditionExclude,
        runLimit,
        conditions: {
          create:
            conditionType === 'specific' && conditionStages
              ? conditionStages.map((stageId: string) => ({ stageId }))
              : [],
        },
        steps: {
          create: steps?.map((step: any, stepIndex: number) => ({
            stepOrder: stepIndex + 1,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit,
            actions: {
              create: step.actions?.map((action: any, actionIndex: number) => ({
                actionType: action.actionType || action.type,
                instruction: action.instruction || '',
                params: action.params || {},
                actionOrder: actionIndex,
              })) || [],
            },
          })) || [],
        },
        schedules: {
          create: schedule?.map((day: any) => ({
            dayOfWeek: getDayOfWeekNumber(day.day),
            enabled: day.enabled,
            startTime: day.start,
            endTime: day.end,
          })) || getDefaultSchedule(),
        },
      },
      include: {
        conditions: true,
        steps: {
          include: {
            actions: {
              orderBy: { actionOrder: 'asc' },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    return res.json(chain);
  } catch (error: any) {
    console.error('Error updating chain:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/agents/:agentId/chains/:chainId
 * Удалить цепочку
 */
export const deleteChain = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, chainId } = req.params;

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

    // Проверяем что цепочка принадлежит агенту
    const existingChain = await prisma.chain.findUnique({
      where: { id: chainId },
    });

    if (!existingChain || existingChain.agentId !== agentId) {
      return res.status(404).json({ message: 'Chain not found' });
    }

    await prisma.chain.delete({
      where: { id: chainId },
    });

    return res.json({ message: 'Chain deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting chain:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

// Helper функция для преобразования названия дня в число (0-6)
function getDayOfWeekNumber(dayName: string): number {
  const days: Record<string, number> = {
    'Понедельник': 0,
    'Вторник': 1,
    'Среда': 2,
    'Четверг': 3,
    'Пятница': 4,
    'Суббота': 5,
    'Воскресенье': 6,
  };
  return days[dayName] ?? 0;
}

// Helper функция для создания расписания по умолчанию (Пн-Вс 08:00-22:00)
function getDefaultSchedule() {
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  return days.map((day, index) => ({
    dayOfWeek: index,
    enabled: true,
    startTime: '08:00',
    endTime: '22:00',
  }));
}
