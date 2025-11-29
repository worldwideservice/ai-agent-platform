import apiClient from './apiClient';

export interface DashboardStats {
  responsesThisMonth: number;
  responsesLast7Days: number;
  responsesToday: number;
  totalAgents: number;
  changePercent: string;
  trend: 'up' | 'down';
  miniChartData: number[];
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
    monthlyData: ChartData[];
    hourlyData: ChartData[];
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
