import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  storeTokens,
} from '../services/kommo.service';
import {
  evaluateTriggerConditions,
  evaluateCRMEventTriggers,
  TriggerCondition,
  CRMEventContext
} from '../services/ai-trigger.service';
import {
  fetchLeadById,
  fetchPipelines,
  fetchUsers
} from '../services/kommo.service';
import { systemNotifications } from '../services/system-notifications.service';
import { isAgentPausedForLead } from '../services/chain-executor.service';
import { enqueueWebhook, isQueueAvailable } from '../services/webhook-queue.service';

// In-memory cache for trigger execution counts per chat
// Key format: "triggerId:chatId" -> count
const triggerExecutionCounts = new Map<string, number>();

/**
 * Check if trigger has reached its run limit for a specific chat
 */
function checkRunLimit(triggerId: string, chatId: string, runLimit: number | null | undefined): boolean {
  if (!runLimit || runLimit === 0) return true; // 0 = unlimited

  const key = `${triggerId}:${chatId}`;
  const currentCount = triggerExecutionCounts.get(key) || 0;
  return currentCount < runLimit;
}

/**
 * Increment trigger execution count for a chat
 */
function incrementExecutionCount(triggerId: string, chatId: string): void {
  const key = `${triggerId}:${chatId}`;
  const currentCount = triggerExecutionCounts.get(key) || 0;
  triggerExecutionCounts.set(key, currentCount + 1);
}

/**
 * GET /api/kommo/auth
 * Initiate Kommo OAuth flow
 */
export async function initiateOAuth(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.query;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'integrationId is required',
      });
    }

    // Get base domain from environment
    const baseDomain = process.env.KOMMO_DOMAIN;
    if (!baseDomain) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'KOMMO_DOMAIN is not configured',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId as string },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate state token (use integrationId as state for simplicity)
    const state = integrationId as string;

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(baseDomain, state);

    return res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize',
    });
  } catch (error: any) {
    console.error('Error initiating OAuth:', error);
    return res.status(500).json({
      error: 'Failed to initiate OAuth',
      message: error.message,
    });
  }
}

/**
 * GET /api/kommo/callback
 * Handle OAuth callback from Kommo
 */
export async function handleOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, referer } = req.query;

    if (!code || !state || !referer) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'code, state, and referer are required',
      });
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(
      code as string,
      referer as string
    );

    // State contains integrationId
    const integrationId = state as string;

    // Store tokens in database
    await storeTokens(
      integrationId,
      tokenData.accessToken,
      tokenData.refreshToken,
      tokenData.expiresIn,
      tokenData.baseDomain
    );

    // Update integration status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        isConnected: true,
        connectedAt: new Date(),
        lastSynced: new Date(),
      },
    });

    // Redirect to success page or return success response
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kommo Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Kommo Successfully Connected!</h1>
          <p>Your Kommo CRM has been connected to your AI agent. You can now close this window and return to the app.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Try to post message to parent window if opened in popup
          if (window.opener) {
            window.opener.postMessage({ type: 'kommo_oauth_success' }, '*');
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error handling OAuth callback:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Connection Failed</h1>
          <p>${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
}

/**
 * POST /api/kommo/sync
 * Synchronize CRM data (pipelines, stages, channels) from Kommo
 */
export async function syncCRMData(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.body;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'integrationId is required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if integration is connected
    if (!integration.isConnected) {
      return res.status(400).json({
        error: 'Integration not connected',
        message: 'Please connect your Kommo account first',
      });
    }

    // Fetch all data from Kommo in parallel
    const {
      fetchPipelines,
      fetchLeadsCustomFields,
      fetchContactsCustomFields,
      fetchTaskTypes,
      fetchUsers,
      fetchSalesbots,
    } = await import('../services/kommo.service');

    console.log('📊 Fetching CRM data from Kommo...');

    const [pipelinesData, leadsFieldsData, contactsFieldsData, taskTypes, usersData, salesbotsData] =
      await Promise.all([
        fetchPipelines(integrationId),
        fetchLeadsCustomFields(integrationId),
        fetchContactsCustomFields(integrationId),
        fetchTaskTypes(integrationId),
        fetchUsers(integrationId),
        fetchSalesbots(integrationId),
      ]);

    const pipelines = pipelinesData._embedded.pipelines;
    const leadsFields = leadsFieldsData._embedded.custom_fields;
    const contactsFields = contactsFieldsData._embedded.custom_fields;
    const users = usersData._embedded.users;
    const salesbots = salesbotsData._embedded.bots || [];

    console.log(`✅ Loaded: ${pipelines.length} pipelines, ${leadsFields.length} lead fields, ${contactsFields.length} contact fields, ${taskTypes.length} task types, ${users.length} users, ${salesbots.length} salesbots`);

    // Transform pipelines data to our format
    const transformedPipelines = pipelines
      .filter((p) => !p.is_archive) // Only active pipelines
      .map((pipeline) => ({
        id: `pipeline_${pipeline.id}`,
        name: pipeline.name,
        stages: pipeline._embedded.statuses.map((status) => ({
          id: `stage_${status.id}`,
          name: status.name,
          color: status.color,
        })),
      }));

    // Transform lead custom fields to deal fields format
    const transformedDealFields = leadsFields.map((field: any) => ({
      id: field.code || `field_${field.id}`, // Use code as id for consistency
      label: field.name,
      type: field.type,
      sort: field.sort,
      is_required: field.is_required,
      enums: field.enums || [], // For select/multiselect fields
      kommoId: field.id, // Keep original Kommo ID
    }));

    // Transform contact custom fields
    const transformedContactFields = contactsFields.map((field: any) => ({
      id: field.code || `field_${field.id}`, // Use code as id for consistency
      label: field.name,
      type: field.type,
      sort: field.sort,
      is_required: field.is_required,
      enums: field.enums || [],
      kommoId: field.id, // Keep original Kommo ID
    }));

    // Transform users for "Изменить ответственного" action
    const transformedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.rights?.is_admin ? 'admin' : 'user',
    }));

    // Transform salesbots for "Запустить Salesbot" action
    const transformedSalesbots = salesbots.map((bot: any) => ({
      id: bot.id,
      name: bot.name,
      pipelineId: bot.pipeline_id,
      isActive: bot.is_active,
    }));

    // Define available actions for triggers and chains
    const availableActions = [
      {
        id: 'send_message',
        name: 'Отправить сообщение',
        description: 'Отправить заранее подготовленное сообщение',
        requiresInput: true,
        inputType: 'text',
        inputLabel: 'Текст сообщения',
      },
      {
        id: 'generate_message',
        name: 'Сгенерировать ответ ИИ',
        description: 'Сгенерировать ответ с помощью ИИ на основе инструкции',
        requiresInput: true,
        inputType: 'text',
        inputLabel: 'Инструкция для ИИ',
      },
      {
        id: 'change_stage',
        name: 'Изменить этап сделки',
        description: 'Переместить сделку на другой этап',
        requiresInput: true,
        inputType: 'select',
        inputLabel: 'Выберите этап',
        options: transformedPipelines.flatMap(pipeline =>
          pipeline.stages.map(stage => ({
            value: stage.id,
            label: `${pipeline.name} - ${stage.name}`,
          }))
        ),
      },
      {
        id: 'assign_user',
        name: 'Изменить ответственного',
        description: 'Назначить другого ответственного менеджера',
        requiresInput: true,
        inputType: 'select',
        inputLabel: 'Выберите пользователя',
        options: transformedUsers.map(user => ({
          value: user.id.toString(),
          label: user.name,
        })),
      },
      {
        id: 'create_task',
        name: 'Создать задачу',
        description: 'Создать задачу для менеджера',
        requiresInput: true,
        inputType: 'composite',
        fields: [
          {
            name: 'taskType',
            label: 'Тип задачи',
            type: 'select',
            options: taskTypes.map(type => ({
              value: type.id.toString(),
              label: type.name,
            })),
          },
          {
            name: 'text',
            label: 'Описание задачи',
            type: 'text',
          },
          {
            name: 'responsible',
            label: 'Ответственный',
            type: 'select',
            options: transformedUsers.map(user => ({
              value: user.id.toString(),
              label: user.name,
            })),
          },
        ],
      },
      {
        id: 'add_note',
        name: 'Добавить примечание',
        description: 'Добавить примечание в карточку сделки',
        requiresInput: true,
        inputType: 'text',
        inputLabel: 'Текст примечания',
      },
      {
        id: 'assign_tag',
        name: 'Добавить тег',
        description: 'Добавить тег к сделке или контакту',
        requiresInput: true,
        inputType: 'text',
        inputLabel: 'Название тега',
      },
      {
        id: 'change_budget',
        name: 'Изменить бюджет сделки',
        description: 'Обновить сумму сделки',
        requiresInput: true,
        inputType: 'number',
        inputLabel: 'Новая сумма',
      },
    ];

    // Mock channels data (Kommo doesn't have a direct channels API)
    const channels = [
      { id: 'whatsapp', name: 'WhatsApp' },
      { id: 'telegram', name: 'Telegram' },
      { id: 'email', name: 'Email' },
      { id: 'chat', name: 'Онлайн-чат' },
    ];

    // Store synced data in agent's crmData field
    const crmData = {
      pipelines: transformedPipelines,
      channels: channels,
      dealFields: transformedDealFields, // Changed from leadFields
      contactFields: transformedContactFields,
      taskTypes: taskTypes,
      users: transformedUsers,
      salesbots: transformedSalesbots,
      actions: availableActions,
      lastSynced: new Date().toISOString(),
    };

    // Update agent with synced CRM data
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        crmData: JSON.stringify(crmData),
      },
    });

    // Update integration last synced timestamp
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSynced: new Date(),
      },
    });

    // Уведомление ПОСЛЕ успешной синхронизации данных CRM
    if (req.userId) {
      const pipelinesCount = crmData?.pipelines?.length || 0;
      const usersCount = crmData?.users?.length || 0;
      await systemNotifications.success(
        req.userId,
        'Данные CRM обновлены',
        `Синхронизированы данные Kommo: ${pipelinesCount} воронок, ${usersCount} пользователей`
      );
    }

    return res.json({
      success: true,
      message: 'CRM data synchronized successfully',
      data: crmData,
    });
  } catch (error: any) {
    console.error('Error syncing CRM data:', error);

    // Уведомляем пользователя об ошибке синхронизации
    if (req.userId) {
      await systemNotifications.syncError(req.userId, 'данные Kommo CRM', error.message || 'Неизвестная ошибка');
    }

    return res.status(500).json({
      error: 'Failed to sync CRM data',
      message: error.message,
    });
  }
}

/**
 * POST /api/kommo/connect-with-token
 * Connect Kommo integration using long-lived token
 */
export async function connectWithToken(req: AuthRequest, res: Response) {
  try {
    const { integrationId, accessToken } = req.body;

    if (!integrationId || !accessToken) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'integrationId and accessToken are required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Decode JWT to get base domain and expiration
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

    // Получаем base_domain из токена или используем KOMMO_DOMAIN из .env
    let baseDomain = payload.base_domain || process.env.KOMMO_DOMAIN || 'worldwideservices.kommo.com';

    // ФИКС: Если base_domain = 'kommo.com' (без поддомена), используем конкретный поддомен из .env
    // Kommo API не работает с общим доменом kommo.com, нужен конкретный поддомен
    if (baseDomain === 'kommo.com') {
      baseDomain = process.env.KOMMO_DOMAIN || 'worldwideservices.kommo.com';
      console.log('⚠️  Токен содержит общий домен kommo.com, используем поддомен из .env:', baseDomain);
    }

    // ВАЖНО: Некоторые токены работают только с конкретным поддоменом, не с api-g.kommo.com
    // Если в токене есть account_domain или base_domain - используем его
    const apiDomain = payload.account_domain || baseDomain;
    const expiresAt = new Date(payload.exp * 1000);

    console.log('📌 Token payload:', {
      base_domain: payload.base_domain,
      api_domain: payload.api_domain,
      account_domain: payload.account_domain,
      baseDomain,
      apiDomain,
    });

    console.log('🔑 Connecting Kommo with long-lived token...');
    console.log('  Integration ID:', integrationId);
    console.log('  Base Domain:', baseDomain);
    console.log('  API Domain:', apiDomain);
    console.log('  Token expires:', expiresAt);

    // Store token in database (use same token for both access and refresh since it's long-lived)
    await prisma.kommoToken.upsert({
      where: { integrationId },
      create: {
        integrationId,
        accessToken,
        refreshToken: accessToken, // Use same token for refresh
        expiresAt,
        baseDomain,
        apiDomain,
      },
      update: {
        accessToken,
        refreshToken: accessToken,
        expiresAt,
        baseDomain,
        apiDomain,
        updatedAt: new Date(),
      },
    });

    // Update integration status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        isConnected: true,
        connectedAt: new Date(),
        lastSynced: new Date(),
      },
    });

    console.log('✅ Kommo connected successfully!');

    return res.json({
      success: true,
      message: 'Kommo connected successfully with long-lived token',
      integration: {
        id: integration.id,
        isConnected: true,
        connectedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('❌ Error connecting with token:', error);
    return res.status(500).json({
      error: 'Failed to connect with token',
      message: error.message,
    });
  }
}

// Types for webhook handling
interface TriggerWithActions {
  id: string;
  name: string;
  condition: string;
  isActive: boolean;
  cancelMessage?: string | null;
  runLimit?: number | null;
  actions: Array<{
    id: string;
    action: string;
    params: string | null;
    order: number;
  }>;
}

/**
 * Process webhook in background (async, not awaited)
 * Processes webhook for ALL integrations that have active triggers
 * Exported for use by queue worker
 */
export async function processWebhookAsync(payload: any) {
  try {
    // Extract account ID from webhook
    const accountId = payload.account?.id || payload.account_id;

    if (!accountId) {
      console.log('⚠️ No account ID in webhook payload');
      return;
    }

    // Find ALL active triggers and their agents
    const allTriggers = await prisma.trigger.findMany({
      where: { isActive: true },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
    });

    if (allTriggers.length === 0) {
      console.log('⚠️ No active triggers in system');
      return;
    }

    // Group triggers by agentId
    const triggersByAgent = new Map<string, typeof allTriggers>();
    for (const trigger of allTriggers) {
      const existing = triggersByAgent.get(trigger.agentId) || [];
      existing.push(trigger);
      triggersByAgent.set(trigger.agentId, existing);
    }

    console.log(`📋 Found ${allTriggers.length} active triggers across ${triggersByAgent.size} agents`);

    // Process for each agent that has triggers
    for (const [agentId, triggers] of triggersByAgent) {
      // Find integration for this agent
      const integration = await prisma.integration.findFirst({
        where: {
          agentId,
          integrationType: 'kommo',
          isConnected: true,
        },
      });

      if (!integration) {
        console.log(`⚠️ No Kommo integration for agent ${agentId}`);
        continue;
      }

      // Check if integration has valid token
      const token = await prisma.kommoToken.findFirst({
        where: {
          integrationId: integration.id,
          expiresAt: { gt: new Date() },
        },
      });

      if (!token) {
        console.log(`⚠️ No valid token for integration ${integration.id}`);
        continue;
      }

      // Get agent
      const agent = await prisma.agent.findFirst({
        where: { id: agentId },
      });

      if (!agent || !agent.isActive) {
        console.log(`⚠️ Agent ${agentId} not found or inactive`);
        continue;
      }

      const typedTriggers = triggers as unknown as TriggerWithActions[];
      console.log(`🎯 Processing ${typedTriggers.length} triggers for agent "${agent.name}" (ID: ${agent.id})`);

      // Process webhook for this agent
      await processWebhookPayload(payload, integration, agent, typedTriggers);
    }
  } catch (error: any) {
    console.error('❌ Error in async webhook processing:', error);
  }
}

/**
 * POST /api/kommo/webhook
 * Handle webhooks from Kommo
 * IMPORTANT: Kommo requires response within 2 seconds!
 * We respond immediately and process asynchronously.
 *
 * Architecture:
 * - If Redis Queue available: enqueue for worker processing (scalable)
 * - If no Redis: process in background (current behavior)
 */
export async function handleWebhook(req: Request, res: Response) {
  const payload = req.body;
  const receivedAt = new Date().toISOString();

  // Log webhook for debugging (short version)
  console.log('📥 Kommo Webhook received:', Object.keys(payload).join(', '));

  // Respond IMMEDIATELY with 200 OK to satisfy Kommo's 2-second requirement
  res.status(200).json({ success: true });

  // Check if Redis Queue is available for scalable processing
  if (isQueueAvailable()) {
    // Enqueue webhook for worker processing
    const jobId = await enqueueWebhook({
      integrationId: '', // Will be resolved by worker
      agentId: '', // Will be resolved by worker
      payload,
      receivedAt,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'] as string || '',
        'user-agent': req.headers['user-agent'] as string || '',
      },
    });

    if (jobId) {
      console.log(`📤 Webhook queued for processing: ${jobId}`);
      return;
    }
    // If queue failed, fallback to sync processing
    console.log('⚠️ Queue failed, falling back to sync processing');
  }

  // Fallback: Process webhook asynchronously in background (don't await!)
  processWebhookAsync(payload).catch(err => {
    console.error('❌ Background webhook processing failed:', err);
  });
}

/**
 * Process the webhook payload after responding to Kommo
 */
async function processWebhookPayload(
  payload: any,
  integration: any,
  agent: any,
  triggers: TriggerWithActions[]
) {
  try {
    // Получаем расширенные настройки агента для модели триггеров
    const advancedSettings = await prisma.agentAdvancedSettings.findUnique({
      where: { agentId: agent.id },
    });

    // Determine event type and extract entity data
    // Kommo sends webhooks in nested format: { leads: { add: [...], update: [...], status: [...] } }
    let eventType: string | null = null;
    let leadId: number | undefined;
    let contactId: number | undefined;
    let statusId: number | undefined;
    let oldStatusId: number | undefined;
    let pipelineId: number | undefined;

    // Check nested format (leads.add, leads.update, leads.status)
    if (payload.leads?.add?.[0]) {
      eventType = 'lead_created';
      const lead = payload.leads.add[0];
      leadId = parseInt(lead.id);
      statusId = parseInt(lead.status_id);
      pipelineId = parseInt(lead.pipeline_id);
    } else if (payload.leads?.status?.[0]) {
      eventType = 'lead_status_changed';
      const lead = payload.leads.status[0];
      leadId = parseInt(lead.id);
      statusId = parseInt(lead.status_id);
      oldStatusId = parseInt(lead.old_status_id);
      pipelineId = parseInt(lead.pipeline_id);
    } else if (payload.leads?.update?.[0]) {
      eventType = 'lead_updated';
      const lead = payload.leads.update[0];
      leadId = parseInt(lead.id);
      statusId = parseInt(lead.status_id);
      oldStatusId = lead.old_status_id ? parseInt(lead.old_status_id) : undefined;
      pipelineId = parseInt(lead.pipeline_id);
    } else if (payload.contacts?.add?.[0]) {
      eventType = 'contact_created';
      contactId = parseInt(payload.contacts.add[0].id);
    } else if (payload.contacts?.update?.[0]) {
      eventType = 'contact_updated';
      contactId = parseInt(payload.contacts.update[0].id);
    } else if (payload.task?.add?.[0]) {
      eventType = 'task_created';
    } else if (payload.task?.update?.[0]) {
      eventType = 'task_updated';
    }
    // ========================================================================
    // Talk events (chat session management)
    // talk.add - new conversation started
    // talk.update - conversation status changed (in_work, closed, read)
    // ========================================================================
    else if (payload.talk?.add?.[0] || payload.talk?.update?.[0]) {
      const talk = payload.talk?.add?.[0] || payload.talk?.update?.[0];
      const isNewTalk = !!payload.talk?.add;
      const talkId = talk.talk_id || talk.id;
      const chatId = talk.chat_id;
      const entityId = talk.entity_id; // Lead ID
      const entityType = talk.entity_type; // 'lead' or 'contact'
      const isInWork = talk.is_in_work === '1' || talk.is_in_work === 1;
      const isRead = talk.is_read === '1' || talk.is_read === 1;
      const origin = talk.origin; // telegram, whatsapp, etc.

      if (isNewTalk) {
        console.log(`🗨️ New talk created: ${talkId}, chat: ${chatId}, entity: ${entityType}:${entityId}, origin: ${origin}`);
        // New talk - just log, AI agent will respond to messages
        eventType = 'talk_created';
      } else {
        // Talk updated - check if closed or taken in work
        console.log(`🗨️ Talk updated: ${talkId}, is_in_work: ${isInWork}, is_read: ${isRead}, entity: ${entityType}:${entityId}`);

        if (!isInWork && entityId) {
          // Chat closed by manager - resume AI agent
          console.log(`📤 Talk ${talkId} closed, resuming AI agent for lead ${entityId}`);
          const { resumeAgentForLead } = await import('../services/conversational-agent.service');
          await resumeAgentForLead(integration.id, parseInt(entityId));
          eventType = 'talk_closed';
        } else if (isInWork && entityId) {
          // Manager took chat in work - pause AI agent
          console.log(`📥 Talk ${talkId} taken in work, pausing AI agent for lead ${entityId}`);
          const { pauseAgentForLead } = await import('../services/conversational-agent.service');
          // Use 0 as employee ID since we don't have specific user from talk event
          await pauseAgentForLead(integration.id, parseInt(entityId), agent.id, 0);
          eventType = 'talk_in_work';
        }
      }

      console.log(`✅ Talk event processed: ${eventType}`);
      return;
    }
    // Check for incoming chat messages (message.add webhook)
    else if (payload.message?.add?.[0]) {
      const msg = payload.message.add[0];
      const messageText = msg.text || '';
      const chatId = msg.chat_id;
      const entityId = msg.entity_id; // This is typically the lead ID
      const createdBy = msg.created_by; // 0 = bot/system, >0 = user ID

      // Determine if this is from client or employee
      // In Kommo Chat API:
      // - created_by = 0: system/bot message
      // - created_by > 0: message from a Kommo user (employee)
      // - For incoming client messages, Kommo typically sends created_by = 0 but with specific type
      // The 'author' field or 'type' field can help distinguish
      const isFromEmployee = createdBy > 0;
      const isFromClient = createdBy === 0 && msg.type !== 'outgoing'; // incoming from client

      // If message is from employee - check stopOnReply setting and pause agent
      if (isFromEmployee && entityId) {
        console.log(`👤 Message from employee (user_id: ${createdBy}) in chat ${chatId}`);

        // Check if stopOnReply is enabled for this user
        const userSettings = await prisma.userSettings.findFirst({
          where: {
            userId: agent.userId,
          },
        });

        if (userSettings?.stopOnReply) {
          const { pauseAgentForLead } = await import('../services/conversational-agent.service');
          await pauseAgentForLead(integration.id, parseInt(entityId), agent.id, createdBy);
          console.log(`⏸️ Agent paused due to employee reply (stopOnReply enabled)`);
        }

        // Don't process employee messages through AI - just log and return
        console.log('✅ Employee message logged, not processing through AI');
        return;
      }

      // Only process incoming messages from clients
      if (messageText && isFromClient) {
        console.log(`💬 Incoming client message: "${messageText.substring(0, 100)}..."`);

        let shouldStopAgent = false;

        // Run AI trigger evaluation on the message
        if (triggers.length > 0) {
          const triggerConditions: TriggerCondition[] = triggers.map(t => ({
            id: t.id,
            name: t.name,
            condition: t.condition,
          }));

          try {
            const evaluationResults = await evaluateTriggerConditions(
              messageText,
              [], // No conversation context for now
              triggerConditions,
              advancedSettings?.triggerEvaluationModel || 'openai/gpt-4o-mini'
            );

            console.log('🎯 AI Trigger evaluation results:', evaluationResults);

            // Import trigger executor and chat message sender
            const { executeTriggerActions } = await import('../services/trigger-executor.service');
            const { sendChatMessage } = await import('../services/kommo.service');

            // Execute actions for matched triggers
            for (const result of evaluationResults) {
              if (result.matched) {
                console.log(`✅ AI Trigger matched: ${result.triggerName} (confidence: ${result.confidence})`);

                const trigger = triggers.find(t => t.id === result.triggerId);
                if (trigger) {
                  // Check run limit before executing
                  if (!checkRunLimit(trigger.id, chatId, trigger.runLimit)) {
                    console.log(`⏹️ Trigger ${trigger.name} skipped - run limit reached (${trigger.runLimit} executions)`);
                    continue;
                  }

                  const actionsWithParams = trigger.actions.map((a: any) => ({
                    id: a.id,
                    action: a.action,
                    params: a.params ? JSON.parse(a.params) : {},
                  }));

                  // Check if this trigger has stop_agents action
                  if (actionsWithParams.some((a: any) => a.action === 'stop_agents')) {
                    shouldStopAgent = true;
                    console.log(`⏹️ Agent stopped by trigger: ${trigger.name}`);
                  }

                  const context = {
                    integrationId: integration.id,
                    agentId: agent.id,
                    leadId: entityId ? parseInt(entityId) : undefined,
                    chatId,
                    emailGenerationModel: advancedSettings?.emailGenerationModel || 'openai/gpt-4o-mini',
                  };

                  try {
                    const results = await executeTriggerActions(actionsWithParams, context);
                    console.log(`📊 AI Trigger ${trigger.name} results:`, results);

                    // Increment execution count after successful execution
                    incrementExecutionCount(trigger.id, chatId);

                    // Send cancelMessage (response message) if configured
                    if (trigger.cancelMessage && chatId) {
                      try {
                        await sendChatMessage(integration.id, chatId, trigger.cancelMessage);
                        console.log(`💬 Sent trigger response message: "${trigger.cancelMessage}"`);
                      } catch (msgError: any) {
                        console.error(`❌ Error sending trigger response message:`, msgError);
                      }
                    }
                  } catch (triggerError: any) {
                    console.error(`❌ Error executing AI trigger ${trigger.name}:`, triggerError);
                  }
                }
              }
            }
          } catch (aiError: any) {
            console.error('❌ Error in AI trigger evaluation:', aiError);
          }
        }

        // If agent not stopped, run conversational AI
        if (!shouldStopAgent && entityId) {
          try {
            // Check if agent is paused for this lead
            const isPaused = await isAgentPausedForLead(agent.id, parseInt(entityId));
            if (isPaused) {
              console.log(`⏸️ Agent ${agent.id} is paused for lead ${entityId}, skipping response`);
              return;
            }

            // Fetch lead to get pipeline/stage info
            const { fetchLeadById } = await import('../services/kommo.service');
            const lead = await fetchLeadById(integration.id, parseInt(entityId));

            if (lead && lead.pipeline_id && lead.status_id) {
              const { processIncomingMessage } = await import('../services/conversational-agent.service');

              const result = await processIncomingMessage({
                integrationId: integration.id,
                agentId: agent.id,
                channel: 'chat',
                messageText,
                leadId: parseInt(entityId),
                pipelineId: lead.pipeline_id,
                stageId: lead.status_id,
                chatId,
              });

              if (result.responded) {
                console.log(`✅ Conversational AI responded to message`);
              } else {
                console.log(`ℹ️ Conversational AI did not respond (no stage instruction)`);
              }
            }
          } catch (convError: any) {
            console.error('❌ Error in conversational AI:', convError.message);
          }
        }

        console.log('✅ Message processed');
        return;
      }
    }
    // Check for incoming emails (note.add webhook with email type)
    else if (payload.note?.add?.[0] || payload['note[add]']?.[0]) {
      const note = payload.note?.add?.[0] || payload['note[add]'][0];
      const noteType = note.note_type || note.type;

      // Email note types in Kommo: 'incoming_mail', 'outgoing_mail', 'mail_message'
      const isIncomingEmail = ['incoming_mail', 'mail_message', 4].includes(noteType);

      if (isIncomingEmail) {
        // Extract email content
        const emailText = note.params?.text || note.text || '';
        const emailSubject = note.params?.subject || '';
        const emailFrom = note.params?.from || '';
        const entityId = note.entity_id;
        const entityType = note.entity_type; // 'leads' or 'contacts'

        console.log(`📧 Incoming email from ${emailFrom}`);
        console.log(`   Subject: ${emailSubject}`);
        console.log(`   Body: ${emailText.substring(0, 200)}...`);
        console.log(`   Entity: ${entityType} #${entityId}`);

        // Combine subject and body for AI analysis
        const fullEmailContent = `Subject: ${emailSubject}\n\n${emailText}`;

        // Run AI trigger evaluation on the email
        let shouldStopAgent = false;

        if (triggers.length > 0) {
          const triggerConditions: TriggerCondition[] = triggers.map(t => ({
            id: t.id,
            name: t.name,
            condition: t.condition,
          }));

          try {
            const evaluationResults = await evaluateTriggerConditions(
              fullEmailContent,
              [], // No conversation context
              triggerConditions,
              advancedSettings?.triggerEvaluationModel || 'openai/gpt-4o-mini'
            );

            console.log('🎯 Email AI Trigger evaluation results:', evaluationResults);

            // Import trigger executor
            const { executeTriggerActions } = await import('../services/trigger-executor.service');

            // Execute actions for matched triggers
            for (const result of evaluationResults) {
              if (result.matched) {
                console.log(`✅ Email AI Trigger matched: ${result.triggerName} (confidence: ${result.confidence})`);

                const trigger = triggers.find(t => t.id === result.triggerId);
                if (trigger) {
                  const actionsWithParams = trigger.actions.map((a: any) => ({
                    id: a.id,
                    action: a.action,
                    params: a.params ? JSON.parse(a.params) : {},
                  }));

                  // Check if this trigger has stop_agents action
                  if (actionsWithParams.some((a: any) => a.action === 'stop_agents')) {
                    shouldStopAgent = true;
                    console.log(`⏹️ Agent stopped by email trigger: ${trigger.name}`);
                  }

                  const context = {
                    integrationId: integration.id,
                    agentId: agent.id,
                    leadId: entityType === 'leads' ? parseInt(entityId) : undefined,
                    contactId: entityType === 'contacts' ? parseInt(entityId) : undefined,
                    emailFrom,
                    emailSubject,
                    emailGenerationModel: advancedSettings?.emailGenerationModel || 'openai/gpt-4o-mini',
                  };

                  try {
                    const results = await executeTriggerActions(actionsWithParams, context as any);
                    console.log(`📊 Email AI Trigger ${trigger.name} results:`, results);
                  } catch (triggerError: any) {
                    console.error(`❌ Error executing email AI trigger ${trigger.name}:`, triggerError);
                  }
                }
              }
            }
          } catch (aiError: any) {
            console.error('❌ Error in email AI trigger evaluation:', aiError);
          }
        }

        // If agent not stopped and entity is a lead, run conversational AI
        if (!shouldStopAgent && entityType === 'leads' && entityId) {
          try {
            // Check if agent is paused for this lead
            const isPaused = await isAgentPausedForLead(agent.id, parseInt(entityId));
            if (isPaused) {
              console.log(`⏸️ Agent ${agent.id} is paused for lead ${entityId}, skipping email response`);
              return;
            }

            const { fetchLeadById } = await import('../services/kommo.service');
            const lead = await fetchLeadById(integration.id, parseInt(entityId));

            if (lead && lead.pipeline_id && lead.status_id) {
              const { processIncomingMessage } = await import('../services/conversational-agent.service');

              const result = await processIncomingMessage({
                integrationId: integration.id,
                agentId: agent.id,
                channel: 'email',
                messageText: fullEmailContent,
                leadId: parseInt(entityId),
                pipelineId: lead.pipeline_id,
                stageId: lead.status_id,
                emailFrom,
                emailSubject,
              });

              if (result.responded) {
                console.log(`✅ Conversational AI responded to email`);
              } else {
                console.log(`ℹ️ Conversational AI did not respond to email (no stage instruction)`);
              }
            }
          } catch (convError: any) {
            console.error('❌ Error in conversational AI for email:', convError.message);
          }
        }

        console.log('✅ Email processed');
        return;
      }
    }
    // Also check URL-encoded format for backwards compatibility
    else if (payload['leads[add]']?.[0]) {
      eventType = 'lead_created';
      leadId = parseInt(payload['leads[add]'][0].id);
      statusId = parseInt(payload['leads[add]'][0].status_id);
    } else if (payload['leads[status]']?.[0]) {
      eventType = 'lead_status_changed';
      leadId = parseInt(payload['leads[status]'][0].id);
      statusId = parseInt(payload['leads[status]'][0].status_id);
      oldStatusId = parseInt(payload['leads[status]'][0].old_status_id);
    }

    if (!eventType) {
      console.log('⚠️ Unknown webhook event type, payload keys:', Object.keys(payload));
      return;
    }

    console.log(`📌 Event: ${eventType}, Lead: ${leadId}, Contact: ${contactId}`);

    // ========================================================================
    // AI-based CRM Event Trigger Evaluation
    // Fetches lead/pipeline details and uses AI to match natural language conditions
    // ========================================================================

    // Build CRM event context with names (not just IDs)
    const eventContext: CRMEventContext = {
      eventType: eventType as CRMEventContext['eventType'],
    };

    let leadPipelineId: number | undefined;

    // Fetch lead details if we have a leadId
    if (leadId) {
      try {
        const lead = await fetchLeadById(integration.id, leadId);
        eventContext.leadId = lead.id;
        eventContext.leadName = lead.name;
        eventContext.stageId = lead.status_id;
        leadPipelineId = lead.pipeline_id;
        eventContext.pipelineId = lead.pipeline_id;
        eventContext.responsibleUserId = lead.responsible_user_id;

        console.log(`📋 Lead details: "${lead.name}" (ID: ${lead.id}), Pipeline: ${lead.pipeline_id}, Stage: ${lead.status_id}`);
      } catch (leadError: any) {
        console.error('❌ Failed to fetch lead details:', leadError.message);
      }
    }

    // For status change events, track old status
    if (eventType === 'lead_status_changed' && oldStatusId) {
      eventContext.oldStageId = oldStatusId;
    }

    // Fetch pipelines to get stage and pipeline names
    if (leadPipelineId || statusId) {
      try {
        const pipelinesResponse = await fetchPipelines(integration.id);
        const pipelines = pipelinesResponse._embedded?.pipelines || [];

        // Find the pipeline and stage names
        for (const pipeline of pipelines) {
          if (pipeline.id === leadPipelineId) {
            eventContext.pipelineName = pipeline.name;
            pipelineId = pipeline.id;

            // Find stage names
            const stages = pipeline._embedded?.statuses || [];
            for (const stage of stages) {
              if (stage.id === statusId) {
                eventContext.stageName = stage.name;
              }
              if (stage.id === oldStatusId) {
                eventContext.oldStageName = stage.name;
              }
            }
            break;
          }
        }

        console.log(`🏷️ Pipeline: "${eventContext.pipelineName}", Stage: "${eventContext.stageName}"${eventContext.oldStageName ? `, Old Stage: "${eventContext.oldStageName}"` : ''}`);
      } catch (pipelineError: any) {
        console.error('❌ Failed to fetch pipelines:', pipelineError.message);
      }
    }

    // Fetch users to get responsible user name
    if (eventContext.responsibleUserId) {
      try {
        const usersResponse = await fetchUsers(integration.id);
        const users = usersResponse._embedded?.users || [];
        const user = users.find(u => u.id === eventContext.responsibleUserId);
        if (user) {
          eventContext.responsibleUserName = user.name;
        }
      } catch (userError: any) {
        console.error('❌ Failed to fetch users:', userError.message);
      }
    }

    // Prepare triggers for AI evaluation
    const triggerConditions: TriggerCondition[] = triggers.map(t => ({
      id: t.id,
      name: t.name,
      condition: t.condition,
    }));

    // Use AI to evaluate which triggers match this CRM event
    console.log(`🤖 Evaluating ${triggerConditions.length} triggers with AI for CRM event...`);
    const evaluationResults = await evaluateCRMEventTriggers(eventContext, triggerConditions);

    // Filter to only matched triggers
    const matchedTriggerIds = evaluationResults
      .filter(r => r.matched)
      .map(r => r.triggerId);

    const matchingTriggers = triggers.filter(t => matchedTriggerIds.includes(t.id));

    console.log(`✅ AI matched ${matchingTriggers.length} triggers:`);
    for (const result of evaluationResults) {
      if (result.matched) {
        console.log(`   ✓ ${result.triggerName} (confidence: ${result.confidence}) - ${result.reason}`);
      } else {
        console.log(`   ✗ ${result.triggerName} (confidence: ${result.confidence}) - ${result.reason}`);
      }
    }

    // Import trigger executor
    const { executeTriggerActions } = await import('../services/trigger-executor.service');

    // Execute actions for each matching trigger
    let triggersExecuted = 0;
    for (const trigger of matchingTriggers) {
      console.log(`🚀 Executing trigger: ${trigger.name}`);

      // Parse action params from JSON
      const actionsWithParams = trigger.actions.map((a: any) => ({
        id: a.id,
        action: a.action,
        params: a.params ? JSON.parse(a.params) : {},
      }));

      const context = {
        integrationId: integration.id,
        agentId: agent.id,
        leadId,
        contactId,
        pipelineId,
        emailGenerationModel: advancedSettings?.emailGenerationModel || 'openai/gpt-4o-mini',
      };

      try {
        const results = await executeTriggerActions(actionsWithParams, context);
        console.log(`📊 Trigger ${trigger.name} results:`, results);
        triggersExecuted++;
      } catch (triggerError: any) {
        console.error(`❌ Error executing trigger ${trigger.name}:`, triggerError);
      }
    }

    // Log completion
    console.log(`✅ Webhook processed: ${triggersExecuted}/${triggerConditions.length} triggers executed`);

    // ========================================================================
    // Stage Instructions Processing (AI-based)
    // If agent has pipelineSettings with stageInstructions, execute them
    // ========================================================================

    if ((eventType === 'lead_created' || eventType === 'lead_status_changed') && leadId && statusId && pipelineId) {
      try {
        // Parse agent's pipeline settings
        const pipelineSettings = agent.pipelineSettings
          ? (typeof agent.pipelineSettings === 'string'
              ? JSON.parse(agent.pipelineSettings)
              : agent.pipelineSettings)
          : null;

        if (pipelineSettings?.pipelines) {
          // Find pipeline config
          const pipelineConfig = pipelineSettings.pipelines[pipelineId.toString()];

          if (pipelineConfig?.active) {
            // Check if this stage has instructions
            const stageInstruction = pipelineConfig.stageInstructions?.[statusId.toString()];

            if (stageInstruction && stageInstruction.trim()) {
              console.log(`📋 Found stage instruction for stage ${statusId}: "${stageInstruction.substring(0, 50)}..."`);

              // Import and execute stage instruction
              const { processStageInstructionForLead } = await import('../services/stage-instruction-executor.service');

              const instructionResults = await processStageInstructionForLead(
                integration.id,
                leadId,
                pipelineId,
                statusId,
                stageInstruction,
                agent.systemInstructions, // Pass main prompt for context
                {
                  leadName: eventContext.leadName,
                  pipelineName: eventContext.pipelineName,
                  stageName: eventContext.stageName,
                  responsibleUserId: eventContext.responsibleUserId,
                  responsibleUserName: eventContext.responsibleUserName,
                },
                advancedSettings?.instructionParsingModel || 'openai/gpt-4o-mini'
              );

              console.log(`📊 Stage instruction results: ${instructionResults.length} actions executed`);
              for (const result of instructionResults) {
                if (result.success) {
                  console.log(`   ✅ ${result.actionType}: ${result.message}`);
                } else {
                  console.log(`   ❌ ${result.actionType}: ${result.error}`);
                }
              }
            } else {
              console.log(`ℹ️ No stage instruction for stage ${statusId} in pipeline ${pipelineId}`);
            }
          } else {
            console.log(`ℹ️ Pipeline ${pipelineId} is not active for this agent`);
          }
        } else {
          console.log(`ℹ️ No pipeline settings configured for agent ${agent.name}`);
        }
      } catch (stageError: any) {
        console.error('❌ Error processing stage instruction:', stageError);
      }
    }
  } catch (error: any) {
    console.error('❌ Error processing webhook payload:', error);
  }
}
