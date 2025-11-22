import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as crmController from '../controllers/crm';

const router = Router();

// Все routes требуют аутентификации
router.use(authMiddleware);

// POST /api/crm/sync - Синхронизировать CRM
router.post('/sync', crmController.syncCRM);

export default router;
