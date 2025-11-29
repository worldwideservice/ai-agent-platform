import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as kbArticleController from '../controllers/kb-articles';
import * as kbArticleFilesController from '../controllers/kb-article-files';

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

// --- File uploads for articles ---

// GET /api/kb/articles/:articleId/files - Получить все файлы статьи
router.get('/:articleId/files', kbArticleFilesController.getFiles);

// POST /api/kb/articles/:articleId/files - Загрузить файл
router.post('/:articleId/files', kbArticleFilesController.uploadMiddleware, kbArticleFilesController.uploadFile);

// POST /api/kb/articles/:articleId/files/multiple - Загрузить несколько файлов
router.post('/:articleId/files/multiple', kbArticleFilesController.uploadMultipleMiddleware, kbArticleFilesController.uploadMultipleFiles);

// GET /api/kb/articles/:articleId/files/thumbnail/:thumbnailKey - Получить миниатюру
router.get('/:articleId/files/thumbnail/:thumbnailKey', kbArticleFilesController.getThumbnail);

// GET /api/kb/articles/:articleId/files/:fileId/download - Скачать файл
router.get('/:articleId/files/:fileId/download', kbArticleFilesController.downloadFile);

// DELETE /api/kb/articles/:articleId/files/:fileId - Удалить файл
router.delete('/:articleId/files/:fileId', kbArticleFilesController.deleteFile);

export default router;
