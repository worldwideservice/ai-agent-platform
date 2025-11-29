import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { getQueueStats, isQueueAvailable } from '../services/webhook-queue.service';
import { getOpenRouterStats } from '../services/openrouter.service';

const prisma = new PrismaClient();

// ==================== DASHBOARD ====================

/**
 * Общая статистика для дашборда
 */
export async function getDashboardStats(_req: AuthRequest, res: Response) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalAgents,
      activeAgents,
      totalArticles,
      totalCategories,
      totalConversations,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { trialEndsAt: { gt: new Date() } } }),
      prisma.agent.count(),
      prisma.agent.count({ where: { isActive: true } }),
      prisma.kbArticle.count(),
      prisma.kbCategory.count(),
      prisma.leadConversation.count(),
      prisma.leadMessage.count(),
    ]);

    // Статистика по планам
    const planStats = await prisma.user.groupBy({
      by: ['currentPlan'],
      _count: true,
    });

    // Последние регистрации
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        currentPlan: true,
        createdAt: true,
      },
    });

    // Queue и OpenRouter статистика
    const queueStats = await getQueueStats();
    const openRouterStats = getOpenRouterStats();

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        byPlan: planStats.reduce((acc, p) => {
          acc[p.currentPlan] = p._count;
          return acc;
        }, {} as Record<string, number>),
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      knowledgeBase: {
        articles: totalArticles,
        categories: totalCategories,
      },
      conversations: {
        total: totalConversations,
        messages: totalMessages,
      },
      recentUsers,
      system: {
        queueEnabled: isQueueAvailable(),
        queue: queueStats,
        openRouter: openRouterStats,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        uptime: process.uptime(),
      },
    });
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats', message: error.message });
  }
}

// ==================== USERS ====================

/**
 * Получить список всех пользователей с пагинацией и поиском
 */
export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const plan = req.query.plan as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (plan) {
      where.currentPlan = plan;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          role: true,
          currentPlan: true,
          trialEndsAt: true,
          responsesUsed: true,
          responsesLimit: true,
          agentsLimit: true,
          kbArticlesLimit: true,
          instructionsLimit: true,
          responsesResetAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
}

/**
 * Получить детальную информацию о пользователе
 */
export async function getUserById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        currentPlan: true,
        trialEndsAt: true,
        responsesUsed: true,
        responsesLimit: true,
        agentsLimit: true,
        kbArticlesLimit: true,
        instructionsLimit: true,
        responsesResetAt: true,
        avatarUrl: true,
        language: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Получаем связанные данные
    const [agentsCount, articlesCount, conversationsCount] = await Promise.all([
      prisma.agent.count({ where: { userId } }),
      prisma.kbArticle.count({ where: { userId } }),
      prisma.leadConversation.count({
        where: {
          agentId: {
            in: (await prisma.agent.findMany({ where: { userId }, select: { id: true } })).map(a => a.id),
          },
        },
      }),
    ]);

    res.json({
      ...user,
      stats: {
        agents: agentsCount,
        articles: articlesCount,
        conversations: conversationsCount,
      },
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
}

/**
 * Обновить пользователя (лимиты, план, роль)
 */
export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;
    const {
      currentPlan,
      trialEndsAt,
      responsesUsed,
      responsesLimit,
      agentsLimit,
      kbArticlesLimit,
      instructionsLimit,
      responsesResetAt,
      role,
    } = req.body;

    const updateData: any = {};

    if (currentPlan !== undefined) updateData.currentPlan = currentPlan;
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    if (responsesUsed !== undefined) updateData.responsesUsed = responsesUsed;
    if (responsesLimit !== undefined) updateData.responsesLimit = responsesLimit;
    if (agentsLimit !== undefined) updateData.agentsLimit = agentsLimit;
    if (kbArticlesLimit !== undefined) updateData.kbArticlesLimit = kbArticlesLimit;
    if (instructionsLimit !== undefined) updateData.instructionsLimit = instructionsLimit;
    if (responsesResetAt !== undefined) updateData.responsesResetAt = responsesResetAt ? new Date(responsesResetAt) : null;
    if (role !== undefined) updateData.role = role;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        currentPlan: true,
        trialEndsAt: true,
        responsesUsed: true,
        responsesLimit: true,
        agentsLimit: true,
        kbArticlesLimit: true,
        instructionsLimit: true,
        responsesResetAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
}

/**
 * Быстрые действия с пользователем
 */
export async function userQuickAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { action, value } = req.body;

    let updateData: any = {};

    switch (action) {
      case 'extend_trial':
        // Продлить триал на N дней
        const days = value || 7;
        const currentTrialEnd = await prisma.user.findUnique({
          where: { id: userId },
          select: { trialEndsAt: true },
        });
        const baseDate = currentTrialEnd?.trialEndsAt && new Date(currentTrialEnd.trialEndsAt) > new Date()
          ? new Date(currentTrialEnd.trialEndsAt)
          : new Date();
        updateData.trialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        updateData.currentPlan = 'trial';
        break;

      case 'add_responses':
        // Добавить ответов
        const responses = value || 1000;
        updateData.responsesLimit = { increment: responses };
        break;

      case 'set_unlimited':
        // Безлимитный режим (очень большой лимит)
        updateData.responsesLimit = 999999999;
        updateData.agentsLimit = 100;
        updateData.kbArticlesLimit = 10000;
        updateData.instructionsLimit = 1000000;
        updateData.currentPlan = 'unlimited';
        break;

      case 'reset_usage':
        // Сбросить использование
        updateData.responsesUsed = 0;
        updateData.responsesResetAt = new Date();
        break;

      case 'set_plan':
        // Установить план с соответствующими лимитами
        const planLimits: Record<string, any> = {
          trial: { responsesLimit: 500, agentsLimit: 3, kbArticlesLimit: 100, instructionsLimit: 30000 },
          launch: { responsesLimit: 5000, agentsLimit: 5, kbArticlesLimit: 500, instructionsLimit: 100000 },
          scale: { responsesLimit: 20000, agentsLimit: 10, kbArticlesLimit: 2000, instructionsLimit: 250000 },
          max: { responsesLimit: 100000, agentsLimit: 50, kbArticlesLimit: 10000, instructionsLimit: 500000 },
          unlimited: { responsesLimit: 999999999, agentsLimit: 100, kbArticlesLimit: 10000, instructionsLimit: 1000000 },
        };
        const plan = value || 'trial';
        updateData = { ...planLimits[plan], currentPlan: plan };
        break;

      case 'make_admin':
        updateData.role = 'ADMIN';
        break;

      case 'remove_admin':
        updateData.role = 'USER';
        break;

      default:
        res.status(400).json({ error: 'Unknown action' });
        return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        currentPlan: true,
        trialEndsAt: true,
        responsesUsed: true,
        responsesLimit: true,
        agentsLimit: true,
        kbArticlesLimit: true,
        instructionsLimit: true,
      },
    });

    res.json({ success: true, user, action });
  } catch (error: any) {
    console.error('Error performing user action:', error);
    res.status(500).json({ error: 'Failed to perform action', message: error.message });
  }
}

/**
 * Удалить пользователя и все связанные данные
 */
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    // Нельзя удалить самого себя
    if (userId === currentUserId) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }

    // Проверяем существование пользователя
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!userToDelete) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Подсчитываем статистику
    const [agentsCount, articlesCount, categoriesCount] = await Promise.all([
      prisma.agent.count({ where: { userId } }),
      prisma.kbArticle.count({ where: { userId } }),
      prisma.kbCategory.count({ where: { userId } }),
    ]);

    // Удаляем все связанные данные в правильном порядке (из-за foreign keys)
    await prisma.$transaction(async (tx) => {
      // 1. Получаем ID агентов пользователя
      const agentIds = await tx.agent.findMany({
        where: { userId },
        select: { id: true },
      });

      if (agentIds.length > 0) {
        const ids = agentIds.map(a => a.id);

        // Удаляем логи чатов агентов (ChatLog использует snake_case напрямую)
        await tx.chatLog.deleteMany({
          where: { agent_id: { in: ids } },
        });

        // Удаляем интеграции агентов
        await tx.integration.deleteMany({
          where: { agentId: { in: ids } },
        });

        // Удаляем расширенные настройки агентов
        await tx.agentAdvancedSettings.deleteMany({
          where: { agentId: { in: ids } },
        });

        // Удаляем документы агентов
        await tx.agentDocument.deleteMany({
          where: { agentId: { in: ids } },
        });

        // Удаляем триггеры и действия триггеров
        const triggerIds = await tx.trigger.findMany({
          where: { agentId: { in: ids } },
          select: { id: true },
        });
        if (triggerIds.length > 0) {
          await tx.triggerAction.deleteMany({
            where: { triggerId: { in: triggerIds.map(t => t.id) } },
          });
          await tx.trigger.deleteMany({
            where: { agentId: { in: ids } },
          });
        }

        // Удаляем цепочки и связанные данные
        const chainIds = await tx.chain.findMany({
          where: { agentId: { in: ids } },
          select: { id: true },
        });
        if (chainIds.length > 0) {
          const cids = chainIds.map(c => c.id);
          const stepIds = await tx.chainStep.findMany({
            where: { chainId: { in: cids } },
            select: { id: true },
          });
          if (stepIds.length > 0) {
            await tx.chainStepAction.deleteMany({
              where: { stepId: { in: stepIds.map(s => s.id) } },
            });
          }
          await tx.chainStep.deleteMany({
            where: { chainId: { in: cids } },
          });
          await tx.chainCondition.deleteMany({
            where: { chainId: { in: cids } },
          });
          await tx.chainSchedule.deleteMany({
            where: { chainId: { in: cids } },
          });
          await tx.chain.deleteMany({
            where: { agentId: { in: ids } },
          });
        }
      }

      // 2. Удаляем агентов
      await tx.agent.deleteMany({
        where: { userId },
      });

      // 3. Удаляем связи статей и категорий
      await tx.articleCategory.deleteMany({
        where: { article: { userId } },
      });

      // 4. Удаляем статьи базы знаний
      await tx.kbArticle.deleteMany({
        where: { userId },
      });

      // 5. Удаляем категории базы знаний
      await tx.kbCategory.deleteMany({
        where: { userId },
      });

      // 6. Удаляем уведомления
      await tx.notification.deleteMany({
        where: { userId },
      });

      // 7. Удаляем настройки пользователя (UserSettings использует snake_case)
      await tx.userSettings.deleteMany({
        where: { user_id: userId },
      });

      // 8. Удаляем самого пользователя
      await tx.user.delete({
        where: { id: userId },
      });
    });

    res.json({
      success: true,
      message: 'User and all related data deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
        stats: {
          agents: agentsCount,
          kbArticles: articlesCount,
          kbCategories: categoriesCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
}

// ==================== AGENTS ====================

/**
 * Получить список всех агентов с пагинацией
 */
export async function getAllAgents(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const isActive = req.query.isActive as string;
    const userId = req.query.userId as string;

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (userId) {
      where.userId = userId;
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          model: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.agent.count({ where }),
    ]);

    // Получаем информацию о владельцах
    const userIds = [...new Set(agents.map(a => a.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, company: true },
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    const enrichedAgents = agents.map(agent => ({
      ...agent,
      owner: usersMap.get(agent.userId),
    }));

    res.json({
      agents: enrichedAgents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error getting agents:', error);
    res.status(500).json({ error: 'Failed to get agents', message: error.message });
  }
}

/**
 * Включить/выключить агента
 */
export async function toggleAgentStatus(req: AuthRequest, res: Response) {
  try {
    const { agentId } = req.params;
    const { isActive } = req.body;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { isActive },
    });

    res.json(agent);
  } catch (error: any) {
    console.error('Error toggling agent:', error);
    res.status(500).json({ error: 'Failed to toggle agent', message: error.message });
  }
}

// ==================== INTEGRATIONS ====================

/**
 * Получить все интеграции (Kommo, Google и т.д.)
 */
export async function getAllIntegrations(_req: AuthRequest, res: Response) {
  try {
    const [kommoTokens, googleTokens, integrations] = await Promise.all([
      prisma.kommoToken.findMany({
        select: {
          id: true,
          integrationId: true,
          baseDomain: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.googleToken.findMany({
        select: {
          id: true,
          integrationId: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.integration.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Получаем информацию об агентах для интеграций
    const agentIds = [...new Set(integrations.map(i => i.agentId))];
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, userId: true },
    });
    const agentsMap = new Map(agents.map(a => [a.id, a]));

    const enrichedIntegrations = integrations.map(integration => ({
      ...integration,
      agent: agentsMap.get(integration.agentId),
    }));

    res.json({
      kommo: {
        total: kommoTokens.length,
        tokens: kommoTokens,
      },
      google: {
        total: googleTokens.length,
        tokens: googleTokens,
      },
      integrations: enrichedIntegrations,
    });
  } catch (error: any) {
    console.error('Error getting integrations:', error);
    res.status(500).json({ error: 'Failed to get integrations', message: error.message });
  }
}

// ==================== KNOWLEDGE BASE ====================

/**
 * Статистика по базе знаний
 */
export async function getKnowledgeBaseStats(_req: AuthRequest, res: Response) {
  try {
    const [
      totalArticles,
      activeArticles,
      totalCategories,
      totalEmbeddings,
      articlesByUser,
    ] = await Promise.all([
      prisma.kbArticle.count(),
      prisma.kbArticle.count({ where: { isActive: true } }),
      prisma.kbCategory.count(),
      prisma.embeddings.count(),
      prisma.kbArticle.groupBy({
        by: ['userId'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Получаем имена топ пользователей
    const userIds = articlesByUser.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    res.json({
      articles: {
        total: totalArticles,
        active: activeArticles,
        inactive: totalArticles - activeArticles,
      },
      categories: totalCategories,
      embeddings: totalEmbeddings,
      topUsers: articlesByUser.map(a => ({
        user: usersMap.get(a.userId),
        articlesCount: a._count,
      })),
    });
  } catch (error: any) {
    console.error('Error getting KB stats:', error);
    res.status(500).json({ error: 'Failed to get KB stats', message: error.message });
  }
}

// ==================== SYSTEM ====================

/**
 * Системная информация и мониторинг
 */
export async function getSystemInfo(_req: AuthRequest, res: Response) {
  try {
    const queueStats = await getQueueStats();
    const openRouterStats = getOpenRouterStats();

    // Активные цепочки
    const activeChainRuns = await prisma.chainRun.count({
      where: { status: 'running' },
    });

    // Запланированные шаги
    const pendingSteps = await prisma.scheduledChainStep.count({
      where: { status: 'pending' },
    });

    // Активные паузы агентов
    const activePauses = await prisma.agentPause.count({
      where: { isPaused: true },
    });

    res.json({
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        pid: process.pid,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      queue: {
        ...queueStats,
      },
      openRouter: openRouterStats,
      chains: {
        activeRuns: activeChainRuns,
        pendingSteps,
      },
      agents: {
        activePauses,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
      },
    });
  } catch (error: any) {
    console.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system info', message: error.message });
  }
}

/**
 * Логи активности (последние действия)
 */
export async function getActivityLogs(_req: AuthRequest, res: Response) {
  try {
    // const limit = parseInt(req.query.limit as string) || 50;

    // Последние регистрации
    const recentRegistrations = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Последние созданные агенты
    const recentAgents = await prisma.agent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,
      },
    });

    // Последние сообщения
    const recentMessages = await prisma.leadMessage.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        channel: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      registrations: recentRegistrations,
      agents: recentAgents,
      messages: recentMessages,
    });
  } catch (error: any) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: 'Failed to get activity logs', message: error.message });
  }
}

// ==================== CONVERSATIONS ====================

/**
 * Все разговоры с лидами
 */
export async function getAllConversations(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const agentId = req.query.agentId as string;

    const where: any = {};

    if (agentId) {
      where.agentId = agentId;
    }

    const [conversations, total] = await Promise.all([
      prisma.leadConversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.leadConversation.count({ where }),
    ]);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations', message: error.message });
  }
}

// ==================== TRAINING ====================

/**
 * Все источники обучения и роли
 */
export async function getTrainingData(_req: AuthRequest, res: Response) {
  try {
    const [sources, roles] = await Promise.all([
      prisma.trainingSource.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.trainingRole.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      sources: {
        total: sources.length,
        builtIn: sources.filter(s => s.isBuiltIn).length,
        custom: sources.filter(s => !s.isBuiltIn).length,
        items: sources,
      },
      roles: {
        total: roles.length,
        builtIn: roles.filter(r => r.isBuiltIn).length,
        custom: roles.filter(r => !r.isBuiltIn).length,
        items: roles,
      },
    });
  } catch (error: any) {
    console.error('Error getting training data:', error);
    res.status(500).json({ error: 'Failed to get training data', message: error.message });
  }
}
