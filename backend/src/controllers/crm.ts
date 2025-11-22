import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

// Mock data - в будущем заменим на реальные данные из Kommo API
const MOCK_PIPELINES = [
  {
    id: 'default_sales',
    name: 'Продажи',
    stages: [
      { id: 'new', name: 'Новый' },
      { id: 'contact', name: 'Первичный контакт' },
      { id: 'qualification', name: 'Квалификация' },
      { id: 'proposal', name: 'Предложение' },
      { id: 'negotiation', name: 'Переговоры' },
      { id: 'closed_won', name: 'Успешно завершено' },
      { id: 'closed_lost', name: 'Отказ' }
    ]
  },
  {
    id: 'default_support',
    name: 'Поддержка',
    stages: [
      { id: 'new_request', name: 'Новый запрос' },
      { id: 'in_progress', name: 'В работе' },
      { id: 'waiting_response', name: 'Ожидание ответа' },
      { id: 'resolved', name: 'Решено' },
      { id: 'closed', name: 'Закрыто' }
    ]
  },
  {
    id: 'default_onboarding',
    name: 'Онбординг',
    stages: [
      { id: 'new_client', name: 'Новый клиент' },
      { id: 'documentation', name: 'Документы' },
      { id: 'setup', name: 'Настройка' },
      { id: 'training', name: 'Обучение' },
      { id: 'active', name: 'Активен' }
    ]
  }
];

const MOCK_CHANNELS = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook Messenger' },
  { id: 'email', name: 'Email' },
  { id: 'viber', name: 'Viber' },
];

const DEAL_FIELDS = [
  { id: 'deal_stage', key: 'stage_id', label: 'Этап сделки', type: 'select' },
  { id: 'deal_name', key: 'name', label: 'Название сделки', type: 'text' },
  { id: 'deal_budget', key: 'price', label: 'Бюджет', type: 'number' },
  { id: 'deal_responsible', key: 'responsible_user_id', label: 'Ответственный пользователь', type: 'select' },
];

const CONTACT_FIELDS = [
  { id: 'contact_name', key: 'name', label: 'Имя Контакта', type: 'text' },
  { id: 'contact_phone', key: 'phone', label: 'Телефон', type: 'phone' },
  { id: 'contact_email', key: 'email', label: 'Email', type: 'email' },
  { id: 'contact_company', key: 'company', label: 'Компания', type: 'text' },
];

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

    // Подготавливаем данные CRM для сохранения
    const crmData = {
      syncedAt: new Date().toISOString(),
      status: 'active',
      pipelines: MOCK_PIPELINES,
      channels: MOCK_CHANNELS,
      dealFields: DEAL_FIELDS,
      contactFields: CONTACT_FIELDS,
    };

    // Обновляем агента - помечаем CRM как подключенную
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        crmType: crmType || 'Kommo',
        crmConnected: true,
        crmData: JSON.stringify(crmData),
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
      pipelines: MOCK_PIPELINES.length,
      channels: MOCK_CHANNELS.length,
      crmType: crmType || 'Kommo',
      crmData: crmData,
    });
  } catch (error) {
    console.error('Error syncing CRM:', error);
    res.status(500).json({ error: 'Failed to sync CRM' });
  }
}
