import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { Pool } from 'pg';
import { fetchPipelines } from '../services/kommo.service';

// PostgreSQL pool for Kommo service
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mock data - в будущем заменим на реальные данные из Kommo API
const MOCK_PIPELINES = [
  {
    id: 'pipeline_1',
    name: 'Воронка 1',
    stages: [
      { id: 'stage_1_1', name: 'Этап 1' },
      { id: 'stage_1_2', name: 'Этап 2' },
      { id: 'stage_1_3', name: 'Этап 3' },
      { id: 'stage_1_4', name: 'Этап 4' },
      { id: 'stage_1_5', name: 'Этап 5' }
    ]
  },
  {
    id: 'pipeline_2',
    name: 'Воронка 2',
    stages: [
      { id: 'stage_2_1', name: 'Этап 1' },
      { id: 'stage_2_2', name: 'Этап 2' },
      { id: 'stage_2_3', name: 'Этап 3' },
      { id: 'stage_2_4', name: 'Этап 4' }
    ]
  },
  {
    id: 'pipeline_3',
    name: 'Воронка 3',
    stages: [
      { id: 'stage_3_1', name: 'Этап 1' },
      { id: 'stage_3_2', name: 'Этап 2' },
      { id: 'stage_3_3', name: 'Этап 3' }
    ]
  },
  {
    id: 'pipeline_4',
    name: 'Воронка 4',
    stages: [
      { id: 'stage_4_1', name: 'Этап 1' },
      { id: 'stage_4_2', name: 'Этап 2' },
      { id: 'stage_4_3', name: 'Этап 3' },
      { id: 'stage_4_4', name: 'Этап 4' },
      { id: 'stage_4_5', name: 'Этап 5' },
      { id: 'stage_4_6', name: 'Этап 6' }
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

    let pipelines = MOCK_PIPELINES;

    // Проверяем есть ли подключенная интеграция Kommo
    const kommoIntegration = await prisma.integration.findFirst({
      where: {
        agentId: agentId,
        integrationType: 'kommo',
        isConnected: true,
      },
    });

    // Если Kommo интеграция подключена, получаем реальные воронки
    if (kommoIntegration) {
      try {
        const pipelinesResponse = await fetchPipelines(pool, kommoIntegration.id);

        // Трансформируем Kommo воронки в наш формат
        pipelines = pipelinesResponse._embedded.pipelines.map((kp) => ({
          id: `pipeline_${kp.id}`,
          name: kp.name,
          stages: kp._embedded.statuses.map((ks) => ({
            id: `stage_${kp.id}_${ks.id}`,
            name: ks.name,
          })),
        }));

        console.log(`Fetched ${pipelines.length} pipelines from Kommo for agent ${agentId}`);
      } catch (error) {
        console.error('Error fetching Kommo pipelines:', error);
        // Используем моковые данные при ошибке
        console.log('Falling back to mock pipelines');
      }
    }

    // Подготавливаем данные CRM для сохранения
    const crmData = {
      syncedAt: new Date().toISOString(),
      status: 'active',
      pipelines: pipelines,
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
      pipelines: pipelines.length,
      channels: MOCK_CHANNELS.length,
      crmType: crmType || 'Kommo',
      crmData: crmData,
      isRealData: !!kommoIntegration, // Указывает использовали ли реальные данные Kommo
    });
  } catch (error) {
    console.error('Error syncing CRM:', error);
    res.status(500).json({ error: 'Failed to sync CRM' });
  }
}
