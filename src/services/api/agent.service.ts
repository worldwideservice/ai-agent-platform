import apiClient from './apiClient';
import {
  AgentResponse,
  AgentCreateRequest,
  AgentUpdateRequest,
} from '../../types/api';

class AgentService {
  /**
   * Получить всех агентов пользователя
   */
  async getAllAgents(): Promise<AgentResponse[]> {
    const response = await apiClient.get<AgentResponse[]>('/agents');
    return response.data;
  }

  /**
   * Получить агента по ID
   */
  async getAgentById(id: string): Promise<AgentResponse> {
    const response = await apiClient.get<AgentResponse>(`/agents/${id}`);
    return response.data;
  }

  /**
   * Создать нового агента
   */
  async createAgent(data: AgentCreateRequest): Promise<AgentResponse> {
    const response = await apiClient.post<AgentResponse>('/agents', data);
    return response.data;
  }

  /**
   * Обновить агента
   */
  async updateAgent(
    id: string,
    data: AgentUpdateRequest
  ): Promise<AgentResponse> {
    const response = await apiClient.put<AgentResponse>(`/agents/${id}`, data);
    return response.data;
  }

  /**
   * Удалить агента
   */
  async deleteAgent(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(
      `/agents/${id}`
    );
    return response.data;
  }

  /**
   * Переключить статус агента (активен/неактивен)
   */
  async toggleAgentStatus(id: string): Promise<AgentResponse> {
    const response = await apiClient.patch<AgentResponse>(
      `/agents/${id}/toggle`
    );
    return response.data;
  }
}

export const agentService = new AgentService();
export default agentService;
