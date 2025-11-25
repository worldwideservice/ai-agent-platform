import apiClient from './apiClient';

export interface TriggerAction {
  id: string;
  action: string;
}

export interface Trigger {
  id: string;
  agentId: string;
  name: string;
  isActive: boolean;
  condition: string;
  actions: TriggerAction[];
  cancelMessage?: string;
  runLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTriggerRequest {
  name: string;
  isActive: boolean;
  condition: string;
  actions: Omit<TriggerAction, 'id'>[];
  cancelMessage?: string;
  runLimit?: number;
}

export interface UpdateTriggerRequest extends Partial<CreateTriggerRequest> {}

class TriggersService {
  /**
   * Получить все триггеры агента
   */
  async getTriggers(agentId: string): Promise<Trigger[]> {
    const response = await apiClient.get<{ triggers: Trigger[] }>(`/agents/${agentId}/triggers`);
    return response.data.triggers;
  }

  /**
   * Получить триггер по ID
   */
  async getTriggerById(agentId: string, triggerId: string): Promise<Trigger> {
    const response = await apiClient.get<Trigger>(`/agents/${agentId}/triggers/${triggerId}`);
    return response.data;
  }

  /**
   * Создать триггер
   */
  async createTrigger(agentId: string, data: CreateTriggerRequest): Promise<Trigger> {
    const response = await apiClient.post<Trigger>(`/agents/${agentId}/triggers`, data);
    return response.data;
  }

  /**
   * Обновить триггер
   */
  async updateTrigger(
    agentId: string,
    triggerId: string,
    data: UpdateTriggerRequest
  ): Promise<Trigger> {
    const response = await apiClient.put<Trigger>(
      `/agents/${agentId}/triggers/${triggerId}`,
      data
    );
    return response.data;
  }

  /**
   * Удалить триггер
   */
  async deleteTrigger(agentId: string, triggerId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/agents/${agentId}/triggers/${triggerId}`
    );
    return response.data;
  }

  /**
   * Переключить статус триггера
   */
  async toggleTrigger(agentId: string, triggerId: string): Promise<Trigger> {
    const trigger = await this.getTriggerById(agentId, triggerId);
    return this.updateTrigger(agentId, triggerId, {
      isActive: !trigger.isActive,
    });
  }
}

export const triggersService = new TriggersService();
export default triggersService;
