import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

// GET /api/deals - Получить все сделки пользователя
export async function getAllDeals(req: AuthRequest, res: Response) {
  try {
    const deals = await prisma.deal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { contact: true },
    });

    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
}

// GET /api/deals/:id - Получить сделку по ID
export async function getDealById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: {
        id,
        userId: req.userId!,
      },
      include: { contact: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
}

// POST /api/deals - Создать новую сделку
export async function createDeal(req: AuthRequest, res: Response) {
  try {
    const data = req.body;

    // Валидация
    if (!data.name || data.name.trim() === '') {
      res.status(400).json({ error: 'Deal name is required' });
      return;
    }

    const deal = await prisma.deal.create({
      data: {
        name: data.name.trim(),
        price: data.price || 0,
        currency: data.currency || 'RUB',
        status: data.status,
        stage: data.stage,
        pipelineId: data.pipelineId,
        pipelineName: data.pipelineName,
        responsibleUserId: data.responsibleUserId,
        contactId: data.contactId,
        tags: data.tags,
        customFields: data.customFields,
        crmId: data.crmId,
        crmType: data.crmType,
        closedAt: data.closedAt,
        userId: req.userId!,
      },
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
}

// PUT /api/deals/:id - Обновить сделку
export async function updateDeal(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    // Проверяем что сделка принадлежит пользователю
    const existingDeal = await prisma.deal.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingDeal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        currency: data.currency,
        status: data.status,
        stage: data.stage,
        pipelineId: data.pipelineId,
        pipelineName: data.pipelineName,
        contactId: data.contactId,
        tags: data.tags,
        customFields: data.customFields,
        closedAt: data.closedAt,
      },
    });

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
}

// DELETE /api/deals/:id - Удалить сделку
export async function deleteDeal(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Проверяем что сделка принадлежит пользователю
    const existingDeal = await prisma.deal.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingDeal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    await prisma.deal.delete({
      where: { id },
    });

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
}
