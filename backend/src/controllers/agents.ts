import { Response } from 'express';
import { AuthRequest, CreateAgentDto, UpdateAgentDto } from '../types';
import { prisma } from '../config/database';
import { systemNotifications } from '../services/system-notifications.service';

// Helper функция для парсинга JSON полей агента
function parseAgentJson(agent: any) {
  const safeJsonParse = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      let parsed = JSON.parse(jsonString);
      // Handle double-encoded JSON (string inside string)
      // This happens when crmData was saved as JSON.stringify(JSON.stringify(data))
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // If second parse fails, return the first parsed result
        }
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return null;
    }
  };

  return {
    ...agent,
    pipelineSettings: safeJsonParse(agent.pipelineSettings),
    channelSettings: safeJsonParse(agent.channelSettings),
    kbSettings: safeJsonParse(agent.kbSettings),
    crmData: safeJsonParse(agent.crmData),
    // Конвертируем даты в ISO строки для корректного отображения на frontend
    createdAt: agent.createdAt instanceof Date ? agent.createdAt.toISOString() : agent.createdAt,
    updatedAt: agent.updatedAt instanceof Date ? agent.updatedAt.toISOString() : agent.updatedAt,
  };
}

// GET /api/agents - Получить все агенты пользователя
export async function getAllAgents(req: AuthRequest, res: Response) {
  try {
    const agents = await prisma.agent.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    // Парсим JSON поля для каждого агента
    const parsedAgents = agents.map(parseAgentJson);
    res.json(parsedAgents);
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

    // Парсим JSON поля
    const parsedAgent = parseAgentJson(agent);
    res.json(parsedAgent);
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

    // Проверяем что пользователь существует
    const user = await prisma.user.findUnique({
      where: { id: req.userId! }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found. Please log out and log in again.' });
      return;
    }

    const agent = await prisma.agent.create({
      data: {
        name: data.name.trim(),
        model: data.model || 'Google Gemini 2.5 Flash',
        systemInstructions: data.systemInstructions,
        isActive: data.isActive || false,
        pipelineSettings: data.pipelineSettings ? JSON.stringify(data.pipelineSettings) : null,
        channelSettings: data.channelSettings ? JSON.stringify(data.channelSettings) : null,
        kbSettings: data.kbSettings ? JSON.stringify(data.kbSettings) : null,
        userId: req.userId!,
      },
    });

    // Уведомление ПОСЛЕ успешного создания в БД
    await systemNotifications.success(
      req.userId!,
      'Агент создан',
      `Агент "${agent.name}" успешно создан. Модель: ${agent.model}`
    );

    // Парсим JSON поля перед отправкой
    const parsedAgent = parseAgentJson(agent);
    res.status(201).json(parsedAgent);
  } catch (error: any) {
    console.error('Error creating agent:', error);

    // Проверяем тип ошибки
    if (error.code === '23503' && error.constraint === 'agents_user_id_fkey') {
      res.status(401).json({ error: 'User session expired. Please log out and log in again.' });
    } else {
      res.status(500).json({ error: 'Failed to create agent' });
    }
  }
}

// PUT /api/agents/:id - Обновить агента
export async function updateAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data: UpdateAgentDto = req.body;

    console.log('=== UPDATE AGENT REQUEST ===');
    console.log('Agent ID:', id);
    console.log('Request body:', JSON.stringify(data, null, 2));
    console.log('crmData in request:', data.crmData);

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

    // JSON поля нужно сериализовать в строки для SQLite
    if (data.pipelineSettings !== undefined) {
      updateData.pipelineSettings = data.pipelineSettings ? JSON.stringify(data.pipelineSettings) : null;
    }
    if (data.channelSettings !== undefined) {
      updateData.channelSettings = data.channelSettings ? JSON.stringify(data.channelSettings) : null;
    }
    if (data.kbSettings !== undefined) {
      updateData.kbSettings = data.kbSettings ? JSON.stringify(data.kbSettings) : null;
    }
    if (data.crmData !== undefined) {
      updateData.crmData = data.crmData ? JSON.stringify(data.crmData) : null;
    }

    console.log('=== DATA TO UPDATE IN DB ===');
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    console.log('crmData to save:', updateData.crmData);

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    console.log('=== UPDATED AGENT ===');
    console.log('Updated agent crmData:', agent.crmData);

    // Уведомление ПОСЛЕ успешного обновления в БД
    await systemNotifications.success(
      req.userId!,
      'Агент сохранён',
      `Настройки агента "${agent.name}" сохранены в базе данных`
    );

    // Парсим JSON поля перед отправкой клиенту
    const parsedAgent = parseAgentJson(agent);
    res.json(parsedAgent);
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

    const agentName = existingAgent.name;

    await prisma.agent.delete({
      where: { id },
    });

    // Уведомление ПОСЛЕ успешного удаления из БД
    await systemNotifications.info(
      req.userId!,
      'Агент удалён',
      `Агент "${agentName}" удалён из системы`
    );

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

    // Уведомление ПОСЛЕ успешного обновления в БД
    const newStatus = agent.isActive ? 'включен' : 'выключен';
    await systemNotifications.success(
      req.userId!,
      'Статус агента изменён',
      `Агент "${agent.name}" ${newStatus} и готов к работе`
    );

    // Парсим JSON поля перед отправкой клиенту
    const parsedAgent = parseAgentJson(agent);
    res.json(parsedAgent);
  } catch (error) {
    console.error('Error toggling agent status:', error);
    res.status(500).json({ error: 'Failed to toggle agent status' });
  }
}
