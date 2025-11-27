/**
 * System Notifications Service
 * Сервис для создания системных уведомлений (непрочитанных)
 * Эти уведомления создаются в фоне и отображаются в колокольчике как непрочитанные
 */

import { prisma } from '../config/database';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface SystemNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

class SystemNotificationsService {
  /**
   * Создать системное уведомление (непрочитанное)
   */
  async create(data: SystemNotificationData): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: false, // Системные уведомления всегда непрочитанные
        },
      });
      console.log(`[SystemNotification] Created: ${data.type} - ${data.message}`);
    } catch (error) {
      console.error('[SystemNotification] Failed to create:', error);
    }
  }

  /**
   * Уведомление об ошибке API
   */
  async apiError(userId: string, endpoint: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка API',
      message: `Ошибка при обращении к ${endpoint}: ${errorMessage}`,
    });
  }

  /**
   * Уведомление об ошибке интеграции
   */
  async integrationError(userId: string, integrationName: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка интеграции',
      message: `Интеграция "${integrationName}" не работает: ${errorMessage}`,
    });
  }

  /**
   * Уведомление о проблеме с Kommo CRM
   */
  async kommoError(userId: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка Kommo CRM',
      message: `Проблема с Kommo: ${errorMessage}`,
    });
  }

  /**
   * Уведомление о лимите токенов
   */
  async tokenLimitWarning(userId: string, used: number, limit: number): Promise<void> {
    const percentage = Math.round((used / limit) * 100);
    await this.create({
      userId,
      type: 'warning',
      title: 'Лимит токенов',
      message: `Использовано ${percentage}% токенов (${used.toLocaleString()} из ${limit.toLocaleString()}). Рекомендуется увеличить лимит.`,
    });
  }

  /**
   * Уведомление о превышении лимита токенов
   */
  async tokenLimitExceeded(userId: string, limit: number): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Лимит токенов исчерпан',
      message: `Достигнут лимит в ${limit.toLocaleString()} токенов. Агенты приостановлены до следующего периода или увеличения лимита.`,
    });
  }

  /**
   * Уведомление о лимите сообщений
   */
  async messageLimitWarning(userId: string, used: number, limit: number): Promise<void> {
    const percentage = Math.round((used / limit) * 100);
    await this.create({
      userId,
      type: 'warning',
      title: 'Лимит сообщений',
      message: `Использовано ${percentage}% сообщений (${used} из ${limit}). Рекомендуется увеличить лимит.`,
    });
  }

  /**
   * Уведомление о превышении лимита сообщений
   */
  async messageLimitExceeded(userId: string, limit: number): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Лимит сообщений исчерпан',
      message: `Достигнут лимит в ${limit} сообщений. Агенты приостановлены до следующего периода.`,
    });
  }

  /**
   * Уведомление об ошибке AI модели
   */
  async aiModelError(userId: string, agentName: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка AI модели',
      message: `Агент "${agentName}" не смог обработать запрос: ${errorMessage}`,
    });
  }

  /**
   * Уведомление об ошибке базы знаний
   */
  async knowledgeBaseError(userId: string, agentName: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка базы знаний',
      message: `Не удалось получить данные из базы знаний для агента "${agentName}": ${errorMessage}`,
    });
  }

  /**
   * Уведомление о неуспешной синхронизации
   */
  async syncError(userId: string, what: string, errorMessage: string): Promise<void> {
    await this.create({
      userId,
      type: 'error',
      title: 'Ошибка синхронизации',
      message: `Не удалось синхронизировать ${what}: ${errorMessage}`,
    });
  }

  /**
   * Уведомление об истечении токена интеграции
   */
  async integrationTokenExpired(userId: string, integrationName: string): Promise<void> {
    await this.create({
      userId,
      type: 'warning',
      title: 'Токен истёк',
      message: `Токен авторизации для "${integrationName}" истёк. Требуется повторная авторизация.`,
    });
  }

  /**
   * Уведомление о недоступности внешнего сервиса
   */
  async externalServiceUnavailable(userId: string, serviceName: string): Promise<void> {
    await this.create({
      userId,
      type: 'warning',
      title: 'Сервис недоступен',
      message: `Внешний сервис "${serviceName}" временно недоступен. Некоторые функции могут не работать.`,
    });
  }

  /**
   * Информационное уведомление
   */
  async info(userId: string, title: string, message: string): Promise<void> {
    await this.create({
      userId,
      type: 'info',
      title,
      message,
    });
  }

  /**
   * Уведомление об успешном событии (фоновое)
   */
  async success(userId: string, title: string, message: string): Promise<void> {
    await this.create({
      userId,
      type: 'success',
      title,
      message,
    });
  }
}

export const systemNotifications = new SystemNotificationsService();
export default systemNotifications;
