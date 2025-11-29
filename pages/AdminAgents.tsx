import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Power, PowerOff, User, Filter, LayoutGrid, X, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import adminService, { AdminAgent, AgentsResponse } from '../src/services/api/admin.service';
import { LoadingSpinner } from '../components/ui';

export const AdminAgents: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Panel states
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    model: true,
    owner: true,
    status: true,
    createdAt: true,
  });

  // Refs for click-outside detection
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllAgents({
        page,
        limit: 20,
        search: search || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setData(response);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, [page, activeFilter]);

  // Click outside to close panels
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterPanel &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPanel(false);
      }

      if (
        showColumnsPanel &&
        columnsPanelRef.current &&
        !columnsPanelRef.current.contains(event.target as Node) &&
        columnsButtonRef.current &&
        !columnsButtonRef.current.contains(event.target as Node)
      ) {
        setShowColumnsPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel, showColumnsPanel]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadAgents();
    }
  };

  const handleToggle = async (agent: AdminAgent) => {
    try {
      await adminService.toggleAgentStatus(agent.id, !agent.isActive);
      loadAgents();
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const activeFiltersCount = activeFilter !== 'all' ? 1 : 0;

  const toggleSelectAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedAgents(data?.agents.map(a => a.id) || []);
  const deselectAll = () => setSelectedAgents([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.allAgents', 'Все агенты')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.allAgentsSubtitle', 'Управление всеми агентами платформы')}
          </p>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors relative">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={t('admin.searchAgents', 'Поиск по названию...')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-8 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); loadAgents(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            ref={filterButtonRef}
            onClick={() => {
              setShowFilterPanel(!showFilterPanel);
              setShowColumnsPanel(false);
            }}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              showFilterPanel
                ? 'bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30'
                : activeFiltersCount > 0
                  ? 'bg-[#0078D4]/5 text-[#0078D4] border border-[#0078D4]/20 hover:bg-[#0078D4]/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}
            title={t('common.filters')}
          >
            <Filter size={16} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] bg-[#0078D4] text-white text-[9px] font-bold rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            ref={columnsButtonRef}
            onClick={() => {
              setShowColumnsPanel(!showColumnsPanel);
              setShowFilterPanel(false);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              showColumnsPanel
                ? 'bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}
            title={t('common.columns')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Filter Panel */}
        <div
          ref={filterPanelRef}
          className={`absolute top-12 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 transition-all duration-200 ease-out ${
            showFilterPanel ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#0078D4]" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.filters')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {activeFilter !== 'all' && (
                  <button
                    onClick={() => { setActiveFilter('all'); setPage(1); }}
                    className="text-xs text-[#0078D4] hover:text-[#006cbd] font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {t('common.reset')}
                  </button>
                )}
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('common.status')}
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none cursor-pointer transition-all"
                >
                  <option value="all">{t('common.all', 'Все')}</option>
                  <option value="active">{t('common.active', 'Активные')}</option>
                  <option value="inactive">{t('common.inactive', 'Неактивные')}</option>
                </select>
              </div>
            </div>

            {/* Active filters indicator */}
            {activeFilter !== 'all' && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#0078D4]/10 text-[#0078D4] text-xs font-medium">
                    <Check size={12} className="mr-1" />
                    1 {t('common.filters').toLowerCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columns Panel */}
        <div
          ref={columnsPanelRef}
          className={`absolute top-12 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 transition-all duration-200 ease-out ${
            showColumnsPanel ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={16} className="text-[#0078D4]" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.columns')}</h3>
              </div>
              <button
                onClick={() => setShowColumnsPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-2">
            <div className="space-y-0.5">
              {/* Name column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, name: !prev.name }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('common.name', 'Название')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.name ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.name ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Model column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, model: !prev.model }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('agents.model', 'Модель')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.model ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.model ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Owner column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, owner: !prev.owner }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.owner', 'Владелец')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.owner ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.owner ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Status column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, status: !prev.status }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('common.status', 'Статус')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.status ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.status ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Created At column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, createdAt: !prev.createdAt }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('common.createdAt', 'Создан')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.createdAt ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.createdAt ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : !data?.agents.length ? (
          <div className="px-4 py-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <User size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('admin.noAgents', 'Нет агентов')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.noAgentsHint', 'Агенты появятся здесь после создания')}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedAgents.length === data.agents.length && data.agents.length > 0}
                      onChange={() => (selectedAgents.length === data.agents.length ? deselectAll() : selectAll())}
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  {visibleColumns.name && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.name', 'Название')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.model && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('agents.model', 'Модель')}
                    </th>
                  )}
                  {visibleColumns.owner && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('admin.owner', 'Владелец')}
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.status', 'Статус')}
                    </th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.createdAt', 'Создан')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => toggleSelectAgent(agent.id)}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    {visibleColumns.name && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.model && (
                      <td className="px-4 py-4">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">{agent.model}</span>
                      </td>
                    )}
                    {visibleColumns.owner && (
                      <td className="px-4 py-4">
                        {agent.owner ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">{agent.owner.email}</p>
                              {agent.owner.company && (
                                <p className="text-xs text-gray-400">{agent.owner.company}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-4">
                        {agent.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                            <Power className="w-3 h-3" /> {t('common.active', 'Активен')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-medium">
                            <PowerOff className="w-3 h-3" /> {t('common.disabled', 'Отключен')}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(agent.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                    )}
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleToggle(agent)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          agent.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {agent.isActive ? t('common.disable', 'Отключить') : t('common.enable', 'Включить')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('common.total')}: {data.pagination.total}</span>
              <div className="flex items-center gap-2">
                <span>{t('common.perPage')}</span>
                <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
              {page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAgents;
