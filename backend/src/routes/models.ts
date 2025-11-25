import { Router } from 'express';
import { getModels } from '../controllers/models';

const router = Router();

// GET /api/models - Get all available LLM models
router.get('/', getModels);

export default router;
