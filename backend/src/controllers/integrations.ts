import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { systemNotifications } from '../services/system-notifications.service';

/**
 * Transform Kommo custom fields to CrmField format
 */
function transformCustomFieldsToCrmFields(kommoFields: any[]): any[] {
  return kommoFields.map(field => {
    let type = 'text';

    switch (field.field_type) {
      case 'numeric':
      case 'price':
        type = 'number';
        break;
      case 'date':
      case 'birthday':
        type = 'date';
        break;
      case 'checkbox':
        type = 'boolean';
        break;
      case 'select':
      case 'multiselect':
        type = 'select';
        break;
      case 'url':
        type = 'url';
        break;
      case 'text':
      case 'textarea':
      default:
        if (field.code === 'PHONE') type = 'phone';
        else if (field.code === 'EMAIL') type = 'email';
        else type = 'text';
        break;
    }

    return {
      id: `field_${field.id}`,
      key: field.code || `custom_field_${field.id}`,
      label: field.name,
      type
    };
  });
}

/**
 * Build CRM actions based on Kommo data
 */
function buildCrmActions(users: any[], taskTypes: any[], pipelines: any[]): any[] {
  const actions = [
    { id: 'send_message', name: 'Отправить сообщение', type: 'basic' },
    { id: 'generate_message', name: 'Сгенерировать ответ ИИ', type: 'basic' },
    { id: 'add_note', name: 'Добавить примечание', type: 'basic' },
    { id: 'assign_tag', name: 'Добавить тег', type: 'basic' },
    { id: 'change_budget', name: 'Изменить бюджет сделки', type: 'basic' },
  ];

  // Добавляем действие "Изменить ответственного" только если есть пользователи
  if (users && users.length > 0) {
    actions.push({
      id: 'assign_user',
      name: 'Изменить ответственного',
      type: 'user_assignment',
      options: users
        .filter((u: any) => u?.rights?.is_active)
        .map((u: any) => ({ id: u.id.toString(), name: u.name, email: u.email }))
    });
  }

  // Добавляем действия для изменения этапов воронок
  if (pipelines && pipelines.length > 0) {
    pipelines.forEach((pipeline: any) => {
      if (pipeline && pipeline.stages) {
        actions.push({
          id: `change_stage_${pipeline.id}`,
          name: `Изменить этап в "${pipeline.name}"`,
          type: 'stage_change',
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          options: pipeline.stages.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            color: stage.color
          }))
        });
      }
    });
  }

  // Добавляем действие "Создать задачу" только если есть типы задач
  if (taskTypes && taskTypes.length > 0) {
    actions.push({
      id: 'create_task',
      name: 'Создать задачу',
      type: 'task_creation',
      options: taskTypes.map((tt: any) => ({
        id: tt.id.toString(),
        name: tt.name,
        code: tt.code,
        color: tt.color
      }))
    });
  }

  return actions;
}

/**
 * POST /api/agents/:agentId/integrations
 * Создать или обновить интеграцию
 */
export const upsertIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { integrationType, isActive, isConnected, settings } = req.body;

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

    // Проверяем есть ли уже такая интеграция
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        agentId,
        integrationType,
      },
    });

    let integration;

    if (existingIntegration) {
      // Обновляем существующую
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          isActive,
          isConnected,
          connectedAt: isConnected ? new Date() : existingIntegration.connectedAt,
          lastSynced: isConnected ? new Date() : existingIntegration.lastSynced,
          settings: settings ? JSON.stringify(settings) : existingIntegration.settings,
        },
      });
    } else {
      // Создаем новую
      integration = await prisma.integration.create({
        data: {
          agentId,
          integrationType,
          isActive,
          isConnected,
          connectedAt: isConnected ? new Date() : null,
          lastSynced: isConnected ? new Date() : null,
          settings: settings ? JSON.stringify(settings) : null,
        },
      });
    }

    return res.json(integration);
  } catch (error: any) {
    console.error('Error upserting integration:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/integrations
 * Получить все интеграции агента
 */
export const getIntegrations = async (req: AuthRequest, res: Response) => {
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

    const integrations = await prisma.integration.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
    });

    // Парсим JSON настройки (проверяем, является ли это уже объектом)
    const integrationsWithParsedSettings = integrations.map((integration: any) => ({
      ...integration,
      settings: integration.settings
        ? (typeof integration.settings === 'string'
            ? JSON.parse(integration.settings)
            : integration.settings)
        : null,
    }));

    return res.json(integrationsWithParsedSettings);
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/integrations/kommo/stats
 * Получить статистику синхронизации Kommo
 */
export const getKommoSyncStats = async (req: AuthRequest, res: Response) => {
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

    // Находим интеграцию Kommo
    const kommoIntegration = await prisma.integration.findFirst({
      where: {
        agentId,
        integrationType: 'kommo',
      },
    });

    if (!kommoIntegration) {
      return res.json({
        pipelines: 0,
        stages: 0,
        users: 0,
        lastSync: null,
      });
    }

    // Парсим settings для получения статистики
    let settings: any = {};
    if (kommoIntegration.settings) {
      try {
        settings = typeof kommoIntegration.settings === 'string'
          ? JSON.parse(kommoIntegration.settings)
          : kommoIntegration.settings;
      } catch (e) {
        settings = {};
      }
    }

    // Получаем количество этапов из crmData агента
    let stagesCount = 0;
    if (agent.crmData) {
      try {
        const crmData = typeof agent.crmData === 'string'
          ? JSON.parse(agent.crmData)
          : agent.crmData;
        if (crmData?.pipelines) {
          stagesCount = crmData.pipelines.reduce((acc: number, p: any) => acc + (p.stages?.length || 0), 0);
        }
      } catch (e) {
        stagesCount = 0;
      }
    }

    return res.json({
      pipelines: settings.pipelines || 0,
      stages: stagesCount,
      users: settings.users || 0,
      dealFields: settings.dealFields || 0,
      contactFields: settings.contactFields || 0,
      channels: settings.channels || 0,
      lastSync: kommoIntegration.lastSynced,
    });
  } catch (error: any) {
    console.error('Error getting Kommo sync stats:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/integrations/kommo/sync
 * Синхронизировать с Kommo CRM
 */
export const syncKommo = async (req: AuthRequest, res: Response) => {
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

    // Находим интеграцию Kommo
    const kommoIntegration = await prisma.integration.findFirst({
      where: {
        agentId,
        integrationType: 'kommo',
      },
    });

    if (!kommoIntegration) {
      return res.status(404).json({ message: 'Kommo integration not found' });
    }

    if (!kommoIntegration.isConnected) {
      return res.status(400).json({ message: 'Kommo integration is not connected' });
    }

    // Импортируем Kommo service
    const {
      fetchPipelines,
      fetchLeadsCustomFields,
      fetchContactsCustomFields,
      fetchUsers,
      fetchTaskTypes,
      fetchSalesbots,
      fetchSources,
    } = await import('../services/kommo.service');

    try {
      console.log('🚀 Starting optimized Kommo sync...');
      const startTime = Date.now();

      // Kommo API rate limit: 7 requests/second
      // Split into two batches to avoid 429 errors

      // Batch 1: First 4 requests
      const [
        pipelinesData,
        leadsCustomFieldsData,
        contactsCustomFieldsData,
        usersData,
      ] = await Promise.all([
        fetchPipelines(kommoIntegration.id),
        fetchLeadsCustomFields(kommoIntegration.id),
        fetchContactsCustomFields(kommoIntegration.id),
        fetchUsers(kommoIntegration.id),
      ]);

      // Small delay to respect rate limit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Batch 2: Remaining 3 requests
      const [
        taskTypesData,
        salesbotsData,
        sourcesData,
      ] = await Promise.all([
        fetchTaskTypes(kommoIntegration.id),
        fetchSalesbots(kommoIntegration.id),
        fetchSources(kommoIntegration.id),
      ]);

      console.log(`⚡ Data loaded in ${Date.now() - startTime}ms`);
      console.log(`📊 Raw data: pipelines=${pipelinesData?._embedded?.pipelines?.length || 0}, users=${usersData?._embedded?.users?.length || 0}, salesbots=${salesbotsData?._embedded?.bots?.length || 0}`);

      // ТРАНСФОРМАЦИЯ ДАННЫХ

      // 1. Pipelines (воронки с этапами)
      const pipelines = pipelinesData?._embedded?.pipelines || [];
      const pipelinesFormatted = pipelines.map((pipeline: any) => ({
        id: pipeline.id.toString(),
        name: pipeline.name,
        stages: (pipeline._embedded?.statuses || []).map((status: any) => ({
          id: status.id.toString(),
          name: status.name,
          sort: status.sort,
          color: status.color,
        })),
      }));

      // 2. Deal Fields (стандартные + custom)
      const standardDealFields = [
        { id: 'deal_name', key: 'name', label: 'Название сделки', type: 'text' },
        { id: 'deal_price', key: 'price', label: 'Бюджет', type: 'number' },
        { id: 'deal_status', key: 'status_id', label: 'Этап сделки', type: 'select' },
        { id: 'deal_responsible', key: 'responsible_user_id', label: 'Ответственный', type: 'select' },
        { id: 'deal_created', key: 'created_at', label: 'Дата создания', type: 'date' },
        { id: 'deal_updated', key: 'updated_at', label: 'Дата изменения', type: 'date' },
      ];
      const dealCustomFields = transformCustomFieldsToCrmFields(
        leadsCustomFieldsData?._embedded?.custom_fields || []
      );
      const dealFields = [...standardDealFields, ...dealCustomFields];

      // 3. Contact Fields (стандартные + custom)
      const standardContactFields = [
        { id: 'contact_name', key: 'name', label: 'Имя контакта', type: 'text' },
        { id: 'contact_first_name', key: 'first_name', label: 'Имя', type: 'text' },
        { id: 'contact_last_name', key: 'last_name', label: 'Фамилия', type: 'text' },
        { id: 'contact_responsible', key: 'responsible_user_id', label: 'Ответственный', type: 'select' },
        { id: 'contact_created', key: 'created_at', label: 'Дата создания', type: 'date' },
      ];
      const contactCustomFields = transformCustomFieldsToCrmFields(
        contactsCustomFieldsData?._embedded?.custom_fields || []
      );
      const contactFields = [...standardContactFields, ...contactCustomFields];

      // 4. CRM Actions (на основе users, taskTypes, pipelines)
      const actions = buildCrmActions(
        usersData?._embedded?.users || [],
        taskTypesData?._embedded?.task_types || [],
        pipelinesFormatted
      );

      // 5. Channels (из /api/v4/sources)
      const rawSources = sourcesData?._embedded?.sources || [];
      console.log(`📡 Raw sources from API: ${rawSources.length}`);

      // Преобразуем источники в каналы
      const channels = rawSources.map((source: any) => ({
        id: source.id.toString(),
        name: source.name,
        externalId: source.external_id,
        pipelineId: source.pipeline_id?.toString(),
        type: source.origin_code || source.type || 'unknown',
        services: source.services || [],
      }));

      // Если API не вернул каналы - добавляем fallback
      if (channels.length === 0) {
        console.log('⚠️ No sources from API, using default channels');
        channels.push(
          { id: 'whatsapp', name: 'WhatsApp', type: 'whatsapp' },
          { id: 'telegram', name: 'Telegram', type: 'telegram' },
          { id: 'instagram', name: 'Instagram', type: 'instagram' },
          { id: 'facebook', name: 'Facebook Messenger', type: 'facebook' },
          { id: 'email', name: 'Email', type: 'email' },
        );
      }

      console.log(`📡 Channels: ${channels.length}`, channels.map((c: any) => c.name));

      // 6. Users (для действий типа "Изменить ответственного")
      const rawUsers = usersData?._embedded?.users || [];
      const users = rawUsers
        .filter((u: any) => u?.rights?.is_active)
        .map((u: any) => ({
          id: u.id.toString(),
          name: u.name,
          email: u.email,
        }));

      // 7. Salesbots (для действия "Запустить Salesbot")
      const rawSalesbots = salesbotsData?._embedded?.bots || [];
      const salesbots = rawSalesbots.map((bot: any) => ({
        id: bot.id.toString(),
        name: bot.name,
        isActive: bot.is_active,
      }));

      // СОХРАНЕНИЕ В БД
      const crmData = {
        pipelines: pipelinesFormatted,
        dealFields,
        contactFields,
        channels,
        actions,
        users,
        salesbots,
      };

      // Обновляем интеграцию
      await prisma.integration.update({
        where: { id: kommoIntegration.id },
        data: {
          lastSynced: new Date(),
          settings: JSON.stringify({
            pipelines: pipelinesFormatted.length,
            dealFields: dealFields.length,
            contactFields: contactFields.length,
            channels: channels.length,
            actions: actions.length,
            users: users.length,
            salesbots: salesbots.length,
          }),
        },
      });

      // ВАЖНО: Обновляем agent.crmData чтобы данные отобразились в UI
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          crmData: JSON.stringify(crmData),
          crmConnected: true,
          crmType: 'kommo',
        },
      });

      const totalTime = Date.now() - startTime;
      console.log(`✅ Kommo sync completed in ${totalTime}ms`);

      // Уведомление ПОСЛЕ успешной синхронизации
      await systemNotifications.success(
        userId,
        'Kommo CRM синхронизирован',
        `Данные CRM загружены: ${pipelinesFormatted.length} воронок, ${users.length} пользователей, ${dealFields.length} полей сделок`
      );

      return res.json({
        success: true,
        message: 'Синхронизация завершена успешно',
        lastSynced: new Date(),
        stats: {
          pipelines: pipelinesFormatted.length,
          dealFields: dealFields.length,
          contactFields: contactFields.length,
          users: users.length,
          salesbots: salesbots.length,
          syncTime: `${totalTime}ms`,
        },
      });
    } catch (syncError: any) {
      throw syncError;
    }
  } catch (error: any) {
    console.error('Error syncing Kommo:', error);

    // Уведомляем пользователя об ошибке интеграции
    if (userId) {
      await systemNotifications.integrationError(userId, 'Kommo CRM', error.message || 'Неизвестная ошибка');
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
