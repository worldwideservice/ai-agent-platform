import apiClient from './apiClient';

export interface KommoIntegration {
  id: string;
  agentId: string;
  integrationType: 'kommo';
  isActive: boolean;
  isConnected: boolean;
  connectedAt?: string;
  lastSynced?: string;
  settings?: any;
}

/**
 * Создать интеграцию Kommo для агента
 */
export async function createKommoIntegration(agentId: string): Promise<KommoIntegration> {
  const response = await apiClient.post('/integrations', {
    agentId,
    integrationType: 'kommo',
    isActive: true,
  });
  return response.data;
}

/**
 * Получить интеграцию Kommo для агента
 */
export async function getKommoIntegration(agentId: string): Promise<KommoIntegration | null> {
  try {
    const response = await apiClient.get(`/integrations/${agentId}/kommo`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Инициировать OAuth подключение к Kommo
 */
export async function initiateKommoOAuth(integrationId: string): Promise<{ authUrl: string }> {
  const response = await apiClient.get('/kommo/auth', {
    params: { integrationId },
  });
  return response.data;
}

/**
 * Синхронизировать данные из Kommo CRM
 */
export async function syncKommoData(integrationId: string): Promise<{
  pipelines: any[];
  channels: any[];
  dealFields: any[];
  contactFields: any[];
  taskTypes: any[];
  users: any[];
  actions: any[];
}> {
  const response = await apiClient.post('/kommo/sync', {
    integrationId,
  });
  return response.data.data;
}

/**
 * Отключить интеграцию Kommo
 */
export async function disconnectKommo(integrationId: string): Promise<void> {
  await apiClient.delete(`/integrations/${integrationId}`);
}

/**
 * Открыть OAuth popup и дождаться результата
 */
export async function openKommoOAuthPopup(authUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'Kommo OAuth',
      'width=600,height=700,left=200,top=100'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Слушать postMessage от OAuth callback
    const messageHandler = (event: MessageEvent) => {
      // Проверяем origin для безопасности
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'kommo_oauth_success') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(true);
      } else if (event.data.type === 'kommo_oauth_error') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error(event.data.message || 'OAuth failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Проверять, закрыл ли пользователь popup вручную
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', messageHandler);
        resolve(false); // Пользователь закрыл окно
      }
    }, 500);
  });
}
