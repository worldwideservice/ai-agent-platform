import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as contactController from '../controllers/contacts';

const router = Router();

// Все routes требуют аутентификации
router.use(authMiddleware);

// GET /api/contacts - Получить все контакты пользователя
router.get('/', contactController.getAllContacts);

// GET /api/contacts/:id - Получить контакт по ID
router.get('/:id', contactController.getContactById);

// POST /api/contacts - Создать новый контакт
router.post('/', contactController.createContact);

// PUT /api/contacts/:id - Обновить контакт
router.put('/:id', contactController.updateContact);

// DELETE /api/contacts/:id - Удалить контакт
router.delete('/:id', contactController.deleteContact);

export default router;
