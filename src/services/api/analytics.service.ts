import apiClient from './apiClient';

export interface DashboardStats {
  activeAgents: number;
  totalMessages: number;
  newLeads: number;
  responseRate: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface DashboardAnalytics {
  stats: DashboardStats;
  charts: {
    messagesData: ChartData[];
    conversionsData: ChartData[];
  };
}

/**
 * Получить аналитику для Dashboard
 */
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  const response = await apiClient.get('/analytics/dashboard');
  return response.data;
};

const analyticsService = {
  getDashboardAnalytics,
};

export default analyticsService;
