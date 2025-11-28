import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { billingService, SubscriptionInfo, PlanFeatures } from '../services/api';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  features: PlanFeatures | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canUseFeature: (feature: keyof PlanFeatures) => boolean;
}

const defaultFeatures: PlanFeatures = {
  canSendMedia: false,
  canReceiveVoice: false,
  canReceiveImages: false,
  canUpdateCrmFields: false,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await billingService.getSubscription();
      setSubscription(data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Не удалось загрузить информацию о подписке');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const canUseFeature = useCallback((feature: keyof PlanFeatures): boolean => {
    if (!subscription || !subscription.features) return false;
    if (subscription.isTrialExpired) return false;
    return subscription.features[feature] ?? false;
  }, [subscription]);

  const value: SubscriptionContextType = {
    subscription,
    features: subscription?.features ?? null,
    isLoading,
    error,
    refresh: fetchSubscription,
    canUseFeature,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
