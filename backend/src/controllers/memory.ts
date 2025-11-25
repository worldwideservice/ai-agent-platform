import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { Pool } from 'pg';
import {
  createMemoryNode,
  createMemoryEdge,
  getMemoryGraphNode,
  searchMemoryNodes,
  getAgentContext,
  updateNodeImportance,
  deleteMemoryNode,
  traverseMemoryGraph,
  storeConversationMemory,
} from '../services/memory.service';
import { semanticSearch } from '../services/embeddings.service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/agents/:agentId/memory/nodes
 * Создать узел памяти
 */
export const createNode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { nodeType, content, metadata, importance } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const nodeId = await createMemoryNode(pool, {
      agentId,
      userId,
      nodeType,
      content,
      metadata,
      importance,
    });

    return res.json({ success: true, nodeId });
  } catch (error: any) {
    console.error('Error creating memory node:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/memory/edges
 * Создать связь между узлами
 */
export const createEdge = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { sourceNodeId, targetNodeId, edgeType, weight, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const edgeId = await createMemoryEdge(pool, {
      agentId,
      sourceNodeId,
      targetNodeId,
      edgeType,
      weight,
      metadata,
    });

    return res.json({ success: true, edgeId });
  } catch (error: any) {
    console.error('Error creating memory edge:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/memory/nodes/:nodeId
 * Получить узел с его связями
 */
export const getNode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, nodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const node = await getMemoryGraphNode(pool, nodeId);

    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }

    return res.json(node);
  } catch (error: any) {
    console.error('Error getting memory node:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/memory/search
 * Семантический поиск по памяти
 */
export const searchNodes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { query, limit, nodeTypes, threshold } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const nodes = await searchMemoryNodes(pool, {
      agentId,
      userId,
      query,
      limit,
      nodeTypes,
      threshold,
    });

    return res.json({ nodes });
  } catch (error: any) {
    console.error('Error searching memory nodes:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/agents/:agentId/memory/context
 * Получить текущий контекст агента
 */
export const getContext = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { limit, minImportance } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const context = await getAgentContext(pool, {
      agentId,
      limit: limit ? parseInt(limit as string) : undefined,
      minImportance: minImportance ? parseFloat(minImportance as string) : undefined,
    });

    return res.json({ context });
  } catch (error: any) {
    console.error('Error getting agent context:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PATCH /api/agents/:agentId/memory/nodes/:nodeId/importance
 * Обновить важность узла
 */
export const updateImportance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, nodeId } = req.params;
    const { importance } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await updateNodeImportance(pool, nodeId, importance);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating node importance:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/agents/:agentId/memory/nodes/:nodeId
 * Удалить узел памяти
 */
export const deleteNode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId, nodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await deleteMemoryNode(pool, nodeId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting memory node:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/memory/traverse
 * Обход графа памяти
 */
export const traverseGraph = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { startNodeId, maxDepth, edgeTypes } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const nodes = await traverseMemoryGraph(pool, {
      startNodeId,
      maxDepth,
      edgeTypes,
    });

    return res.json({ nodes });
  } catch (error: any) {
    console.error('Error traversing memory graph:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/memory/conversation
 * Сохранить разговор в память
 */
export const storeConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { userMessage, agentResponse, extractedFacts } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const conversationNodeId = await storeConversationMemory(pool, {
      agentId,
      userId,
      userMessage,
      agentResponse,
      extractedFacts,
    });

    return res.json({ success: true, conversationNodeId });
  } catch (error: any) {
    console.error('Error storing conversation memory:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/agents/:agentId/memory/semantic-search
 * Семантический поиск по всем источникам
 */
export const semanticSearchAll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const { query, limit, sourceTypes, threshold } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const results = await semanticSearch(pool, {
      userId,
      query,
      limit,
      sourceTypes,
      threshold,
    });

    return res.json({ results });
  } catch (error: any) {
    console.error('Error in semantic search:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
