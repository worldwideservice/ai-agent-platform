import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

// POST /api/crm/sync - Синхронизировать CRM и создать тестовые данные
export async function syncCRM(req: AuthRequest, res: Response) {
  try {
    const { agentId, crmType } = req.body;

    if (!agentId) {
      res.status(400).json({ error: 'Agent ID is required' });
      return;
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId! },
    });

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Обновляем агента - помечаем CRM как подключенную
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        crmType: crmType || 'Kommo',
        crmConnected: true,
        crmData: JSON.stringify({
          syncedAt: new Date().toISOString(),
          status: 'active'
        }),
      },
    });

    // Создаем тестовые контакты
    const testContacts = [
      {
        name: 'Иван Петров',
        phone: '+79001234567',
        email: 'ivan.petrov@example.com',
        company: 'ООО "Ромашка"',
        position: 'Директор',
        tags: JSON.stringify(['vip', 'client']),
        crmId: 'contact_1',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
      {
        name: 'Мария Сидорова',
        phone: '+79007654321',
        email: 'maria.sidorova@example.com',
        company: 'ИП Сидорова',
        position: 'Индивидуальный предприниматель',
        tags: JSON.stringify(['prospect']),
        crmId: 'contact_2',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
      {
        name: 'Алексей Козлов',
        phone: '+79009876543',
        email: 'alexey.kozlov@example.com',
        company: 'АО "Техносервис"',
        position: 'Менеджер по закупкам',
        tags: JSON.stringify(['b2b']),
        crmId: 'contact_3',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
    ];

    const createdContacts = [];
    for (const contactData of testContacts) {
      // Проверяем, не существует ли уже контакт с таким crmId
      const existing = await prisma.contact.findFirst({
        where: { crmId: contactData.crmId, userId: req.userId! },
      });

      if (!existing) {
        const contact = await prisma.contact.create({ data: contactData });
        createdContacts.push(contact);
      } else {
        createdContacts.push(existing);
      }
    }

    // Создаем тестовые сделки
    const testDeals = [
      {
        name: 'Поставка оборудования',
        price: 150000,
        currency: 'RUB',
        status: 'open',
        stage: 'negotiation',
        pipelineId: 'default_sales',
        pipelineName: 'Продажи',
        contactId: createdContacts[0].id,
        tags: JSON.stringify(['equipment', 'b2b']),
        crmId: 'deal_1',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
      {
        name: 'Консультационные услуги',
        price: 50000,
        currency: 'RUB',
        status: 'open',
        stage: 'proposal',
        pipelineId: 'default_sales',
        pipelineName: 'Продажи',
        contactId: createdContacts[1].id,
        tags: JSON.stringify(['consulting']),
        crmId: 'deal_2',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
      {
        name: 'Техническое обслуживание',
        price: 80000,
        currency: 'RUB',
        status: 'open',
        stage: 'qualification',
        pipelineId: 'default_support',
        pipelineName: 'Поддержка',
        contactId: createdContacts[2].id,
        tags: JSON.stringify(['service', 'recurring']),
        crmId: 'deal_3',
        crmType: crmType || 'Kommo',
        userId: req.userId!,
      },
    ];

    const createdDeals = [];
    for (const dealData of testDeals) {
      // Проверяем, не существует ли уже сделка с таким crmId
      const existing = await prisma.deal.findFirst({
        where: { crmId: dealData.crmId, userId: req.userId! },
      });

      if (!existing) {
        const deal = await prisma.deal.create({ data: dealData });
        createdDeals.push(deal);
      } else {
        createdDeals.push(existing);
      }
    }

    res.json({
      message: 'CRM синхронизирована успешно',
      contacts: createdContacts.length,
      deals: createdDeals.length,
      crmType: crmType || 'Kommo',
    });
  } catch (error) {
    console.error('Error syncing CRM:', error);
    res.status(500).json({ error: 'Failed to sync CRM' });
  }
}
