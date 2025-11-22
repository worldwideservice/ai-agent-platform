import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// GET /api/analytics/dashboard - Получить аналитику для Dashboard
router.get('/dashboard', getDashboardAnalytics);

export default router;
