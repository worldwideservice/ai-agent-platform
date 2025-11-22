import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as dealController from '../controllers/deals';

const router = Router();

// Все routes требуют аутентификации
router.use(authMiddleware);

// GET /api/deals - Получить все сделки пользователя
router.get('/', dealController.getAllDeals);

// GET /api/deals/:id - Получить сделку по ID
router.get('/:id', dealController.getDealById);

// POST /api/deals - Создать новую сделку
router.post('/', dealController.createDeal);

// PUT /api/deals/:id - Обновить сделку
router.put('/:id', dealController.updateDeal);

// DELETE /api/deals/:id - Удалить сделку
router.delete('/:id', dealController.deleteDeal);

export default router;
