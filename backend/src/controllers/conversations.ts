/**
 * Conversations Controller
 * Управление тестовыми разговорами с агентами
 */

import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * GET /api/conversations
 * Получить все разговоры пользователя
 */
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { agentId } = req.query;

    const conversations = await prisma.testConversation.findMany({
      where: {
        userId,
        ...(agentId ? { agentId: agentId as string } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Трансформируем данные для фронтенда
    const result = conversations.map((conv: any) => ({
      id: conv.id,
      agentId: conv.agentId,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.messages[0]?.content?.substring(0, 100) || null,
      messageCount: conv.messages.length,
    }));

    res.json({ conversations: result });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Не удалось получить разговоры' });
  }
}

/**
 * POST /api/conversations
 * Создать новый разговор
 */
export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { agentId, title } = req.body;

    if (!agentId) {
      res.status(400).json({ error: 'agentId обязателен' });
      return;
    }

    const conversation = await prisma.testConversation.create({
      data: {
        userId,
        agentId,
        title: title || 'Новый разговор',
      },
    });

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Не удалось создать разговор' });
  }
}

/**
 * GET /api/conversations/:id
 * Получить разговор с сообщениями
 */
export async function getConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const conversation = await prisma.testConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Разговор не найден' });
      return;
    }

    // Парсим sources в каждом сообщении
    const messagesWithSources = conversation.messages.map((msg: any) => ({
      ...msg,
      sources: msg.sources ? JSON.parse(msg.sources) : null,
    }));

    res.json({
      conversation: {
        ...conversation,
        messages: messagesWithSources,
      },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Не удалось получить разговор' });
  }
}

/**
 * PUT /api/conversations/:id
 * Обновить название разговора
 */
export async function updateConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    const conversation = await prisma.testConversation.updateMany({
      where: { id, userId },
      data: { title },
    });

    if (conversation.count === 0) {
      res.status(404).json({ error: 'Разговор не найден' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Не удалось обновить разговор' });
  }
}

/**
 * DELETE /api/conversations/:id
 * Удалить разговор
 */
export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const conversation = await prisma.testConversation.deleteMany({
      where: { id, userId },
    });

    if (conversation.count === 0) {
      res.status(404).json({ error: 'Разговор не найден' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Не удалось удалить разговор' });
  }
}

/**
 * POST /api/conversations/:id/messages
 * Добавить сообщение в разговор (используется для сохранения истории)
 */
export async function addMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { role, content, sources } = req.body;

    // Проверяем что разговор принадлежит пользователю
    const conversation = await prisma.testConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Разговор не найден' });
      return;
    }

    const message = await prisma.testConversationMessage.create({
      data: {
        conversationId: id,
        role,
        content,
        sources: sources ? JSON.stringify(sources) : null,
      },
    });

    // Обновляем updatedAt разговора и title если это первое сообщение
    const updateData: any = { updatedAt: new Date() };

    // Если это первое сообщение пользователя, обновляем title
    if (role === 'user') {
      const messageCount = await prisma.testConversationMessage.count({
        where: { conversationId: id, role: 'user' },
      });

      if (messageCount === 1) {
        // Это первое сообщение пользователя
        updateData.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      }
    }

    await prisma.testConversation.update({
      where: { id },
      data: updateData,
    });

    res.status(201).json({
      message: {
        ...message,
        sources: sources || null,
      },
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Не удалось добавить сообщение' });
  }
}
