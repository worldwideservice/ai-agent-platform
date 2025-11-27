import apiClient from './apiClient';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
}

export interface GoogleIntegrationStatus {
  isConnected: boolean;
  integration: {
    id: string;
    isActive: boolean;
    isConnected: boolean;
    connectedAt: string | null;
  };
}

class GoogleService {
  /**
   * Initiate Google OAuth flow
   * Returns URL to redirect user for authorization
   */
  async initiateOAuth(integrationId: string): Promise<{ authUrl: string }> {
    const response = await apiClient.get<{ success: boolean; authUrl: string }>(
      `/google/auth`,
      { params: { integrationId } }
    );
    return { authUrl: response.data.authUrl };
  }

  /**
   * Open Google OAuth popup window
   */
  openOAuthPopup(integrationId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.initiateOAuth(integrationId)
        .then(({ authUrl }) => {
          // Calculate popup position (center of screen)
          const width = 600;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;

          // Open popup
          const popup = window.open(
            authUrl,
            'google_oauth',
            `width=${width},height=${height},left=${left},top=${top}`
          );

          // Listen for message from popup
          const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'google_oauth_success') {
              window.removeEventListener('message', handleMessage);
              popup?.close();
              resolve(true);
            } else if (event.data?.type === 'google_oauth_error') {
              window.removeEventListener('message', handleMessage);
              popup?.close();
              resolve(false);
            }
          };

          window.addEventListener('message', handleMessage);

          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', handleMessage);
              // Check status after popup closes
              this.getStatus(integrationId)
                .then((status) => resolve(status.isConnected))
                .catch(() => resolve(false));
            }
          }, 500);
        })
        .catch(() => resolve(false));
    });
  }

  /**
   * Disconnect Google Calendar integration
   */
  async disconnect(integrationId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/google/disconnect',
      { integrationId }
    );
    return response.data;
  }

  /**
   * Get list of user's calendars
   */
  async getCalendars(integrationId: string): Promise<GoogleCalendar[]> {
    const response = await apiClient.get<{ success: boolean; calendars: GoogleCalendar[] }>(
      '/google/calendars',
      { params: { integrationId } }
    );
    return response.data.calendars;
  }

  /**
   * Check Google Calendar connection status
   */
  async getStatus(integrationId: string): Promise<GoogleIntegrationStatus> {
    const response = await apiClient.get<{ success: boolean } & GoogleIntegrationStatus>(
      '/google/status',
      { params: { integrationId } }
    );
    return {
      isConnected: response.data.isConnected,
      integration: response.data.integration,
    };
  }
}

export const googleService = new GoogleService();
export default googleService;
