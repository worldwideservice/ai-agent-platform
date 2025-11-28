import { Router } from 'express';
import {
  getSubscription,
  getLimits,
  getPlans,
  updatePlan,
  activateSubscription,
  renewSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  checkAccess
} from '../controllers/billing';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// GET /api/billing/subscription - Получить информацию о подписке
router.get('/subscription', getSubscription);

// GET /api/billing/limits - Получить текущие лимиты пользователя
router.get('/limits', getLimits);

// GET /api/billing/plans - Получить список доступных планов
router.get('/plans', getPlans);

// GET /api/billing/status - Получить детальный статус подписки
router.get('/status', getSubscriptionStatus);

// POST /api/billing/change-plan - Изменить план пользователя
router.post('/change-plan', updatePlan);

// POST /api/billing/activate - Активировать подписку (после оплаты)
router.post('/activate', activateSubscription);

// POST /api/billing/renew - Продлить подписку
router.post('/renew', renewSubscription);

// POST /api/billing/cancel - Отменить подписку
router.post('/cancel', cancelSubscription);

// POST /api/billing/check-access - Проверить доступ к сервису
router.post('/check-access', checkAccess);

export default router;
