import { Router } from 'express';
import {
  createChain,
  getChains,
  getChainById,
  updateChain,
  deleteChain,
} from '../controllers/chains';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Все эндпоинты требуют аутентификацию
router.use(authenticateToken);

// POST /api/agents/:agentId/chains - Создать цепочку
router.post('/:agentId/chains', createChain);

// GET /api/agents/:agentId/chains - Получить все цепочки
router.get('/:agentId/chains', getChains);

// GET /api/agents/:agentId/chains/:chainId - Получить цепочку по ID
router.get('/:agentId/chains/:chainId', getChainById);

// PUT /api/agents/:agentId/chains/:chainId - Обновить цепочку
router.put('/:agentId/chains/:chainId', updateChain);

// DELETE /api/agents/:agentId/chains/:chainId - Удалить цепочку
router.delete('/:agentId/chains/:chainId', deleteChain);

export default router;
