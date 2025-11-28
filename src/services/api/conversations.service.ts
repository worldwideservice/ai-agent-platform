import { apiClient } from './apiClient';

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount?: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  sources?: MessageSources;
  createdAt: string;
}

export interface MessageSources {
  knowledgeBase?: {
    articles: Array<{
      id: number;
      title: string;
      categoryName?: string;
      relevanceScore?: number;
    }>;
  };
  trainingRole?: {
    id: string;
    name: string;
  };
  triggers?: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
  pipeline?: {
    pipelineId: string;
    stageId: string;
  };
}

export const conversationsService = {
  async getConversations(agentId?: string): Promise<Conversation[]> {
    const params = agentId ? `?agentId=${agentId}` : '';
    const response = await apiClient.get(`/conversations${params}`);
    return response.data.conversations;
  },

  async createConversation(agentId: string, title?: string): Promise<Conversation> {
    const response = await apiClient.post('/conversations', { agentId, title });
    return response.data.conversation;
  },

  async getConversation(id: string): Promise<{ conversation: Conversation & { messages: ConversationMessage[] } }> {
    const response = await apiClient.get(`/conversations/${id}`);
    return response.data;
  },

  async updateConversation(id: string, title: string): Promise<void> {
    await apiClient.put(`/conversations/${id}`, { title });
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/conversations/${id}`);
  },

  async addMessage(
    conversationId: string,
    role: 'user' | 'model',
    content: string,
    sources?: MessageSources
  ): Promise<ConversationMessage> {
    const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
      role,
      content,
      sources,
    });
    return response.data.message;
  },
};

export default conversationsService;
