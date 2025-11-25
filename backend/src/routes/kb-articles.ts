import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as kbArticleController from '../controllers/kb-articles';

const router = Router();

router.use(authMiddleware);

// GET /api/kb/articles - Получить все статьи
router.get('/', kbArticleController.getAllArticles);

// POST /api/kb/articles/search - Семантический поиск по статьям (ВАЖНО: до /:id)
router.post('/search', kbArticleController.searchArticles);

// GET /api/kb/articles/:id - Получить статью по ID
router.get('/:id', kbArticleController.getArticleById);

// POST /api/kb/articles - Создать статью
router.post('/', kbArticleController.createArticle);

// PUT /api/kb/articles/:id - Обновить статью
router.put('/:id', kbArticleController.updateArticle);

// DELETE /api/kb/articles/:id - Удалить статью
router.delete('/:id', kbArticleController.deleteArticle);

// PATCH /api/kb/articles/:id/toggle - Переключить активность статьи
router.patch('/:id/toggle', kbArticleController.toggleArticleStatus);

export default router;
