import apiClient from './apiClient';

export type NodeType = 'entity' | 'concept' | 'event' | 'fact' | 'goal' | 'task' | 'conversation';
export type EdgeType = 'relates_to' | 'causes' | 'part_of' | 'similar_to' | 'mentions' | 'leads_to' | 'requires';

export interface MemoryNode {
  id: string;
  agentId: string;
  nodeType: NodeType;
  content: string;
  metadata: Record<string, any>;
  importance: number;
  lastAccessed: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEdge {
  id: string;
  agentId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  weight: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface MemoryGraphNode extends MemoryNode {
  edges: {
    outgoing: MemoryEdge[];
    incoming: MemoryEdge[];
  };
  relatedNodes?: MemoryNode[];
}

export interface CreateNodeRequest {
  nodeType: NodeType;
  content: string;
  metadata?: Record<string, any>;
  importance?: number;
}

export interface CreateEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  nodeTypes?: NodeType[];
  threshold?: number;
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  sourceTypes?: string[];
  threshold?: number;
}

export interface TraverseRequest {
  startNodeId: string;
  maxDepth?: number;
  edgeTypes?: EdgeType[];
}

export interface StoreConversationRequest {
  userMessage: string;
  agentResponse: string;
  extractedFacts?: string[];
}

class MemoryService {
  /**
   * Создать узел памяти
   */
  async createNode(agentId: string, data: CreateNodeRequest): Promise<{ success: boolean; nodeId: string }> {
    const response = await apiClient.post<{ success: boolean; nodeId: string }>(
      `/agents/${agentId}/memory/nodes`,
      data
    );
    return response.data;
  }

  /**
   * Создать связь между узлами
   */
  async createEdge(agentId: string, data: CreateEdgeRequest): Promise<{ success: boolean; edgeId: string }> {
    const response = await apiClient.post<{ success: boolean; edgeId: string }>(
      `/agents/${agentId}/memory/edges`,
      data
    );
    return response.data;
  }

  /**
   * Получить узел с его связями
   */
  async getNode(agentId: string, nodeId: string): Promise<MemoryGraphNode> {
    const response = await apiClient.get<MemoryGraphNode>(
      `/agents/${agentId}/memory/nodes/${nodeId}`
    );
    return response.data;
  }

  /**
   * Семантический поиск по узлам памяти
   */
  async searchNodes(agentId: string, data: SearchRequest): Promise<{ nodes: MemoryNode[] }> {
    const response = await apiClient.post<{ nodes: MemoryNode[] }>(
      `/agents/${agentId}/memory/search`,
      data
    );
    return response.data;
  }

  /**
   * Получить контекст агента
   */
  async getContext(
    agentId: string,
    limit?: number,
    minImportance?: number
  ): Promise<{ context: MemoryNode[] }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (minImportance) params.append('minImportance', minImportance.toString());

    const response = await apiClient.get<{ context: MemoryNode[] }>(
      `/agents/${agentId}/memory/context?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Обновить важность узла
   */
  async updateImportance(
    agentId: string,
    nodeId: string,
    importance: number
  ): Promise<{ success: boolean }> {
    const response = await apiClient.patch<{ success: boolean }>(
      `/agents/${agentId}/memory/nodes/${nodeId}/importance`,
      { importance }
    );
    return response.data;
  }

  /**
   * Удалить узел
   */
  async deleteNode(agentId: string, nodeId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/agents/${agentId}/memory/nodes/${nodeId}`
    );
    return response.data;
  }

  /**
   * Обход графа памяти
   */
  async traverseGraph(agentId: string, data: TraverseRequest): Promise<{ nodes: MemoryNode[] }> {
    const response = await apiClient.post<{ nodes: MemoryNode[] }>(
      `/agents/${agentId}/memory/traverse`,
      data
    );
    return response.data;
  }

  /**
   * Сохранить разговор в память
   */
  async storeConversation(
    agentId: string,
    data: StoreConversationRequest
  ): Promise<{ success: boolean; conversationNodeId: string }> {
    const response = await apiClient.post<{ success: boolean; conversationNodeId: string }>(
      `/agents/${agentId}/memory/conversation`,
      data
    );
    return response.data;
  }

  /**
   * Семантический поиск по всем источникам
   */
  async semanticSearch(
    agentId: string,
    data: SemanticSearchRequest
  ): Promise<{ results: any[] }> {
    const response = await apiClient.post<{ results: any[] }>(
      `/agents/${agentId}/memory/semantic-search`,
      data
    );
    return response.data;
  }
}

export const memoryService = new MemoryService();
export default memoryService;
