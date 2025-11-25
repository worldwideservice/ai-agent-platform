import { Router } from 'express';
import {
  getAdvancedSettings,
  updateAdvancedSettings,
} from '../controllers/agent-settings';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// GET /api/agents/:agentId/advanced-settings - Получить расширенные настройки
router.get('/:agentId/advanced-settings', getAdvancedSettings);

// PUT /api/agents/:agentId/advanced-settings - Обновить расширенные настройки
router.put('/:agentId/advanced-settings', updateAdvancedSettings);

export default router;
