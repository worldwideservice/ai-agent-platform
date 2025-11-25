import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createNode,
  createEdge,
  getNode,
  searchNodes,
  getContext,
  updateImportance,
  deleteNode,
  traverseGraph,
  storeConversation,
  semanticSearchAll,
} from '../controllers/memory';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

// Memory nodes
router.post('/:agentId/memory/nodes', createNode);
router.get('/:agentId/memory/nodes/:nodeId', getNode);
router.delete('/:agentId/memory/nodes/:nodeId', deleteNode);
router.patch('/:agentId/memory/nodes/:nodeId/importance', updateImportance);

// Memory edges
router.post('/:agentId/memory/edges', createEdge);

// Search and context
router.post('/:agentId/memory/search', searchNodes);
router.post('/:agentId/memory/semantic-search', semanticSearchAll);
router.get('/:agentId/memory/context', getContext);

// Graph traversal
router.post('/:agentId/memory/traverse', traverseGraph);

// Conversation storage
router.post('/:agentId/memory/conversation', storeConversation);

export default router;
