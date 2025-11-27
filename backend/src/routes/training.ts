/**
 * Training Routes
 * API роуты для управления источниками знаний и ролями
 */

import { Router } from 'express';
import * as trainingController from '../controllers/training';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticateToken);

// ============================================================================
// SOURCES
// ============================================================================

// GET /api/training/sources - Получить все источники
router.get('/sources', trainingController.getSources);

// GET /api/training/sources/:id - Получить источник по ID
router.get('/sources/:id', trainingController.getSourceById);

// POST /api/training/sources - Создать источник
router.post('/sources', trainingController.createSource);

// PUT /api/training/sources/:id - Обновить источник
router.put('/sources/:id', trainingController.updateSource);

// DELETE /api/training/sources/:id - Удалить источник
router.delete('/sources/:id', trainingController.deleteSource);

// ============================================================================
// ROLES
// ============================================================================

// GET /api/training/roles - Получить все роли
router.get('/roles', trainingController.getRoles);

// GET /api/training/roles/:id - Получить роль по ID
router.get('/roles/:id', trainingController.getRoleById);

// GET /api/training/roles/:id/knowledge - Получить скомпилированные знания роли
router.get('/roles/:id/knowledge', trainingController.getRoleKnowledge);

// POST /api/training/roles - Создать роль
router.post('/roles', trainingController.createRole);

// PUT /api/training/roles/:id - Обновить роль
router.put('/roles/:id', trainingController.updateRole);

// DELETE /api/training/roles/:id - Удалить роль
router.delete('/roles/:id', trainingController.deleteRole);

export default router;
