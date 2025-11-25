import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

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
      fetchLeads,
      fetchContacts,
      fetchCompanies,
    } = await import('../services/kommo.service');

    try {
      // 1. Синхронизация воронок и этапов
      console.log('📊 Fetching pipelines from Kommo (via api-g.kommo.com)...');
      const pipelinesData = await fetchPipelines(kommoIntegration.id);
      const pipelines = pipelinesData._embedded.pipelines;

      // Преобразуем воронки в формат для хранения
      const pipelinesFormatted = pipelines.map((pipeline) => ({
        id: pipeline.id.toString(),
        name: pipeline.name,
        stages: pipeline._embedded.statuses.map((status) => ({
          id: status.id.toString(),
          name: status.name,
          sort: status.sort,
          color: status.color,
        })),
      }));

      // 2. Синхронизация контактов
      console.log('👥 Fetching contacts from Kommo...');
      const contactsData = await fetchContacts(kommoIntegration.id, { limit: 250 });
      const contacts = contactsData._embedded.contacts;

      // Сохраняем контакты в базу
      for (const contact of contacts) {
        const existingContact = await prisma.contact.findFirst({
          where: {
            crmId: contact.id.toString(),
            userId,
          },
        });

        const contactData = {
          name: contact.name || `${contact.first_name} ${contact.last_name}`.trim(),
          phone: null, // TODO: Extract from custom_fields_values
          email: null, // TODO: Extract from custom_fields_values
          company: null,
          position: null,
          tags: JSON.stringify([]),
          crmId: contact.id.toString(),
          crmType: 'kommo',
          userId,
        };

        if (!existingContact) {
          await prisma.contact.create({ data: contactData });
        } else {
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: contactData,
          });
        }
      }

      // 3. Синхронизация сделок (Leads)
      console.log('💼 Fetching leads from Kommo...');
      const leadsData = await fetchLeads(kommoIntegration.id, {
        limit: 250,
        with: 'contacts',
      });
      const leads = leadsData._embedded.leads;

      // Сохраняем сделки в базу
      for (const lead of leads) {
        const pipeline = pipelines.find((p) => p.id === lead.pipeline_id);
        const stage = pipeline?._embedded.statuses.find((s) => s.id === lead.status_id);

        const existingDeal = await prisma.deal.findFirst({
          where: {
            crmId: lead.id.toString(),
            userId,
          },
        });

        // Найти связанный контакт
        let contactId = null;
        if (lead._embedded?.contacts && lead._embedded.contacts.length > 0) {
          const leadContact = lead._embedded.contacts[0];
          const dbContact = await prisma.contact.findFirst({
            where: {
              crmId: leadContact.id.toString(),
              userId,
            },
          });
          contactId = dbContact?.id || null;
        }

        const dealData = {
          name: lead.name,
          price: lead.price,
          currency: 'RUB',
          status: lead.is_deleted ? 'closed' : 'open',
          stage: stage?.name || 'Unknown',
          pipelineId: pipeline?.id.toString() || '',
          pipelineName: pipeline?.name || '',
          contactId,
          tags: JSON.stringify([]),
          crmId: lead.id.toString(),
          crmType: 'kommo',
          userId,
        };

        if (!existingDeal) {
          await prisma.deal.create({ data: dealData });
        } else {
          await prisma.deal.update({
            where: { id: existingDeal.id },
            data: dealData,
          });
        }
      }

      // Обновляем интеграцию
      await prisma.integration.update({
        where: { id: kommoIntegration.id },
        data: {
          lastSynced: new Date(),
          settings: JSON.stringify({
            pipelines: pipelinesFormatted,
            totalContacts: contacts.length,
            totalLeads: leads.length,
          }),
        },
      });

      // ВАЖНО: Обновляем agent.crmData чтобы воронки отобразились в UI
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          crmData: JSON.stringify({
            pipelines: pipelinesFormatted,
            totalContacts: contacts.length,
            totalLeads: leads.length,
          }),
          crmConnected: true,
          crmType: 'kommo',
        },
      });

      return res.json({
        success: true,
        message: 'Kommo sync completed successfully',
        lastSynced: new Date(),
        stats: {
          pipelines: pipelines.length,
          contacts: contacts.length,
          leads: leads.length,
        },
      });
    } catch (syncError: any) {
      throw syncError;
    }
  } catch (error: any) {
    console.error('Error syncing Kommo:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
