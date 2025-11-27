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
    dealFields: number;
    contactFields: number;
    users: number;
    salesbots: number;
    syncTime: string;
  };
}

export interface KommoSyncStats {
  pipelines: number;
  stages: number;
  users: number;
  dealFields: number;
  contactFields: number;
  channels: number;
  lastSync: string | null;
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
      { timeout: 120000 } // 2 минуты для синхронизации (первая синхронизация может занять 60+ секунд)
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

  /**
   * Получить статистику синхронизации Kommo
   */
  async getKommoSyncStats(agentId: string): Promise<KommoSyncStats> {
    const response = await apiClient.get(`/agents/${agentId}/integrations/kommo/stats`);
    return response.data;
  },
};
