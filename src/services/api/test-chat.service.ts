/**
 * Test Chat Service
 * API для полноценного тестового чата с агентом
 */

import { apiClient } from "./apiClient";

// Типы
export interface TestConversation {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "model";
  content: string;
  sources?: MessageSources;
  createdAt: string;
}

export interface AttachedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  thumbnailUrl?: string;
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
  memory?: {
    factsCount: number;
    facts: string[];
  };
  graph?: {
    relationsCount: number;
  };
  documents?: {
    count: number;
  };
  attachedDocuments?: AttachedDocument[];
  triggers?: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
}

export interface AgentInfo {
  agent: {
    id: string;
    name: string;
    model: string;
    isActive: boolean;
  };
  settings: {
    hasSystemInstructions: boolean;
    systemInstructionsLength: number;
    hasRole: boolean;
    roleName?: string;
    hasKnowledgeBase: boolean;
    kbArticlesCount: number;
    hasDocuments: boolean;
    documentsCount: number;
    hasTrigggers: boolean;
    triggersCount: number;
    memoryEnabled: boolean;
    graphEnabled: boolean;
    autoDetectLanguage: boolean;
    responseLanguage?: string;
    scheduleEnabled: boolean;
  };
}

export interface SendMessageResponse {
  response: string;
  conversationId: string;
  sources?: MessageSources;
  model: string;
  attachedDocuments?: AttachedDocument[];
  triggeredActions?: string[];
}

/**
 * Создать новый тестовый разговор
 */
export async function createConversation(
  agentId: string,
): Promise<TestConversation> {
  const response = await apiClient.post("/test-chat/conversations", {
    agentId,
  });
  return response.data.conversation;
}

/**
 * Получить все разговоры для агента
 */
export async function getConversations(
  agentId: string,
): Promise<TestConversation[]> {
  const response = await apiClient.get("/test-chat/conversations", {
    params: { agentId },
  });
  return response.data.conversations;
}

/**
 * Получить разговор с сообщениями
 */
export async function getConversation(id: string): Promise<{
  conversation: TestConversation & { messages: TestConversationMessage[] };
}> {
  const response = await apiClient.get(`/test-chat/conversations/${id}`);
  return response.data;
}

/**
 * Удалить разговор
 */
export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/test-chat/conversations/${id}`);
}

/**
 * Обновить заголовок разговора
 */
export async function updateConversation(
  id: string,
  title: string,
): Promise<TestConversation> {
  const response = await apiClient.patch(`/test-chat/conversations/${id}`, {
    title,
  });
  return response.data.conversation;
}

/**
 * Отправить сообщение в тестовый чат
 */
export async function sendMessage(
  agentId: string,
  message: string,
  conversationId?: string,
): Promise<SendMessageResponse> {
  const response = await apiClient.post("/test-chat/message", {
    agentId,
    message,
    conversationId,
  });
  return response.data;
}

/**
 * Получить информацию о настройках агента
 */
export async function getAgentInfo(agentId: string): Promise<AgentInfo> {
  const response = await apiClient.get(`/test-chat/agent-info/${agentId}`);
  return response.data;
}

export const testChatService = {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  updateConversation,
  sendMessage,
  getAgentInfo,
};
