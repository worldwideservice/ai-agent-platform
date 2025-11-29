import { Pool } from 'pg';
import { createAndSaveEmbedding, semanticSearch } from './embeddings.service';
import { chatCompletion } from './openrouter.service';

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
    leadId?: number; // ID лида/клиента для привязки фактов
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
    leadId,
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
      id, agent_id, user_id, lead_id, node_type, name, content, properties,
      importance, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
    ) RETURNING id`,
    [agentId, userId, leadId || null, nodeType, nodeName, content, JSON.stringify(metadata), importance]
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
    agentId: _agentId, // Reserved for future filtering by agent
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
  _updateAccess: boolean = true // Reserved for future last_accessed_at update
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
    ...outgoing.map((e: MemoryEdge) => e.targetNodeId),
    ...incoming.map((e: MemoryEdge) => e.sourceNodeId),
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
    leadId?: number; // Фильтр по конкретному лиду
    query: string;
    limit?: number;
    nodeTypes?: MemoryNode['nodeType'][];
    threshold?: number;
  }
): Promise<MemoryNode[]> {
  const { agentId: _agentId, userId, leadId, query, limit = 10, nodeTypes, threshold = 0.7 } = params;

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
  let paramIndex = 2;

  // Фильтр по leadId если указан
  if (leadId) {
    queryStr += ` AND lead_id = $${paramIndex}`;
    params_array.push(leadId);
    paramIndex++;
  }

  if (nodeTypes && nodeTypes.length > 0) {
    queryStr += ` AND node_type = ANY($${paramIndex}::text[])`;
    params_array.push(nodeTypes);
  }

  const result = await pool.query(queryStr, params_array);

  // Сортируем по релевантности из semantic search
  const nodeMap = new Map(result.rows.map((row: any) => [row.id, convertRowToMemoryNode(row)]));
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
    leadId?: number; // ID лида для привязки фактов к конкретному клиенту
    userMessage: string;
    agentResponse: string;
    extractedFacts?: string[];
  }
): Promise<string> {
  const { agentId, userId, leadId, userMessage, agentResponse, extractedFacts = [] } = params;

  // Создаем узел для разговора
  const conversationNodeId = await createMemoryNode(pool, {
    agentId,
    userId,
    leadId,
    nodeType: 'conversation',
    content: `User: ${userMessage}\nAgent: ${agentResponse}`,
    metadata: {
      userMessage,
      agentResponse,
      leadId,
      timestamp: new Date().toISOString(),
    },
    importance: 0.4,
  });

  // Создаем узлы для извлеченных фактов
  for (const fact of extractedFacts) {
    const factNodeId = await createMemoryNode(pool, {
      agentId,
      userId,
      leadId,
      nodeType: 'fact',
      content: fact,
      metadata: { extractedFrom: conversationNodeId, leadId },
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

/**
 * Извлекает важные факты из разговора с помощью AI и сохраняет в память
 * AI читает системные инструкции агента и сам понимает что важно запомнить
 */
export async function extractAndStoreMemoryFacts(
  pool: Pool,
  params: {
    agentId: string;
    userId: string;
    leadId?: number; // ID лида для привязки фактов к конкретному клиенту
    userMessage: string;
    agentResponse: string;
    existingFacts?: string[]; // Уже известные факты для избежания дубликатов
    systemInstructions?: string; // Инструкции агента для понимания контекста
    model?: string; // AI модель для извлечения фактов
  }
): Promise<{ factsExtracted: string[]; nodeId: string | null }> {
  const { agentId, userId, leadId, userMessage, agentResponse, existingFacts = [], systemInstructions = '', model = 'openai/gpt-4o-mini' } = params;

  try {
    // Формируем контекст на основе инструкций агента
    const contextSection = systemInstructions
      ? `
## КОНТЕКСТ АГЕНТА (что важно для этого бизнеса):
${systemInstructions}

На основе этого контекста определи, какая информация о клиенте будет полезна для агента.`
      : '';

    // Используем AI для извлечения фактов
    const result = await chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: `Ты - система извлечения фактов о клиенте из разговора.

ЗАДАЧА: Проанализируй сообщение клиента и ответ менеджера. Извлеки ТОЛЬКО важные факты о клиенте, которые будут полезны в будущих разговорах.
${contextSection}

БАЗОВЫЕ КАТЕГОРИИ ФАКТОВ (если контекст не указан):
- Имя, должность, компания
- Бюджет и финансовые ограничения
- Потребности и задачи клиента
- Сроки и дедлайны
- Контактные данные
- Проблемы и боли
- Предпочтения и пожелания
- Возражения и сомнения
- Откуда узнал о компании
- Опыт использования похожих решений
- Кто принимает решения
- Конкуренты которых рассматривает

ЧТО НЕ ИЗВЛЕКАТЬ:
- Общие фразы ("клиент здоровается", "клиент спрашивает")
- Информацию о менеджере/агенте
- Повторения уже известных фактов

ФОРМАТ ОТВЕТА: JSON массив строк, каждая строка - один конкретный факт.
Если новых фактов нет - верни пустой массив [].`,
        },
        {
          role: 'user',
          content: `Уже известные факты о клиенте:
${existingFacts.length > 0 ? existingFacts.map(f => `- ${f}`).join('\n') : '(пока нет)'}

---
СООБЩЕНИЕ КЛИЕНТА:
${userMessage}

ОТВЕТ МЕНЕДЖЕРА:
${agentResponse}

---
Извлеки новые факты (JSON массив):`,
        },
      ],
      temperature: 0.2, // Низкая температура для точности
      max_tokens: 500,
    });

    const responseText = result.choices[0]?.message?.content || '[]';

    // Парсим JSON ответ
    let extractedFacts: string[] = [];
    try {
      // Убираем возможные markdown-блоки
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedFacts = JSON.parse(cleanJson);

      if (!Array.isArray(extractedFacts)) {
        extractedFacts = [];
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse facts JSON, skipping memory storage');
      return { factsExtracted: [], nodeId: null };
    }

    // Если нет новых фактов - ничего не сохраняем
    if (extractedFacts.length === 0) {
      console.log('📝 No new facts extracted from conversation');
      return { factsExtracted: [], nodeId: null };
    }

    console.log(`📝 Extracted ${extractedFacts.length} facts: ${extractedFacts.join('; ')}`);

    // Сохраняем в память
    const nodeId = await storeConversationMemory(pool, {
      agentId,
      userId,
      leadId,
      userMessage,
      agentResponse,
      extractedFacts,
    });

    return { factsExtracted: extractedFacts, nodeId };
  } catch (error) {
    console.error('Error extracting memory facts:', error);
    return { factsExtracted: [], nodeId: null };
  }
}

/**
 * Получает существующие факты о клиенте для контекста
 * Возвращает текстовую строку для добавления в промпт
 *
 * @param semanticSearchEnabled - если true, ищет по смыслу через embeddings
 *                                если false, просто берёт последние N фактов по lead_id
 */
export async function getClientMemoryContext(
  pool: Pool,
  params: {
    agentId: string;
    userId: string;
    leadId?: number; // ID лида для поиска фактов именно по этому клиенту
    currentMessage: string;
    limit?: number;
    semanticSearchEnabled?: boolean; // Включить поиск по смыслу (default: true)
  }
): Promise<{ context: string; facts: string[]; nodeIds: string[] }> {
  const { agentId, userId, leadId, currentMessage, limit = 10, semanticSearchEnabled = true } = params;

  try {
    // Если семантический поиск ВЫКЛЮЧЕН - просто берём последние факты по lead_id
    if (!semanticSearchEnabled) {
      console.log('🔍 Semantic search disabled, using direct query by lead_id');
      return await getFactsByLeadId(pool, { agentId, leadId, limit });
    }

    // 1. Семантический поиск по текущему сообщению (с фильтром по leadId)
    const relevantNodes = await searchMemoryNodes(pool, {
      agentId,
      userId,
      leadId, // Фильтруем только по этому клиенту
      query: currentMessage,
      limit: limit,
      nodeTypes: ['fact', 'entity', 'goal'], // Только факты и сущности
      threshold: 0.5, // Мягкий порог для лучшего recall
    });

    if (relevantNodes.length === 0) {
      // 2. Если ничего не нашли через семантику - fallback на простой поиск
      console.log('🔍 No semantic results, falling back to direct query');
      return await getFactsByLeadId(pool, { agentId, leadId, limit: 5 });
    }

    const facts = relevantNodes.map(n => n.content);
    const nodeIds = relevantNodes.map(n => n.id);
    const context = buildMemoryContextPrompt(facts);
    console.log(`🧠 Semantic search found ${facts.length} relevant facts`);
    return { context, facts, nodeIds };
  } catch (error) {
    console.error('Error getting client memory context:', error);
    return { context: '', facts: [], nodeIds: [] };
  }
}

/**
 * Простой поиск фактов по lead_id без семантики
 * Берёт последние факты отсортированные по важности и дате
 */
async function getFactsByLeadId(
  pool: Pool,
  params: { agentId: string; leadId?: number; limit: number }
): Promise<{ context: string; facts: string[]; nodeIds: string[] }> {
  const { agentId, leadId, limit } = params;

  if (!leadId) {
    return { context: '', facts: [], nodeIds: [] };
  }

  const directResult = await pool.query(
    `SELECT * FROM memory_nodes
     WHERE agent_id = $1 AND lead_id = $2 AND importance >= 0.4
     ORDER BY importance DESC, created_at DESC
     LIMIT $3`,
    [agentId, leadId, limit]
  );

  if (directResult.rows.length === 0) {
    return { context: '', facts: [], nodeIds: [] };
  }

  const facts = directResult.rows.map((row: any) => row.content);
  const nodeIds = directResult.rows.map((row: any) => row.id);
  const context = buildMemoryContextPrompt(facts);
  console.log(`📋 Direct query found ${facts.length} facts for lead ${leadId}`);
  return { context, facts, nodeIds };
}

/**
 * Формирует текст контекста памяти для системного промпта
 */
function buildMemoryContextPrompt(facts: string[]): string {
  if (facts.length === 0) return '';

  return `

## Информация о клиенте (из предыдущих разговоров)

${facts.map(f => `• ${f}`).join('\n')}

ВАЖНО: Используй эту информацию в разговоре. Обращайся к клиенту по имени если оно известно. Не спрашивай повторно то, что уже знаешь.`;
}

/**
 * Получает контекст связей графа памяти
 * Ищет связи между фактами, компаниями, людьми
 */
export async function getGraphRelatedContext(
  pool: Pool,
  params: {
    agentId: string;
    nodeIds: string[]; // ID узлов для поиска связей
    limit?: number;
  }
): Promise<{ context: string; relations: string[] }> {
  const { agentId, nodeIds, limit = 5 } = params;

  if (nodeIds.length === 0) {
    return { context: '', relations: [] };
  }

  try {
    // Находим связи для указанных узлов
    const edgesResult = await pool.query(
      `SELECT DISTINCT
        me.relationship_type,
        source.name as source_name,
        source.node_type as source_type,
        target.name as target_name,
        target.node_type as target_type
       FROM memory_edges me
       JOIN memory_nodes source ON me.from_node_id = source.id
       JOIN memory_nodes target ON me.to_node_id = target.id
       WHERE (me.from_node_id = ANY($1::text[]) OR me.to_node_id = ANY($1::text[]))
         AND source.agent_id = $2
       LIMIT $3`,
      [nodeIds, agentId, limit]
    );

    if (edgesResult.rows.length === 0) {
      return { context: '', relations: [] };
    }

    // Формируем читаемые связи
    const relations = edgesResult.rows.map((row: any) => {
      const relType = formatRelationType(row.relationship_type);
      return `${row.source_name} ${relType} ${row.target_name}`;
    });

    const context = `

## Связи и контекст (из графа знаний)

${relations.map(r => `• ${r}`).join('\n')}

Используй эти связи для понимания контекста клиента и его окружения.`;

    console.log(`🔗 Graph context loaded: ${relations.length} relations`);
    return { context, relations };
  } catch (error) {
    console.error('Error getting graph context:', error);
    return { context: '', relations: [] };
  }
}

/**
 * Форматирует тип связи в читаемый вид
 */
function formatRelationType(type: string): string {
  const typeMap: Record<string, string> = {
    'works_at': 'работает в',
    'knows': 'знает',
    'partner_of': 'партнёр',
    'mentions': 'упоминает',
    'related_to': 'связан с',
    'extracted_from': 'извлечено из',
    'belongs_to': 'принадлежит',
  };
  return typeMap[type] || type.replace(/_/g, ' ');
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
