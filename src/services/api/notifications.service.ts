import apiClient from './apiClient';

export interface Notification {
  id: string;
  userId: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface CreateNotificationRequest {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isRead?: boolean;
}

class NotificationsService {
  /**
   * Получить все уведомления
   */
  async getNotifications(limit = 50, unreadOnly = false): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>('/notifications', {
      params: { limit, unreadOnly },
    });
    return response.data;
  }

  /**
   * Создать уведомление
   */
  async createNotification(data: CreateNotificationRequest): Promise<{ notification: Notification }> {
    const response = await apiClient.post<{ notification: Notification }>('/notifications', data);
    return response.data;
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(`/notifications/${id}/read`);
    return response.data;
  }

  /**
   * Отметить все как прочитанные
   */
  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>('/notifications/read-all');
    return response.data;
  }

  /**
   * Удалить уведомление
   */
  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    return response.data;
  }

  /**
   * Удалить все уведомления
   */
  async deleteAllNotifications(): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>('/notifications');
    return response.data;
  }

  /**
   * Получить заголовок для типа уведомления
   */
  getTitleForType(type: 'success' | 'error' | 'warning' | 'info'): string {
    const titles: Record<string, string> = {
      success: 'Успешно',
      error: 'Ошибка',
      warning: 'Предупреждение',
      info: 'Информация',
    };
    return titles[type] || 'Уведомление';
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
