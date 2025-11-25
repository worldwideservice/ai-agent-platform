import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { analyticsService } from '../src/services/api';

interface DashboardStats {
  responsesThisMonth: number;
  responsesLast7Days: number;
  responsesToday: number;
  totalAgents: number;
  changePercent: string;
  trend: 'up' | 'down';
  miniChartData: number[];
}

interface ChartData {
  name: string;
  value: number;
}

export const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    responsesThisMonth: 0,
    responsesLast7Days: 0,
    responsesToday: 0,
    totalAgents: 0,
    changePercent: '0%',
    trend: 'up',
    miniChartData: []
  });
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [hourlyData, setHourlyData] = useState<ChartData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const analytics = await analyticsService.getDashboardAnalytics();

      console.log('📊 Monthly data received:', analytics.charts.monthlyData);

      setStats(analytics.stats);
      setMonthlyData(analytics.charts.monthlyData);
      setHourlyData(analytics.charts.hourlyData);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError('Не удалось загрузить аналитику');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          Загрузка аналитики...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  // Мини-график для первой карточки
  const miniChartPoints = stats.miniChartData.map((value, index) => ({
    x: (index / (stats.miniChartData.length - 1)) * 100,
    y: value
  }));
  const maxValue = Math.max(...stats.miniChartData, 1);
  const miniChartPath = miniChartPoints
    .map((point, index) => {
      const x = point.x;
      const y = 100 - (point.y / maxValue) * 100;
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* 1. Ответы ИИ за этот месяц */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Ответы ИИ за этот месяц
          </h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {stats.responsesThisMonth.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full transition-all"></div>
          </div>
        </div>

        {/* 2. Ответы ИИ за последние 7 дней */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Ответы ИИ за последние 7 дней
          </h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {stats.responsesLast7Days.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full transition-all"></div>
          </div>
        </div>

        {/* 3. Ответы ИИ сегодня */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Ответы ИИ сегодня
          </h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {stats.responsesToday.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full transition-all"></div>
          </div>
        </div>

        {/* 4. Агенты */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Агенты
          </h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {stats.totalAgents}
          </div>
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full transition-all"></div>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* График: Ответы ИИ за этот месяц */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Ответы ИИ за этот месяц
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {monthlyData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Нет данных для отображения</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    dy={10}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#E5E7EB'
                    }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3B82F6' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* График: Ответы ИИ за день */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Ответы ИИ за день
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {hourlyData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Нет данных для отображения</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                    interval={2}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#E5E7EB'
                    }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
