import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as kbCategoryController from '../controllers/kb-categories';

const router = Router();

router.use(authMiddleware);

// GET /api/kb/categories - Получить все категории
router.get('/', kbCategoryController.getAllCategories);

// GET /api/kb/categories/:id - Получить категорию по ID
router.get('/:id', kbCategoryController.getCategoryById);

// POST /api/kb/categories - Создать категорию
router.post('/', kbCategoryController.createCategory);

// PUT /api/kb/categories/:id - Обновить категорию
router.put('/:id', kbCategoryController.updateCategory);

// DELETE /api/kb/categories/:id - Удалить категорию
router.delete('/:id', kbCategoryController.deleteCategory);

export default router;
