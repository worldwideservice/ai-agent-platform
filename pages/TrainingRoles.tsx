import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Briefcase,
  Edit,
  Trash2,
  X,
  Check,
  Filter,
  LayoutGrid,
  ChevronDown,
  Eye,
  UserCircle,
  ShoppingCart,
  Headphones,
  MessageCircle,
  Target,
  Zap,
  Heart,
  Star,
  Award,
  TrendingUp,
  Users,
  Phone,
  Mail,
  Globe,
  Shield,
  Lightbulb,
  type LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingRole, TrainingSource } from '../types';
import * as trainingService from '../src/services/api/training.service';
import { notificationsService } from '../src/services/api';

// Карта иконок для ролей
const ROLE_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  user: UserCircle,
  cart: ShoppingCart,
  headphones: Headphones,
  message: MessageCircle,
  target: Target,
  zap: Zap,
  heart: Heart,
  star: Star,
  award: Award,
  trending: TrendingUp,
  users: Users,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  shield: Shield,
  lightbulb: Lightbulb,
};

const ICON_KEYS = Object.keys(ROLE_ICONS);

// Функция генерации иконки на основе имени
const generateIconFromName = (name: string): string => {
  // Простой хэш для получения стабильной иконки по имени
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ICON_KEYS.length;
  return ICON_KEYS[index];
};

// Функция получения компонента иконки
const getRoleIcon = (iconName: string): LucideIcon => {
  return ROLE_ICONS[iconName] || Briefcase;
};

export const TrainingRoles: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<TrainingRole[]>([]);
  const [sources, setSources] = useState<TrainingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Panels state
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    description: true,
    sources: true,
  });

  // Filters state
  const [filters, setFilters] = useState({
    sources: 'all' as 'all' | 'with' | 'without'
  });

  // Refs for click-outside detection
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TrainingRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'briefcase',
    sourceIds: [] as string[]
  });

  // View knowledge modal
  const [viewingRole, setViewingRole] = useState<TrainingRole | null>(null);
  const [roleKnowledge, setRoleKnowledge] = useState<string>('');
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  // Delete confirmation modal
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<TrainingRole | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, sourcesData] = await Promise.all([
        trainingService.getRoles(),
        trainingService.getSources()
      ]);
      setRoles(rolesData);
      setSources(sourcesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', icon: 'briefcase', sourceIds: [] });
    setIsModalOpen(true);
  };

  const handleEditRole = (role: TrainingRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      icon: role.icon,
      sourceIds: role.sourceIds
    });
    setIsModalOpen(true);
  };

  const handleDeleteRole = (role: TrainingRole) => {
    setDeleteConfirmRole(role);
  };

  const confirmDeleteRole = async () => {
    if (!deleteConfirmRole) return;

    try {
      await trainingService.deleteRole(deleteConfirmRole.id);
      await loadData();
      try {
        await notificationsService.createNotification({
          type: 'warning',
          titleKey: 'training.roleDeleted',
          messageKey: 'training.roleDeletedMessage',
          params: { name: deleteConfirmRole.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error deleting role:', error);
    } finally {
      setDeleteConfirmRole(null);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await trainingService.updateRole(editingRole.id, formData);
        try {
          await notificationsService.createNotification({
            type: 'success',
            titleKey: 'training.roleUpdated',
            messageKey: 'training.roleUpdatedMessage',
            params: { name: formData.name },
          });
        } catch (e) { /* ignore */ }
      } else {
        // Авто-генерация иконки при создании новой роли
        const roleDataWithIcon = {
          ...formData,
          icon: generateIconFromName(formData.name)
        };
        await trainingService.createRole(roleDataWithIcon);
        try {
          await notificationsService.createNotification({
            type: 'success',
            titleKey: 'training.roleCreated',
            messageKey: 'training.roleCreatedMessage',
            params: { name: formData.name },
          });
        } catch (e) { /* ignore */ }
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleViewKnowledge = async (role: TrainingRole) => {
    setViewingRole(role);
    setLoadingKnowledge(true);
    try {
      const knowledge = await trainingService.getRoleKnowledge(role.id);
      setRoleKnowledge(knowledge);
    } catch (error) {
      console.error('Error loading knowledge:', error);
      setRoleKnowledge(t('training.knowledgeLoadError'));
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const toggleSourceSelection = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      sourceIds: prev.sourceIds.includes(sourceId)
        ? prev.sourceIds.filter(id => id !== sourceId)
        : [...prev.sourceIds, sourceId]
    }));
  };

  const toggleSelectRole = (id: string) => {
    setSelectedRoles(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedRoles(filteredRoles.map(r => r.id));
  const deselectAll = () => setSelectedRoles([]);

  const filteredRoles = roles.filter(role => {
    // Search filter
    const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Sources filter
    let matchesSources = true;
    if (filters.sources === 'with') {
      matchesSources = role.sourceIds.length > 0;
    } else if (filters.sources === 'without') {
      matchesSources = role.sourceIds.length === 0;
    }

    return matchesSearch && matchesSources;
  });

  // Count active filters
  const activeFiltersCount = (filters.sources !== 'all' ? 1 : 0);

  // Get translated name for built-in sources
  const getSourceName = (source: TrainingSource): string => {
    if (source.isBuiltIn && source.id.startsWith('builtin-')) {
      const translatedName = t(`training.builtInNames.${source.id}`, { defaultValue: '' });
      return translatedName || source.name;
    }
    return source.name;
  };

  // Get translated category label
  const getCategoryLabel = (category: string): string => {
    const translatedLabel = t(`training.categories.${category}`, { defaultValue: '' });
    return translatedLabel || trainingService.getCategoryLabel(category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D4]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('training.roles')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('training.rolesSubtitle')}
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm flex items-center gap-2"
        >
          <Plus size={16} />
          {t('common.create')}
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors relative">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('training.searchRoles')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-8 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}
            title={t('common.filters')}
          >
            <Filter size={16} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0078D4] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
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

        {/* Filter Panel - Modern sliding panel */}
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
              <button
                onClick={() => setShowFilterPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Sources filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('training.sourcesFilter', 'Источники')}
              </label>
              <select
                value={filters.sources}
                onChange={(e) => setFilters(prev => ({ ...prev, sources: e.target.value as 'all' | 'with' | 'without' }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all"
              >
                <option value="all">{t('training.sourcesAll', 'Все роли')}</option>
                <option value="with">{t('training.sourcesWithSources', 'С источниками')}</option>
                <option value="without">{t('training.sourcesWithoutSources', 'Без источников')}</option>
              </select>
            </div>

            {/* Reset filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters({ sources: 'all' })}
                className="w-full text-sm text-[#0078D4] hover:text-[#006cbd] font-medium py-2 hover:bg-[#0078D4]/5 rounded-lg transition-colors"
              >
                {t('common.resetFilters', 'Сбросить фильтры')}
              </button>
            )}
          </div>
        </div>

        {/* Columns Panel - Modern sliding panel with toggle switches */}
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('training.name')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.name ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.name ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Description column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, description: !prev.description }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('training.description')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.description ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.description ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Sources column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, sources: !prev.sources }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('training.sources')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.sources ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.sources ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredRoles.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <Briefcase size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('training.noRoles')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('training.noRolesHint')}
            </p>
            <button
              onClick={handleCreateRole}
              className="inline-flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"
            >
              <Plus size={16} />
              {t('training.createFirstRole', 'Создать первую роль')}
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedRoles.length === filteredRoles.length && filteredRoles.length > 0}
                      onChange={() => (selectedRoles.length === filteredRoles.length ? deselectAll() : selectAll())}
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  {visibleColumns.name && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('training.name')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.description && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('training.description')}
                    </th>
                  )}
                  {visibleColumns.sources && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('training.sources')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    onClick={() => handleEditRole(role)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => toggleSelectRole(role.id)}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    {visibleColumns.name && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const IconComponent = getRoleIcon(role.icon || generateIconFromName(role.name));
                            return <IconComponent size={18} className="text-gray-400 dark:text-gray-500" />;
                          })()}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.description && (
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                          {role.description || '—'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.sources && (
                      <td className="px-4 py-4">
                        {role.sourceIds.length === 0 ? (
                          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {role.sourceIds.slice(0, 3).map(sourceId => {
                              const source = sources.find(s => s.id === sourceId);
                              if (!source) return null;
                              return (
                                <span
                                  key={sourceId}
                                  className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                                    trainingService.getCategoryColor(source.category) === 'blue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    trainingService.getCategoryColor(source.category) === 'purple' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                    trainingService.getCategoryColor(source.category) === 'pink' ? 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                                    trainingService.getCategoryColor(source.category) === 'green' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}
                                  title={getSourceName(source)}
                                >
                                  {getSourceName(source).length > 20
                                    ? getSourceName(source).substring(0, 20) + '...'
                                    : getSourceName(source)}
                                </span>
                              );
                            })}
                            {role.sourceIds.length > 3 && (
                              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                +{role.sourceIds.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                        <button
                          onClick={() => handleViewKnowledge(role)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title={t('training.view')}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditRole(role)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('common.total')}: {filteredRoles.length}</span>
              <div className="flex items-center gap-2">
                <span>{t('common.perPage')}</span>
                <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRole ? t('training.editRole') : t('training.createRole')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('training.exampleRoleName')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('training.briefRoleDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm resize-none"
                />
              </div>

              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('training.knowledgeSources')}
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                    {formData.sourceIds.length} {t('training.selected', 'выбрано')}
                  </span>
                </label>
                <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900/50">
                  {sources.map(source => (
                    <label
                      key={source.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        formData.sourceIds.includes(source.id)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-800 border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.sourceIds.includes(source.id)}
                        onChange={() => toggleSourceSelection(source.id)}
                        className="w-4 h-4 rounded text-[#0078D4] border-gray-300 focus:ring-[#0078D4] focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{getSourceName(source)}</div>
                        {source.author && (
                          <div className="text-xs text-gray-500">{source.author}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        trainingService.getCategoryColor(source.category) === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        trainingService.getCategoryColor(source.category) === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        trainingService.getCategoryColor(source.category) === 'pink' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                        trainingService.getCategoryColor(source.category) === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {getCategoryLabel(source.category)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={!formData.name || formData.sourceIds.length === 0}
                className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} />
                {editingRole ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Knowledge Modal */}
      {viewingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComponent = getRoleIcon(viewingRole.icon || generateIconFromName(viewingRole.name));
                  return <IconComponent size={20} className="text-gray-400 dark:text-gray-500" />;
                })()}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewingRole.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('training.sourcesCount', { count: viewingRole.sourceIds.length })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRole(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingKnowledge ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D4]"></div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('training.knowledgeContent', 'Содержимое базы знаний')}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 p-4 overflow-x-auto font-mono leading-relaxed">
                    {roleKnowledge}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
              {t('training.deleteRole', 'Удалить роль')}
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
              {t('training.deleteRoleConfirm', 'Вы уверены, что хотите удалить роль')} "{deleteConfirmRole.name}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmRole(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteRole}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
