import React, { useState, useEffect } from 'react';
import { Users, Bot, FileText, MessageSquare, Server, Activity, Clock, Zap } from 'lucide-react';
import adminService, { DashboardStats } from '../src/services/api/admin.service';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins}м`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Админ-панель</h1>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Обновить
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Пользователи</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.total}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Активных: {stats.users.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Агенты</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.agents.total}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Активных: {stats.agents.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">База знаний</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.knowledgeBase.articles}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Категорий: {stats.knowledgeBase.categories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Разговоры</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversations.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Сообщений: {stats.conversations.messages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users by Plan & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Пользователи по планам</h2>
          <div className="space-y-3">
            {Object.entries(stats.users.byPlan).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{plan}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(count / stats.users.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Система</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Память</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.system.memory.heapUsed}MB / {stats.system.memory.heapTotal}MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatUptime(stats.system.uptime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Queue</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.system.queueEnabled ? (
                    <span className="text-green-600">Включена</span>
                  ) : (
                    <span className="text-yellow-600">Отключена</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">OpenRouter</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.system.openRouter?.totalRequests || 0} запросов
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Последние регистрации</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Имя</th>
                <th className="pb-3 font-medium">Компания</th>
                <th className="pb-3 font-medium">План</th>
                <th className="pb-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.recentUsers.map((user) => (
                <tr key={user.id} className="text-sm">
                  <td className="py-3 text-gray-900 dark:text-white">{user.email}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{user.name || '-'}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{user.company || '-'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.currentPlan === 'trial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      user.currentPlan === 'unlimited' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {user.currentPlan}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
