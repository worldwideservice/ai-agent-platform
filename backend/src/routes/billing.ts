import { Router } from 'express';
import { getSubscription, getLimits, getPlans, updatePlan } from '../controllers/billing';
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

// POST /api/billing/change-plan - Изменить план пользователя
router.post('/change-plan', updatePlan);

export default router;
