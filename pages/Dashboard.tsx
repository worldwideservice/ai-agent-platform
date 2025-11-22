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
import { TrendingUp, Bot, MessageSquare, Users } from 'lucide-react';
import { analyticsService } from '../src/services/api';

export const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState([
    { label: 'Активные агенты', value: '0', icon: Bot, change: '+0%', trend: 'up' as const },
    { label: 'Всего сообщений', value: '0', icon: MessageSquare, change: '+0%', trend: 'up' as const },
    { label: 'Новых лидов', value: '0', icon: Users, change: '+0%', trend: 'up' as const },
    { label: 'Уровень отклика', value: '0%', icon: TrendingUp, change: '+0%', trend: 'up' as const }
  ]);
  const [messagesData, setMessagesData] = useState<{ name: string; value: number }[]>([]);
  const [conversionsData, setConversionsData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const analytics = await analyticsService.getDashboardAnalytics();

      // Обновляем статистику
      setStats([
        { label: 'Активные агенты', value: analytics.stats.activeAgents.toString(), icon: Bot, change: '+0%', trend: 'up' as const },
        { label: 'Всего сообщений', value: analytics.stats.totalMessages.toString(), icon: MessageSquare, change: '+0%', trend: 'up' as const },
        { label: 'Новых лидов', value: analytics.stats.newLeads.toString(), icon: Users, change: '+0%', trend: 'up' as const },
        { label: 'Уровень отклика', value: analytics.stats.responseRate, icon: TrendingUp, change: '+0%', trend: 'up' as const }
      ]);

      // Обновляем данные графиков
      setMessagesData(analytics.charts.messagesData);
      setConversionsData(analytics.charts.conversionsData);
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

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">{stat.label}</h3>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
            <div className={`flex items-center text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              <stat.icon size={16} className="mr-1" />
              <span>{stat.change}</span>
            </div>
            <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${stat.trend === 'up' ? 'bg-blue-500' : 'bg-red-500'} w-[0%]`}></div>
            </div>
          </div>
        ))}

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Сообщения за месяц</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {messagesData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Нет данных для отображения</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={messagesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Конверсии за 14 дней</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {conversionsData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Нет данных для отображения</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
