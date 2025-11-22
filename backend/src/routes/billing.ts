import { Router } from 'express';
import { getSubscription } from '../controllers/billing';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// GET /api/billing/subscription - Получить информацию о подписке
router.get('/subscription', getSubscription);

export default router;
