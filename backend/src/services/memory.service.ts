import { Pool } from 'pg';
import { createAndSaveEmbedding, semanticSearch, EmbeddingSearchResult } from './embeddings.service';

/**
 * Memory Service
 * Управление Knowledge Graph для агента
 * Использует memory_nodes (узлы) и memory_edges (связи) для построения графа памяти
 */

export interface MemoryNode {
  id: string;
  agentId: string;
  nodeType: 'entity' | 'concept' | 'event' | 'fact' | 'goal' | 'task' | 'conversation';
  content: string;
  metadata: Record<string, any>;
  importance: number; // 0-1, важность узла
  lastAccessed: Date;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryEdge {
  id: string;
  agentId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'relates_to' | 'causes' | 'part_of' | 'similar_to' | 'mentions' | 'leads_to' | 'requires';
  weight: number; // 0-1, сила связи
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface MemoryGraphNode extends MemoryNode {
  edges: {
    outgoing: MemoryEdge[];
    incoming: MemoryEdge[];
  };
  relatedNodes?: MemoryNode[];
}

/**
 * Создание узла памяти
 */
export async function createMemoryNode(
  pool: Pool,
  params: {
    agentId: string;
    userId: string;
    nodeType: MemoryNode['nodeType'];
    content: string;
    metadata?: Record<string, any>;
    importance?: number;
    name?: string;
  }
): Promise<string> {
  const {
    agentId,
    userId,
    nodeType,
    content,
    metadata = {},
    importance = 0.5,
    name,
  } = params;

  // Генерируем имя из content если не указано (берем первые 50 символов)
  const nodeName = name || content.substring(0, 50);

  // Создаем узел (адаптация под реальную схему БД)
  const result = await pool.query(
    `INSERT INTO memory_nodes (
      id, agent_id, user_id, node_type, name, content, properties,
      importance, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    ) RETURNING id`,
    [agentId, userId, nodeType, nodeName, content, JSON.stringify(metadata), importance]
  );

  const nodeId = result.rows[0].id;

  // Создаем embedding для семантического поиска
  await createAndSaveEmbedding(pool, {
    userId,
    content,
    sourceType: 'memory_node',
    sourceId: nodeId,
    metadata: { nodeType, ...metadata },
  });

  return nodeId;
}

/**
 * Создание связи между узлами
 */
export async function createMemoryEdge(
  pool: Pool,
  params: {
    agentId: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: MemoryEdge['edgeType'];
    weight?: number;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  const {
    agentId,
    sourceNodeId,
    targetNodeId,
    edgeType,
    weight = 1.0,
    metadata = {},
  } = params;

  const result = await pool.query(
    `INSERT INTO memory_edges (
      id, from_node_id, to_node_id,
      relationship_type, weight, metadata, created_at
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW()
    ) RETURNING id`,
    [sourceNodeId, targetNodeId, edgeType, weight, JSON.stringify(metadata)]
  );

  return result.rows[0].id;
}

/**
 * Получение узла по ID
 */
export async function getMemoryNode(
  pool: Pool,
  nodeId: string,
  updateAccess: boolean = true
): Promise<MemoryNode | null> {
  const result = await pool.query(
    `SELECT * FROM memory_nodes WHERE id = $1`,
    [nodeId]
  );

  if (result.rows.length === 0) return null;

  return convertRowToMemoryNode(result.rows[0]);
}

/**
 * Получение узла с его связями
 */
export async function getMemoryGraphNode(
  pool: Pool,
  nodeId: string
): Promise<MemoryGraphNode | null> {
  const node = await getMemoryNode(pool, nodeId);
  if (!node) return null;

  // Получаем исходящие связи
  const outgoingResult = await pool.query(
    `SELECT * FROM memory_edges WHERE from_node_id = $1`,
    [nodeId]
  );

  // Получаем входящие связи
  const incomingResult = await pool.query(
    `SELECT * FROM memory_edges WHERE to_node_id = $1`,
    [nodeId]
  );

  const outgoing = outgoingResult.rows.map(convertRowToMemoryEdge);
  const incoming = incomingResult.rows.map(convertRowToMemoryEdge);

  // Получаем связанные узлы
  const relatedNodeIds = [
    ...outgoing.map((e) => e.targetNodeId),
    ...incoming.map((e) => e.sourceNodeId),
  ];

  let relatedNodes: MemoryNode[] = [];
  if (relatedNodeIds.length > 0) {
    const nodesResult = await pool.query(
      `SELECT * FROM memory_nodes WHERE id = ANY($1::text[])`,
      [relatedNodeIds]
    );
    relatedNodes = nodesResult.rows.map(convertRowToMemoryNode);
  }

  return {
    ...node,
    edges: { outgoing, incoming },
    relatedNodes,
  };
}

/**
 * Поиск узлов по семантическому сходству
 */
export async function searchMemoryNodes(
  pool: Pool,
  params: {
    agentId: string;
    userId: string;
    query: string;
    limit?: number;
    nodeTypes?: MemoryNode['nodeType'][];
    threshold?: number;
  }
): Promise<MemoryNode[]> {
  const { agentId, userId, query, limit = 10, nodeTypes, threshold = 0.7 } = params;

  // Используем семантический поиск
  const searchResults = await semanticSearch(pool, {
    userId,
    query,
    limit,
    threshold,
    sourceTypes: ['memory_node'],
  });

  if (searchResults.length === 0) return [];

  // Получаем полные данные узлов
  const nodeIds = searchResults.map((r) => r.sourceId);
  let queryStr = `SELECT * FROM memory_nodes WHERE id = ANY($1::text[])`;
  const params_array: any[] = [nodeIds];

  if (nodeTypes && nodeTypes.length > 0) {
    queryStr += ` AND node_type = ANY($2::text[])`;
    params_array.push(nodeTypes);
  }

  const result = await pool.query(queryStr, params_array);

  // Сортируем по релевантности из semantic search
  const nodeMap = new Map(result.rows.map((row) => [row.id, convertRowToMemoryNode(row)]));
  return nodeIds.map((id) => nodeMap.get(id)).filter(Boolean) as MemoryNode[];
}

/**
 * Получение контекста для агента (важные и недавние узлы)
 */
export async function getAgentContext(
  pool: Pool,
  params: {
    agentId: string;
    limit?: number;
    minImportance?: number;
  }
): Promise<MemoryNode[]> {
  const { agentId, limit = 20, minImportance = 0.3 } = params;

  // Получаем важные и недавно созданные узлы (last_accessed не существует в схеме)
  const result = await pool.query(
    `SELECT * FROM memory_nodes
     WHERE agent_id = $1 AND importance >= $2
     ORDER BY importance DESC, created_at DESC
     LIMIT $3`,
    [agentId, minImportance, limit]
  );

  return result.rows.map(convertRowToMemoryNode);
}

/**
 * Обновление важности узла
 */
export async function updateNodeImportance(
  pool: Pool,
  nodeId: string,
  importance: number
): Promise<void> {
  await pool.query(
    `UPDATE memory_nodes
     SET importance = $1, updated_at = NOW()
     WHERE id = $2`,
    [importance, nodeId]
  );
}

/**
 * Удаление узла и его связей
 */
export async function deleteMemoryNode(
  pool: Pool,
  nodeId: string
): Promise<void> {
  // Удаляем связи
  await pool.query(
    'DELETE FROM memory_edges WHERE from_node_id = $1 OR to_node_id = $1',
    [nodeId]
  );

  // Удаляем embeddings
  await pool.query(
    "DELETE FROM embeddings WHERE source_type = 'memory_node' AND source_id = $1",
    [nodeId]
  );

  // Удаляем узел
  await pool.query('DELETE FROM memory_nodes WHERE id = $1', [nodeId]);
}

/**
 * Обход графа в ширину (BFS) для поиска связанных узлов
 */
export async function traverseMemoryGraph(
  pool: Pool,
  params: {
    startNodeId: string;
    maxDepth?: number;
    edgeTypes?: MemoryEdge['edgeType'][];
  }
): Promise<MemoryNode[]> {
  const { startNodeId, maxDepth = 2, edgeTypes } = params;

  const visited = new Set<string>();
  const result: MemoryNode[] = [];
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: startNodeId, depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.add(nodeId);

    const node = await getMemoryNode(pool, nodeId, false);
    if (!node) continue;

    result.push(node);

    // Получаем исходящие связи
    let edgeQuery = 'SELECT * FROM memory_edges WHERE from_node_id = $1';
    const edgeParams: any[] = [nodeId];

    if (edgeTypes && edgeTypes.length > 0) {
      edgeQuery += ' AND relationship_type = ANY($2::text[])';
      edgeParams.push(edgeTypes);
    }

    const edges = await pool.query(edgeQuery, edgeParams);

    for (const edge of edges.rows) {
      if (!visited.has(edge.to_node_id)) {
        queue.push({ nodeId: edge.to_node_id, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Сохранение фактов из разговора в память
 */
export async function storeConversationMemory(
  pool: Pool,
  params: {
    agentId: string;
    userId: string;
    userMessage: string;
    agentResponse: string;
    extractedFacts?: string[];
  }
): Promise<string> {
  const { agentId, userId, userMessage, agentResponse, extractedFacts = [] } = params;

  // Создаем узел для разговора
  const conversationNodeId = await createMemoryNode(pool, {
    agentId,
    userId,
    nodeType: 'conversation',
    content: `User: ${userMessage}\nAgent: ${agentResponse}`,
    metadata: {
      userMessage,
      agentResponse,
      timestamp: new Date().toISOString(),
    },
    importance: 0.4,
  });

  // Создаем узлы для извлеченных фактов
  for (const fact of extractedFacts) {
    const factNodeId = await createMemoryNode(pool, {
      agentId,
      userId,
      nodeType: 'fact',
      content: fact,
      metadata: { extractedFrom: conversationNodeId },
      importance: 0.6,
    });

    // Создаем связь
    await createMemoryEdge(pool, {
      agentId,
      sourceNodeId: conversationNodeId,
      targetNodeId: factNodeId,
      edgeType: 'mentions',
      weight: 0.7,
    });
  }

  return conversationNodeId;
}

// ============================================================================
// Helper Functions
// ============================================================================

function convertRowToMemoryNode(row: any): MemoryNode {
  return {
    id: row.id,
    agentId: row.agent_id,
    nodeType: row.node_type,
    content: row.content,
    metadata: row.metadata || {},
    importance: parseFloat(row.importance),
    lastAccessed: row.last_accessed,
    accessCount: parseInt(row.access_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function convertRowToMemoryEdge(row: any): MemoryEdge {
  return {
    id: row.id,
    agentId: '', // Not stored in database
    sourceNodeId: row.from_node_id,
    targetNodeId: row.to_node_id,
    edgeType: row.relationship_type,
    weight: parseFloat(row.weight),
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}
