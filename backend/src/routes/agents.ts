import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as agentController from '../controllers/agents';

const router = Router();

// Все routes требуют аутентификации
router.use(authMiddleware);

// GET /api/agents - Получить все агенты пользователя
router.get('/', agentController.getAllAgents);

// GET /api/agents/:id - Получить агента по ID
router.get('/:id', agentController.getAgentById);

// POST /api/agents - Создать нового агента
router.post('/', agentController.createAgent);

// PUT /api/agents/:id - Обновить агента
router.put('/:id', agentController.updateAgent);

// DELETE /api/agents/:id - Удалить агента
router.delete('/:id', agentController.deleteAgent);

// PATCH /api/agents/:id/toggle - Переключить статус активности
router.patch('/:id/toggle', agentController.toggleAgentStatus);

export default router;
