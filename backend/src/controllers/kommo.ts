import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  storeTokens,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '../services/kommo.service';

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
    } = await import('../services/kommo.service');

    console.log('📊 Fetching CRM data from Kommo...');

    const [pipelinesData, leadsFieldsData, contactsFieldsData, taskTypes, usersData] =
      await Promise.all([
        fetchPipelines(integrationId),
        fetchLeadsCustomFields(integrationId),
        fetchContactsCustomFields(integrationId),
        fetchTaskTypes(integrationId),
        fetchUsers(integrationId),
      ]);

    const pipelines = pipelinesData._embedded.pipelines;
    const leadsFields = leadsFieldsData._embedded.custom_fields;
    const contactsFields = contactsFieldsData._embedded.custom_fields;
    const users = usersData._embedded.users;

    console.log(`✅ Loaded: ${pipelines.length} pipelines, ${leadsFields.length} lead fields, ${contactsFields.length} contact fields, ${taskTypes.length} task types, ${users.length} users`);

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

    return res.json({
      success: true,
      message: 'CRM data synchronized successfully',
      data: crmData,
    });
  } catch (error: any) {
    console.error('Error syncing CRM data:', error);
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
    // Используем base_domain из токена или KOMMO_DOMAIN из .env
    const baseDomain = payload.base_domain || process.env.KOMMO_DOMAIN || 'worldwideservices.kommo.com';
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

/**
 * POST /api/kommo/webhook
 * Handle webhooks from Kommo
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-kommo-signature'] as string;
    const payload = req.body;

    // Verify webhook signature (if implemented)
    // const secret = process.env.KOMMO_WEBHOOK_SECRET || '';
    // if (!verifyWebhookSignature(JSON.stringify(payload), signature, secret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Parse webhook payload
    const webhookData = parseWebhookPayload(payload);

    // Log webhook for debugging
    console.log('📥 Kommo Webhook received:', JSON.stringify(webhookData, null, 2));

    // Handle different webhook events
    if (webhookData['leads[add]']) {
      console.log('New leads added:', webhookData['leads[add]']);
      // TODO: Fetch full lead data and store in database
      // TODO: Trigger AI agent actions if needed
    }

    if (webhookData['leads[update]']) {
      console.log('Leads updated:', webhookData['leads[update]']);
      // TODO: Update leads in database
    }

    if (webhookData['leads[status]']) {
      console.log('Lead status changed:', webhookData['leads[status]']);
      // TODO: Handle status changes (trigger chains, etc.)
    }

    if (webhookData['contacts[add]']) {
      console.log('New contacts added:', webhookData['contacts[add]']);
      // TODO: Fetch full contact data and store in database
    }

    if (webhookData['contacts[update]']) {
      console.log('Contacts updated:', webhookData['contacts[update]']);
      // TODO: Update contacts in database
    }

    if (webhookData['companies[add]']) {
      console.log('New companies added:', webhookData['companies[add]']);
      // TODO: Fetch full company data and store in database
    }

    if (webhookData['companies[update]']) {
      console.log('Companies updated:', webhookData['companies[update]']);
      // TODO: Update companies in database
    }

    // Respond with 200 OK to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({
      error: 'Failed to handle webhook',
      message: error.message,
    });
  }
}
