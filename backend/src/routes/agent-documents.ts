import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  uploadDocument,
  uploadMiddleware,
  getDocuments,
  getThumbnail,
  getDocumentFile,
  updateDocument,
  deleteDocument,
  toggleAllDocuments,
} from '../controllers/agent-documents';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить миниатюру (публичный доступ для показа в UI)
router.get('/:agentId/documents/thumbnail/:thumbnailKey', getThumbnail);

// Получить файл документа
router.get('/:agentId/documents/file/:documentId', getDocumentFile);

// Получить все документы агента
router.get('/:agentId/documents', getDocuments);

// Загрузить новый документ
router.post('/:agentId/documents', uploadMiddleware, uploadDocument);

// Обновить документ (включить/выключить)
router.patch('/:agentId/documents/:documentId', updateDocument);

// Включить/выключить все документы
router.patch('/:agentId/documents-toggle-all', toggleAllDocuments);

// Удалить документ
router.delete('/:agentId/documents/:documentId', deleteDocument);

export default router;
