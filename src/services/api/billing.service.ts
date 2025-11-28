import apiClient from './apiClient';

export interface PlanFeatures {
  canSendMedia: boolean;
  canReceiveVoice: boolean;
  canReceiveImages: boolean;
  canUpdateCrmFields: boolean;
}

export interface PlanLimits {
  agents: number;
  kbArticles: number;
  instructions: number;
}

export type SubscriptionStatus = 'trial' | 'active' | 'grace_period' | 'expired';

export interface SubscriptionInfo {
  plan: string;
  planDisplayName: string;
  isActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  responsesUsed: number;
  responsesLimit: number;
  responsesResetAt: string | null;
  usagePercentage: number;
  trialEndsAt: string | null;
  limits: PlanLimits;
  features: PlanFeatures;
  // New subscription status fields
  subscriptionStatus: SubscriptionStatus;
  gracePeriodDaysRemaining: number | null;
  subscriptionEndsAt: string | null;
  gracePeriodEndsAt: string | null;
}

export interface SubscriptionStatusInfo {
  status: SubscriptionStatus;
  plan: string;
  responsesUsed: number;
  responsesLimit: number;
  daysRemaining: number;
  gracePeriodDaysRemaining: number | null;
  subscriptionEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  isActive: boolean;
}

export interface ActivateSubscriptionParams {
  plan: 'launch' | 'scale' | 'max';
  responsesCount: number;
  billingCycle?: 'monthly' | 'yearly';
}

class BillingService {
  /**
   * Получить информацию о подписке
   */
  async getSubscription(): Promise<SubscriptionInfo> {
    const response = await apiClient.get<SubscriptionInfo>('/billing/subscription');
    return response.data;
  }

  /**
   * Получить лимиты пользователя
   */
  async getLimits(): Promise<any> {
    const response = await apiClient.get('/billing/limits');
    return response.data;
  }

  /**
   * Получить детальный статус подписки
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatusInfo> {
    const response = await apiClient.get<SubscriptionStatusInfo>('/billing/status');
    return response.data;
  }

  /**
   * Активировать подписку (после оплаты)
   */
  async activateSubscription(params: ActivateSubscriptionParams): Promise<{ message: string; subscription: SubscriptionStatusInfo }> {
    const response = await apiClient.post('/billing/activate', params);
    return response.data;
  }

  /**
   * Продлить подписку
   */
  async renewSubscription(): Promise<{ message: string; subscription: SubscriptionStatusInfo }> {
    const response = await apiClient.post('/billing/renew');
    return response.data;
  }

  /**
   * Отменить подписку
   */
  async cancelSubscription(): Promise<{ message: string }> {
    const response = await apiClient.post('/billing/cancel');
    return response.data;
  }

  /**
   * Проверить доступ к сервису
   */
  async checkAccess(): Promise<{ allowed: boolean; reason?: string; subscriptionInfo: SubscriptionStatusInfo }> {
    const response = await apiClient.post('/billing/check-access');
    return response.data;
  }
}

export const billingService = new BillingService();
export default billingService;
