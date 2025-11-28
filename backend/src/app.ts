import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import kbCategoryRoutes from './routes/kb-categories';
import kbArticleRoutes from './routes/kb-articles';
import contactRoutes from './routes/contacts';
import dealRoutes from './routes/deals';
import crmRoutes from './routes/crm';
import settingsRoutes from './routes/settings';
import analyticsRoutes from './routes/analytics';
import billingRoutes from './routes/billing';
import chatRoutes from './routes/chat';
import triggersRoutes from './routes/triggers';
import chainsRoutes from './routes/chains';
import integrationsRoutes from './routes/integrations';
import agentSettingsRoutes from './routes/agent-settings';
import modelsRoutes from './routes/models';
import kommoRoutes from './routes/kommo';
import googleRoutes from './routes/google';
import googleCalendarRoutes from './routes/google-calendar';
import memoryRoutes from './routes/memory';
import kbImportRoutes from './routes/kb-import';
import trainingRoutes from './routes/training';
import agentDocumentsRoutes from './routes/agent-documents';
import profileRoutes from './routes/profile';
import notificationsRoutes from './routes/notifications';
import testRoutes from './routes/test';
import conversationsRoutes from './routes/conversations';
import adminRoutes from './routes/admin';

// Public routes (без авторизации)
import { getPublicDocumentFile } from './controllers/agent-documents';

// Stats imports for monitoring
import { getQueueStats, isQueueAvailable } from './services/webhook-queue.service';
import { getOpenRouterStats } from './services/openrouter.service';

// Chain executor for scheduled steps
import { processScheduledChainSteps } from './services/chain-executor.service';

const app: Express = express();

// Периодическая проверка отложенных шагов цепочек (каждую минуту)
const CHAIN_SCHEDULER_INTERVAL = 60 * 1000; // 1 минута
setInterval(() => {
  processScheduledChainSteps().catch(err => console.error('Chain scheduler error:', err));
}, CHAIN_SCHEDULER_INTERVAL);
console.log('⏰ Chain scheduler started (interval: 1 minute)');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
}));

app.use(morgan('dev')); // Логирование запросов
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Detailed stats endpoint for monitoring (queue, OpenRouter, etc.)
app.get('/health/stats', async (_req: Request, res: Response) => {
  try {
    const queueStats = await getQueueStats();
    const openRouterStats = getOpenRouterStats();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      queue: {
        enabled: isQueueAvailable(),
        ...queueStats,
      },
      openRouter: openRouterStats,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/kommo', kommoRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agents', triggersRoutes);
app.use('/api/agents', chainsRoutes);
app.use('/api/agents', integrationsRoutes);
app.use('/api/agents', agentSettingsRoutes);
app.use('/api/agents', memoryRoutes);
app.use('/api/agents', agentDocumentsRoutes);
app.use('/api/kb/categories', kbCategoryRoutes);
app.use('/api/kb/articles', kbArticleRoutes);
app.use('/api/kb/import', kbImportRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/test', testRoutes); // Test endpoints для симуляции
app.use('/api/admin', adminRoutes); // Admin panel endpoints

// Public routes (без авторизации - для доступа Kommo к файлам)
app.get('/api/public/documents/:documentId', getPublicDocumentFile);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
