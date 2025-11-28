import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  addMessage,
} from '../controllers/conversations';

const router = Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

// GET /api/conversations - Получить все разговоры
router.get('/', getConversations);

// POST /api/conversations - Создать новый разговор
router.post('/', createConversation);

// GET /api/conversations/:id - Получить разговор с сообщениями
router.get('/:id', getConversation);

// PUT /api/conversations/:id - Обновить название разговора
router.put('/:id', updateConversation);

// DELETE /api/conversations/:id - Удалить разговор
router.delete('/:id', deleteConversation);

// POST /api/conversations/:id/messages - Добавить сообщение
router.post('/:id/messages', addMessage);

export default router;
