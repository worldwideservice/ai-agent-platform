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
}

export const billingService = new BillingService();
export default billingService;
