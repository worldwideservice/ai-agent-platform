import { Response } from 'express';
import { AuthRequest, CreateAgentDto, UpdateAgentDto } from '../types';
import { prisma } from '../config/database';

// GET /api/agents - Получить все агенты пользователя
export async function getAllAgents(req: AuthRequest, res: Response) {
  try {
    const agents = await prisma.agent.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
}

// GET /api/agents/:id - Получить агента по ID
export async function getAgentById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const agent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.userId!,
      },
    });

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
}

// POST /api/agents - Создать нового агента
export async function createAgent(req: AuthRequest, res: Response) {
  try {
    const data: CreateAgentDto = req.body;

    // Валидация
    if (!data.name || data.name.trim() === '') {
      res.status(400).json({ error: 'Agent name is required' });
      return;
    }

    const agent = await prisma.agent.create({
      data: {
        name: data.name.trim(),
        model: data.model || 'Google Gemini 2.5 Flash',
        systemInstructions: data.systemInstructions,
        isActive: data.isActive || false,
        userId: req.userId!,
      },
    });

    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
}

// PUT /api/agents/:id - Обновить агента
export async function updateAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data: UpdateAgentDto = req.body;

    // Проверяем что агент принадлежит пользователю
    const existingAgent = await prisma.agent.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingAgent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Обновляем только предоставленные поля
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.model !== undefined) updateData.model = data.model;
    if (data.systemInstructions !== undefined) updateData.systemInstructions = data.systemInstructions;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.checkBeforeSend !== undefined) updateData.checkBeforeSend = data.checkBeforeSend;
    if (data.pipelineSettings !== undefined) updateData.pipelineSettings = data.pipelineSettings;
    if (data.channelSettings !== undefined) updateData.channelSettings = data.channelSettings;
    if (data.kbSettings !== undefined) updateData.kbSettings = data.kbSettings;
    if (data.crmData !== undefined) updateData.crmData = data.crmData;

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
}

// DELETE /api/agents/:id - Удалить агента
export async function deleteAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Проверяем что агент принадлежит пользователю
    const existingAgent = await prisma.agent.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingAgent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    await prisma.agent.delete({
      where: { id },
    });

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
}

// PATCH /api/agents/:id/toggle - Переключить статус активности
export async function toggleAgentStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Проверяем что агент принадлежит пользователю
    const existingAgent = await prisma.agent.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingAgent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: { isActive: !existingAgent.isActive },
    });

    res.json(agent);
  } catch (error) {
    console.error('Error toggling agent status:', error);
    res.status(500).json({ error: 'Failed to toggle agent status' });
  }
}
