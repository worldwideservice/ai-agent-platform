import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Zap, Activity, RefreshCw, Clock, AlertCircle, CheckCircle, Link } from 'lucide-react';
import adminService, { SystemInfo } from '../src/services/api/admin.service';
import { LoadingSpinner, Button } from '../components/ui';

export const AdminSystem: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [sysInfo, integ, act] = await Promise.all([
        adminService.getSystemInfo(),
        adminService.getAllIntegrations(),
        adminService.getActivityLogs(20),
      ]);
      setSystemInfo(sysInfo);
      setIntegrations(integ);
      setActivity(act);
    } catch (err) {
      console.error('Failed to load system info:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}д ${hours}ч ${mins}м`;
    if (hours > 0) return `${hours}ч ${mins}м ${secs}с`;
    return `${mins}м ${secs}с`;
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мониторинг системы</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Авто-обновление (10сек)
          </label>
          <Button
            onClick={() => loadData(true)}
            loading={isRefreshing}
            loadingText="Обновление..."
            icon={<RefreshCw className="w-4 h-4" />}
            size="lg"
          >
            Обновить
          </Button>
        </div>
      </div>

      {systemInfo && (
        <>
          {/* Server Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <Server className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Платформа</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{systemInfo.server.platform}</p>
                  <p className="text-xs text-gray-400">Node {systemInfo.server.nodeVersion}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Uptime</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatUptime(systemInfo.server.uptime)}</p>
                  <p className="text-xs text-gray-400">PID: {systemInfo.server.pid}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <HardDrive className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Память (Heap)</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatBytes(systemInfo.memory.heapUsed)} / {formatBytes(systemInfo.memory.heapTotal)}
                  </p>
                  <p className="text-xs text-gray-400">RSS: {formatBytes(systemInfo.memory.rss)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <Cpu className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Окружение</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{systemInfo.env.nodeEnv}</p>
                  <p className="text-xs text-gray-400">Порт: {systemInfo.env.port}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue & OpenRouter Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Redis Queue (BullMQ)</h2>
                {systemInfo.queue.enabled ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Активна
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Отключена
                  </span>
                )}
              </div>
              {systemInfo.queue.enabled && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Ожидают:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{systemInfo.queue.waiting || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Активные:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{systemInfo.queue.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Выполнено:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{systemInfo.queue.completed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Ошибки:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">{systemInfo.queue.failed || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* OpenRouter Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OpenRouter API</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Всего запросов:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.openRouter?.totalRequests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Активные:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.openRouter?.activeRequests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Ошибки:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{systemInfo.openRouter?.failedRequests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Ср. задержка:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.openRouter?.avgLatencyMs || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Concurrency:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.openRouter?.concurrencyLimit || 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">В очереди:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.openRouter?.pendingRequests || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chains & Pauses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Цепочки сообщений</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Активные запуски:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.chains.activeRuns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Отложенные шаги:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.chains.pendingSteps}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Паузы агентов</h2>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Активные паузы:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{systemInfo.agents.activePauses}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Integrations */}
      {integrations && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Интеграции</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Kommo токены</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.kommo.total}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Google токены</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.google.total}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Всего интеграций</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.integrations.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activity && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Последняя активность</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Registrations */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Регистрации</h3>
              <div className="space-y-2">
                {activity.registrations.slice(0, 5).map((user: any) => (
                  <div key={user.id} className="text-sm">
                    <p className="text-gray-900 dark:text-white">{user.email}</p>
                    <p className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Agents */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Созданные агенты</h3>
              <div className="space-y-2">
                {activity.agents.slice(0, 5).map((agent: any) => (
                  <div key={agent.id} className="text-sm">
                    <p className="text-gray-900 dark:text-white">{agent.name}</p>
                    <p className="text-xs text-gray-400">{new Date(agent.createdAt).toLocaleString('ru-RU')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Messages */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Последние сообщения</h3>
              <div className="space-y-2">
                {activity.messages.slice(0, 5).map((msg: any) => (
                  <div key={msg.id} className="text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${msg.role === 'assistant' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <span className="text-gray-600 dark:text-gray-400">{msg.channel}</span>
                    <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString('ru-RU')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystem;
