import { Router } from 'express';
import * as authController from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - Регистрация
router.post('/register', authController.register);

// POST /api/auth/login - Логин
router.post('/login', authController.login);

// GET /api/auth/me - Получить текущего пользователя (требует аутентификации)
router.get('/me', authMiddleware, authController.getCurrentUser);

// POST /api/auth/change-password - Смена пароля (требует аутентификации)
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
