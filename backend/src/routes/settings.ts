import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// GET /api/settings - Получить настройки пользователя
router.get('/', getSettings);

// PUT /api/settings - Обновить настройки пользователя
router.put('/', updateSettings);

export default router;
