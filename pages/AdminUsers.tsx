import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Clock, Gift, Infinity, RefreshCw, Shield, UserMinus, Trash2, AlertTriangle } from 'lucide-react';
import adminService, { AdminUser, UsersResponse } from '../src/services/api/admin.service';

interface UserModalProps {
  user: AdminUser;
  onClose: () => void;
  onAction: (action: string, value?: any) => Promise<void>;
  onDelete: () => Promise<void>;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onAction, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [addDays, setAddDays] = useState(7);
  const [addResponses, setAddResponses] = useState(1000);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleAction = async (action: string, value?: any) => {
    setLoading(true);
    try {
      await onAction(action, value);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Управление пользователем</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Имя</p>
              <p className="text-gray-900 dark:text-white">{user.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Компания</p>
              <p className="text-gray-900 dark:text-white">{user.company || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">План</p>
              <p className="text-gray-900 dark:text-white capitalize">{user.currentPlan}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Роль</p>
              <p className="text-gray-900 dark:text-white">{user.role}</p>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Текущие лимиты</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Ответы:</span>
                <span className="text-gray-900 dark:text-white">{user.responsesUsed.toLocaleString()} / {user.responsesLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Агенты:</span>
                <span className="text-gray-900 dark:text-white">{user.agentsLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Статьи KB:</span>
                <span className="text-gray-900 dark:text-white">{user.kbArticlesLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Триал до:</span>
                <span className="text-gray-900 dark:text-white">
                  {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString('ru-RU') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Быстрые действия</h3>

            {/* Extend Trial */}
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Продлить триал</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={addDays}
                    onChange={e => setAddDays(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-sm text-gray-500">дней</span>
                </div>
              </div>
              <button
                onClick={() => handleAction('extend_trial', addDays)}
                disabled={loading}
                className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                Продлить
              </button>
            </div>

            {/* Add Responses */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Добавить ответов</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={addResponses}
                    onChange={e => setAddResponses(parseInt(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-sm text-gray-500">ответов</span>
                </div>
              </div>
              <button
                onClick={() => handleAction('add_responses', addResponses)}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Добавить
              </button>
            </div>

            {/* Set Unlimited */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Infinity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Безлимитный режим</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Снять все ограничения</p>
              </div>
              <button
                onClick={() => handleAction('set_unlimited')}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Установить
              </button>
            </div>

            {/* Reset Usage */}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Сбросить использование</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Обнулить счётчик ответов</p>
              </div>
              <button
                onClick={() => handleAction('reset_usage')}
                disabled={loading}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Сбросить
              </button>
            </div>

            {/* Set Plan */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Gift className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Установить план</p>
                <div className="flex gap-2 mt-2">
                  {['trial', 'launch', 'scale', 'max'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => handleAction('set_plan', plan)}
                      disabled={loading}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        user.currentPlan === plan
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Role */}
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {user.role === 'ADMIN' ? (
                <>
                  <UserMinus className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Убрать права админа</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Сделать обычным пользователем</p>
                  </div>
                  <button
                    onClick={() => handleAction('remove_admin')}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Убрать
                  </button>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Сделать админом</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Дать права администратора</p>
                  </div>
                  <button
                    onClick={() => handleAction('make_admin')}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Назначить
                  </button>
                </>
              )}
            </div>

            {/* Delete User */}
            {!showDeleteConfirm ? (
              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Trash2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Удалить пользователя</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Удалить аккаунт и все данные</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Внимание! Это действие необратимо</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Будут удалены все данные пользователя: агенты, статьи базы знаний, разговоры, интеграции и настройки.
                    </p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-red-700 dark:text-red-300 mb-1">
                    Введите DELETE для подтверждения:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading || deleteConfirmText !== 'DELETE'}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Удаление...' : 'Подтвердить удаление'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminUsers: React.FC = () => {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        page,
        limit: 20,
        search: search || undefined,
        plan: planFilter || undefined,
      });
      setData(response);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, planFilter]);

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleAction = async (action: string, value?: any) => {
    if (!selectedUser) return;
    try {
      const result = await adminService.userQuickAction(selectedUser.id, action, value);
      setSelectedUser(result.user);
      loadUsers();
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await adminService.deleteUser(selectedUser.id);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление пользователями</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск по email, имени или компании..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        >
          <option value="">Все планы</option>
          <option value="trial">Trial</option>
          <option value="launch">Launch</option>
          <option value="scale">Scale</option>
          <option value="max">Max</option>
          <option value="unlimited">Unlimited</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Поиск
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Имя</th>
                  <th className="px-6 py-3 font-medium">Компания</th>
                  <th className="px-6 py-3 font-medium">План</th>
                  <th className="px-6 py-3 font-medium">Ответы</th>
                  <th className="px-6 py-3 font-medium">Роль</th>
                  <th className="px-6 py-3 font-medium">Дата</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data?.users.map((user) => (
                  <tr key={user.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{user.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{user.company || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.currentPlan === 'trial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        user.currentPlan === 'unlimited' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {user.currentPlan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {user.responsesUsed.toLocaleString()} / {user.responsesLimit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Управление
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Показано {((page - 1) * 20) + 1} - {Math.min(page * 20, data.pagination.total)} из {data.pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={handleAction}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default AdminUsers;
