import { Router } from 'express';
import * as notificationsController from '../controllers/notifications';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/notifications - Получить уведомления
router.get('/', authMiddleware, notificationsController.getNotifications);

// POST /api/notifications - Создать уведомление
router.post('/', authMiddleware, notificationsController.createNotification);

// PUT /api/notifications/read-all - Отметить все как прочитанные
router.put('/read-all', authMiddleware, notificationsController.markAllAsRead);

// PUT /api/notifications/:id/read - Отметить как прочитанное
router.put('/:id/read', authMiddleware, notificationsController.markAsRead);

// DELETE /api/notifications/:id - Удалить уведомление
router.delete('/:id', authMiddleware, notificationsController.deleteNotification);

// DELETE /api/notifications - Удалить все уведомления
router.delete('/', authMiddleware, notificationsController.deleteAllNotifications);

export default router;
