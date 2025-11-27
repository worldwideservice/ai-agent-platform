import apiClient from './apiClient';

export interface TriggerActionParams {
  // change_stage
  stageId?: string;
  pipelineId?: string;
  // assign_user
  applyTo?: 'deal' | 'contact' | 'both';
  userId?: string;
  // create_task
  taskDescription?: string;
  taskUserId?: string;
  taskTypeId?: string;
  // run_salesbot
  salesbotId?: string;
  // add_deal_tags, add_contact_tags
  tags?: string[];
  // add_deal_note, add_contact_note
  noteText?: string;
  // send_message
  messageText?: string;
  // send_files
  fileUrls?: string[];
  // send_email
  emailInstructions?: string;
  emailAttachments?: string[]; // Вложения для email
  // send_webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: { key: string; value: string }[];
  webhookBodyType?: 'form' | 'json' | 'raw';
  webhookBody?: { key: string; value: string }[] | string;
  webhookPassToAI?: boolean;
  // send_kb_article
  articleId?: number;
  channel?: 'chat' | 'email';
}

export interface TriggerAction {
  id: string;
  action: string;
  params?: TriggerActionParams;
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
  actions: { action: string; params?: TriggerActionParams }[];
  cancelMessage?: string;
  runLimit?: number;
}

export interface UpdateTriggerRequest extends Partial<CreateTriggerRequest> {}

class TriggersService {
  /**
   * Получить все триггеры агента
   */
  async getTriggers(agentId: string): Promise<Trigger[]> {
    const response = await apiClient.get<Trigger[]>(`/agents/${agentId}/triggers`);
    return response.data;
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
