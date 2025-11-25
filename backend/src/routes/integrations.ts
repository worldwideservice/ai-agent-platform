import { Router } from 'express';
import {
  upsertIntegration,
  getIntegrations,
  syncKommo,
} from '../controllers/integrations';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// POST /api/agents/:agentId/integrations - Создать/обновить интеграцию
router.post('/:agentId/integrations', upsertIntegration);

// GET /api/agents/:agentId/integrations - Получить все интеграции
router.get('/:agentId/integrations', getIntegrations);

// POST /api/agents/:agentId/integrations/kommo/sync - Синхронизировать с Kommo
router.post('/:agentId/integrations/kommo/sync', syncKommo);

export default router;
