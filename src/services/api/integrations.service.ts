import apiClient from './apiClient';

export interface Integration {
  id: string;
  agentId: string;
  integrationType: string;
  isActive: boolean;
  isConnected: boolean;
  connectedAt: Date | null;
  lastSynced: Date | null;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncKommoResponse {
  success: boolean;
  message: string;
  lastSynced: Date;
  stats: {
    pipelines: number;
    contacts: number;
    leads: number;
  };
}

export const integrationsService = {
  /**
   * Создать или обновить интеграцию
   */
  async upsertIntegration(
    agentId: string,
    integrationType: string,
    isActive: boolean,
    isConnected: boolean,
    settings?: any
  ): Promise<Integration> {
    const response = await apiClient.post(`/agents/${agentId}/integrations`, {
      integrationType,
      isActive,
      isConnected,
      settings,
    });
    return response.data;
  },

  /**
   * Получить все интеграции агента
   */
  async getIntegrations(agentId: string): Promise<Integration[]> {
    const response = await apiClient.get(`/agents/${agentId}/integrations`);
    return response.data;
  },

  /**
   * Синхронизировать данные из Kommo CRM
   * Загружает воронки, этапы, кастомные поля и типы задач
   */
  async syncKommo(agentId: string, integrationId: string): Promise<any> {
    // Увеличенный таймаут для синхронизации большого количества данных
    const response = await apiClient.post(
      `/agents/${agentId}/integrations/kommo/sync`,
      {},
      { timeout: 60000 } // 60 секунд для синхронизации
    );
    return response.data;
  },

  /**
   * Подключить Kommo через долгосрочный токен
   */
  async connectKommoWithToken(integrationId: string, accessToken: string): Promise<Integration> {
    const response = await apiClient.post('/kommo/connect-with-token', {
      integrationId,
      accessToken,
    });
    return response.data.integration;
  },
};
