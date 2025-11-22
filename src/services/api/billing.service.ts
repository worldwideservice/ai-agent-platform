import apiClient from './apiClient';

export interface SubscriptionInfo {
  currentPlan: string;
  isActive: boolean;
  daysRemaining: number;
  responsesUsed: number;
  responsesLimit: number;
  usagePercentage: number;
  trialEndsAt: string | null;
}

class BillingService {
  /**
   * Получить информацию о подписке
   */
  async getSubscription(): Promise<SubscriptionInfo> {
    const response = await apiClient.get<SubscriptionInfo>('/billing/subscription');
    return response.data;
  }
}

export const billingService = new BillingService();
export default billingService;
