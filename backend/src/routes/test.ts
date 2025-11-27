import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as testController from '../controllers/test';

const router = Router();

// Все test routes требуют аутентификации
router.use(authMiddleware);

// POST /api/test/simulate-employee-reply - Симулировать ответ сотрудника
router.post('/simulate-employee-reply', testController.simulateEmployeeReply);

// POST /api/test/simulate-client-message - Симулировать сообщение клиента
router.post('/simulate-client-message', testController.simulateClientMessage);

// GET /api/test/agent-status/:agentId - Получить статус паузы агента
router.get('/agent-status/:agentId', testController.getTestAgentStatus);

// POST /api/test/resume-agent - Принудительно снять паузу
router.post('/resume-agent', testController.forceResumeAgent);

export default router;
