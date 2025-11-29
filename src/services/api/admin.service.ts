import apiClient from './apiClient';

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    byPlan: Record<string, number>;
  };
  agents: {
    total: number;
    active: number;
  };
  knowledgeBase: {
    articles: number;
    categories: number;
  };
  conversations: {
    total: number;
    messages: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    currentPlan: string;
    createdAt: string;
  }>;
  system: {
    queueEnabled: boolean;
    queue: any;
    openRouter: any;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    uptime: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string;
  currentPlan: string;
  trialEndsAt: string | null;
  responsesUsed: number;
  responsesLimit: number;
  agentsLimit: number;
  kbArticlesLimit: number;
  instructionsLimit: number;
  responsesResetAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: {
    agents: number;
    articles: number;
    conversations: number;
  };
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminAgent {
  id: string;
  name: string;
  isActive: boolean;
  model: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
  };
}

export interface AgentsResponse {
  agents: AdminAgent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SystemInfo {
  server: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    pid: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  queue: any;
  openRouter: any;
  chains: {
    activeRuns: number;
    pendingSteps: number;
  };
  agents: {
    activePauses: number;
  };
  env: {
    nodeEnv: string;
    port: string;
  };
}

// Dashboard
export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
}

// Users
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<UsersResponse> {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
}

export async function getUserById(userId: string): Promise<AdminUser> {
  const response = await apiClient.get(`/admin/users/${userId}`);
  return response.data;
}

export async function updateUser(userId: string, data: Partial<AdminUser>): Promise<AdminUser> {
  const response = await apiClient.patch(`/admin/users/${userId}`, data);
  return response.data;
}

export async function userQuickAction(userId: string, action: string, value?: any): Promise<{ success: boolean; user: AdminUser; action: string }> {
  const response = await apiClient.post(`/admin/users/${userId}/action`, { action, value });
  return response.data;
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string; deletedUser: { id: string; email: string; stats: any } }> {
  const response = await apiClient.delete(`/admin/users/${userId}`);
  return response.data;
}

// Agents
export async function getAllAgents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  userId?: string;
}): Promise<AgentsResponse> {
  const response = await apiClient.get('/admin/agents', { params });
  return response.data;
}

export async function toggleAgentStatus(agentId: string, isActive: boolean): Promise<AdminAgent> {
  const response = await apiClient.patch(`/admin/agents/${agentId}/toggle`, { isActive });
  return response.data;
}

// Integrations
export async function getAllIntegrations(): Promise<any> {
  const response = await apiClient.get('/admin/integrations');
  return response.data;
}

// Knowledge Base
export async function getKnowledgeBaseStats(): Promise<any> {
  const response = await apiClient.get('/admin/kb/stats');
  return response.data;
}

// System
export async function getSystemInfo(): Promise<SystemInfo> {
  const response = await apiClient.get('/admin/system');
  return response.data;
}

export async function getActivityLogs(limit?: number): Promise<any> {
  const response = await apiClient.get('/admin/activity', { params: { limit } });
  return response.data;
}

// Conversations
export async function getAllConversations(params?: {
  page?: number;
  limit?: number;
  agentId?: string;
}): Promise<any> {
  const response = await apiClient.get('/admin/conversations', { params });
  return response.data;
}

// Training
export async function getTrainingData(): Promise<any> {
  const response = await apiClient.get('/admin/training');
  return response.data;
}

export default {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  userQuickAction,
  deleteUser,
  getAllAgents,
  toggleAgentStatus,
  getAllIntegrations,
  getKnowledgeBaseStats,
  getSystemInfo,
  getActivityLogs,
  getAllConversations,
  getTrainingData,
};
