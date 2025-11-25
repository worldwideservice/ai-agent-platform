import { Router } from 'express';
import {
  analyzeFiles,
  executeImport,
  getImportStatus,
  uploadMiddleware,
} from '../controllers/kb-import';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All endpoints require authentication
router.use(authenticateToken);

// POST /api/kb/import/analyze - Upload and analyze files
router.post('/analyze', uploadMiddleware, analyzeFiles);

// POST /api/kb/import/execute - Execute KB creation
router.post('/execute', executeImport);

// GET /api/kb/import/status/:jobId - Get import job status
router.get('/status/:jobId', getImportStatus);

export default router;
