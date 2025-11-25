import { Router } from 'express';
import { sendChatMessage } from '../controllers/chat';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// POST /api/chat/message - Отправить сообщение агенту
router.post('/message', sendChatMessage);

export default router;
