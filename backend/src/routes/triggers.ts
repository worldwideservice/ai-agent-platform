import { Router } from 'express';
import {
  createTrigger,
  getTriggers,
  getTriggerById,
  updateTrigger,
  deleteTrigger,
} from '../controllers/triggers';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// POST /api/agents/:agentId/triggers - Создать триггер
router.post('/:agentId/triggers', createTrigger);

// GET /api/agents/:agentId/triggers - Получить все триггеры
router.get('/:agentId/triggers', getTriggers);

// GET /api/agents/:agentId/triggers/:triggerId - Получить триггер по ID
router.get('/:agentId/triggers/:triggerId', getTriggerById);

// PUT /api/agents/:agentId/triggers/:triggerId - Обновить триггер
router.put('/:agentId/triggers/:triggerId', updateTrigger);

// DELETE /api/agents/:agentId/triggers/:triggerId - Удалить триггер
router.delete('/:agentId/triggers/:triggerId', deleteTrigger);

export default router;
