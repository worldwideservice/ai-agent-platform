import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as testChatController from '../controllers/test-chat';

const router = Router();

// Все роуты требуют аутентификации
router.use(authMiddleware);

// Разговоры
router.post('/conversations', testChatController.createTestConversation);
router.get('/conversations', testChatController.getTestConversations);
router.get('/conversations/:id', testChatController.getTestConversation);
router.delete('/conversations/:id', testChatController.deleteTestConversation);
router.patch('/conversations/:id', testChatController.updateTestConversation);

// Сообщения
router.post('/message', testChatController.sendTestMessage);

// Информация об агенте
router.get('/agent-info/:agentId', testChatController.getAgentInfo);

export default router;
