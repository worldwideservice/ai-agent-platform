import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import {
  pauseAgentForLead,
  resumeAgentForLead,
  getAgentPauseStatus,
  checkAndResumeIfExpired,
} from '../services/conversational-agent.service';

/**
 * POST /api/test/simulate-employee-reply
 * Симулирует ответ сотрудника - ставит агента на паузу для указанного лида
 */
export async function simulateEmployeeReply(req: AuthRequest, res: Response) {
  try {
    const { agentId, leadId = 12345 } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId! },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем интеграцию агента (или создаём тестовую)
    let integration = await prisma.integration.findFirst({
      where: { agentId },
    });

    if (!integration) {
      // Создаём тестовую интеграцию
      integration = await prisma.integration.create({
        data: {
          agentId,
          integrationType: 'kommo_test',
          isActive: true,
          isConnected: true,
          settings: { test: true },
        },
      });
      console.log('🧪 Created test integration:', integration.id);
    }

    // Симулируем ответ сотрудника (ID сотрудника = 999 для теста)
    await pauseAgentForLead(integration.id, leadId, agentId, 999);

    console.log(`🧪 TEST: Simulated employee reply for agent ${agentId}, lead ${leadId}`);

    return res.json({
      success: true,
      message: `Агент поставлен на паузу для лида ${leadId}`,
      data: {
        agentId,
        leadId,
        integrationId: integration.id,
        pausedAt: new Date().toISOString(),
        pausedByUserId: 999,
      },
    });
  } catch (error: any) {
    console.error('Test simulate employee reply error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/test/simulate-client-message
 * Симулирует сообщение клиента - проверяет может ли агент ответить
 */
export async function simulateClientMessage(req: AuthRequest, res: Response) {
  try {
    const { agentId, leadId = 12345 } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId! },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем интеграцию
    const integration = await prisma.integration.findFirst({
      where: { agentId },
    });

    if (!integration) {
      return res.json({
        success: true,
        canRespond: true,
        message: 'Нет интеграции - агент может отвечать',
        pauseStatus: { paused: false },
      });
    }

    // Проверяем может ли агент ответить
    const canRespond = await checkAndResumeIfExpired(integration.id, leadId, req.userId!);
    const pauseStatus = await getAgentPauseStatus(integration.id, leadId);

    console.log(`🧪 TEST: Client message check - canRespond: ${canRespond}`);

    return res.json({
      success: true,
      canRespond,
      message: canRespond
        ? 'Агент может отвечать'
        : 'Агент на паузе - не отвечает',
      pauseStatus,
    });
  } catch (error: any) {
    console.error('Test simulate client message error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/test/agent-status/:agentId
 * Получить статус паузы агента для тестового лида
 */
export async function getTestAgentStatus(req: AuthRequest, res: Response) {
  try {
    const { agentId } = req.params;
    const leadId = parseInt(req.query.leadId as string) || 12345;

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId! },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем интеграцию
    const integration = await prisma.integration.findFirst({
      where: { agentId },
    });

    if (!integration) {
      return res.json({
        agentId,
        leadId,
        paused: false,
        message: 'Нет интеграции',
      });
    }

    const pauseStatus = await getAgentPauseStatus(integration.id, leadId);

    // Получаем настройки пользователя
    const userSettings = await prisma.userSettings.findUnique({
      where: { user_id: req.userId! },
    });

    return res.json({
      agentId,
      leadId,
      integrationId: integration.id,
      ...pauseStatus,
      settings: {
        stopOnReply: userSettings?.stopOnReply ?? false,
        resumeTime: userSettings?.resumeTime ?? 30,
        resumeUnit: userSettings?.resumeUnit ?? 'дней',
      },
    });
  } catch (error: any) {
    console.error('Test get agent status error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/test/resume-agent
 * Принудительно снять паузу с агента
 */
export async function forceResumeAgent(req: AuthRequest, res: Response) {
  try {
    const { agentId, leadId = 12345 } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId! },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем интеграцию
    const integration = await prisma.integration.findFirst({
      where: { agentId },
    });

    if (!integration) {
      return res.status(400).json({ error: 'No integration found' });
    }

    await resumeAgentForLead(integration.id, leadId);

    console.log(`🧪 TEST: Force resumed agent ${agentId} for lead ${leadId}`);

    return res.json({
      success: true,
      message: `Агент возобновлён для лида ${leadId}`,
    });
  } catch (error: any) {
    console.error('Test force resume agent error:', error);
    return res.status(500).json({ error: error.message });
  }
}
