import apiClient from './apiClient';

export const crmService = {
  // Синхронизировать CRM
  async syncCRM(agentId: string, crmType: string = 'Kommo') {
    const response = await apiClient.post('/crm/sync', { agentId, crmType });
    return response.data;
  },

  // Получить все контакты
  async getAllContacts() {
    const response = await apiClient.get('/contacts');
    return response.data;
  },

  // Получить все сделки
  async getAllDeals() {
    const response = await apiClient.get('/deals');
    return response.data;
  },
};
