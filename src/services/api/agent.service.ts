import apiClient from './apiClient';
import {
  AgentResponse,
  AgentCreateRequest,
  AgentUpdateRequest,
} from '../../types/api';

// Типы для расширенных настроек агента
export interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface AgentAdvancedSettings {
  id: string;
  agentId: string;
  model: string;
  autoDetectLanguage: boolean;
  responseLanguage: string;
  scheduleEnabled: boolean;
  scheduleData?: WorkingDay[];
  responseDelaySeconds: number;
  // Memory & Context Settings
  memoryEnabled?: boolean;
  graphEnabled?: boolean;
  contextWindow?: number;
  semanticSearchEnabled?: boolean;
  // Internal AI Models Settings
  factExtractionModel?: string;
  triggerEvaluationModel?: string;
  chainMessageModel?: string;
  emailGenerationModel?: string;
  instructionParsingModel?: string;
  kbAnalysisModel?: string;
}

export interface AgentAdvancedSettingsUpdate {
  model?: string;
  autoDetectLanguage?: boolean;
  responseLanguage?: string;
  scheduleEnabled?: boolean;
  scheduleData?: WorkingDay[];
  responseDelaySeconds?: number;
  // Memory & Context Settings
  memoryEnabled?: boolean;
  graphEnabled?: boolean;
  contextWindow?: number;
  semanticSearchEnabled?: boolean;
  // Internal AI Models Settings
  factExtractionModel?: string;
  triggerEvaluationModel?: string;
  chainMessageModel?: string;
  emailGenerationModel?: string;
  instructionParsingModel?: string;
  kbAnalysisModel?: string;
}

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

  /**
   * Получить расширенные настройки агента
   */
  async getAdvancedSettings(agentId: string): Promise<AgentAdvancedSettings> {
    const response = await apiClient.get<AgentAdvancedSettings>(
      `/agents/${agentId}/advanced-settings`
    );
    // Парсим scheduleData из JSON строки если она есть
    const data = response.data;
    if (data.scheduleData && typeof data.scheduleData === 'string') {
      try {
        data.scheduleData = JSON.parse(data.scheduleData as unknown as string);
      } catch {
        data.scheduleData = undefined;
      }
    }
    return data;
  }

  /**
   * Обновить расширенные настройки агента
   */
  async updateAdvancedSettings(
    agentId: string,
    data: AgentAdvancedSettingsUpdate
  ): Promise<AgentAdvancedSettings> {
    const response = await apiClient.put<AgentAdvancedSettings>(
      `/agents/${agentId}/advanced-settings`,
      data
    );
    return response.data;
  }
}

export const agentService = new AgentService();
export default agentService;
