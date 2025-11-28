import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Briefcase,
  Headphones,
  MessageCircle,
  User,
  Users,
  Target,
  Star,
  Award,
  TrendingUp,
  Zap,
  Edit2,
  Trash2,
  ChevronRight,
  X,
  Check,
  Book
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingRole, TrainingSource } from '../types';
import * as trainingService from '../src/services/api/training.service';
import { notificationsService } from '../src/services/api';

// Icon mapping
const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'briefcase': Briefcase,
  'headphones': Headphones,
  'message-circle': MessageCircle,
  'user': User,
  'users': Users,
  'target': Target,
  'star': Star,
  'award': Award,
  'trending-up': TrendingUp,
  'zap': Zap
};

export const TrainingRoles: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<TrainingRole[]>([]);
  const [sources, setSources] = useState<TrainingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

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

  const handleDeleteRole = async (role: TrainingRole) => {
    if (!confirm(t('training.deleteRoleConfirm'))) return;

    try {
      await trainingService.deleteRole(role.id);
      await loadData();
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'warning',
          titleKey: 'training.roleDeleted',
          messageKey: 'training.roleDeletedMessage',
          params: { name: role.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await trainingService.updateRole(editingRole.id, formData);
        // Создаём уведомление об обновлении
        try {
          await notificationsService.createNotification({
            type: 'success',
            titleKey: 'training.roleUpdated',
            messageKey: 'training.roleUpdatedMessage',
            params: { name: formData.name },
          });
        } catch (e) { /* ignore */ }
      } else {
        await trainingService.createRole(formData);
        // Создаём уведомление о создании
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

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const RoleIcon = ({ icon }: { icon: string }) => {
    const IconComponent = iconMap[icon] || Briefcase;
    return <IconComponent size={20} />;
  };

  const getSourcesForRole = (sourceIds: string[]) => {
    return sources.filter(s => sourceIds.includes(s.id));
  };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('training.roles')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('training.rolesSubtitle')}
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          {t('training.createRole')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('training.searchRoles')}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Roles */}
      <div>
        {filteredRoles.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
            <Book size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">{t('training.noRoles')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {t('training.noRolesHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map(role => (
              <div
                key={role.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <RoleIcon icon={role.icon} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {role.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {role.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('training.sourcesCount', { count: role.sourceIds.length })}
                  </span>
                  <button
                    onClick={() => handleViewKnowledge(role)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {t('training.view')}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingRole ? t('training.editRole') : t('training.createRole')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

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
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('training.icon')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {trainingService.ROLE_ICONS.map(icon => {
                    const IconComp = iconMap[icon] || Briefcase;
                    return (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          formData.icon === icon
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <IconComp size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('training.knowledgeSources')} ({t('training.sourcesSelected', { count: formData.sourceIds.length })})
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {sources.map(source => (
                    <label
                      key={source.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.sourceIds.includes(source.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.sourceIds.includes(source.id)}
                        onChange={() => toggleSourceSelection(source.id)}
                        className="rounded text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{getSourceName(source)}</div>
                        {source.author && (
                          <div className="text-xs text-gray-500">{source.author}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
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

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={!formData.name || formData.sourceIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check size={18} />
                {editingRole ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Knowledge Modal */}
      {viewingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <RoleIcon icon={viewingRole.icon} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewingRole.name}
                  </h2>
                  <p className="text-sm text-gray-500">{t('training.sourcesCount', { count: viewingRole.sourceIds.length })}</p>
                </div>
              </div>
              <button onClick={() => setViewingRole(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingKnowledge ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    {roleKnowledge}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
