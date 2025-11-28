import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  BookOpen,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingSource } from '../types';
import * as trainingService from '../src/services/api/training.service';
import { notificationsService } from '../src/services/api';

export const TrainingSources: React.FC = () => {
  const { t } = useTranslation();
  const [sources, setSources] = useState<TrainingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<TrainingSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    description: '',
    category: 'custom' as string,
    content: ''
  });

  // View modal
  const [viewingSource, setViewingSource] = useState<TrainingSource | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await trainingService.getSources();
      setSources(data);
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSource = () => {
    setEditingSource(null);
    setFormData({ name: '', author: '', description: '', category: 'custom', content: '' });
    setIsModalOpen(true);
  };

  const handleEditSource = (source: TrainingSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      author: source.author || '',
      description: source.description || '',
      category: source.category,
      content: source.content
    });
    setIsModalOpen(true);
  };

  const handleDeleteSource = async (source: TrainingSource) => {
    if (source.isBuiltIn) return;
    if (!confirm(t('training.deleteSourceConfirm'))) return;

    try {
      await trainingService.deleteSource(source.id);
      await loadSources();
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'warning',
          titleKey: 'training.sourceDeleted',
          messageKey: 'training.sourceDeletedMessage',
          params: { name: source.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error deleting source:', error);
    }
  };

  const handleSaveSource = async () => {
    try {
      if (editingSource) {
        await trainingService.updateSource(editingSource.id, formData);
        // Создаём уведомление об обновлении
        try {
          await notificationsService.createNotification({
            type: 'success',
            titleKey: 'training.sourceUpdated',
            messageKey: 'training.sourceUpdatedMessage',
            params: { name: formData.name },
          });
        } catch (e) { /* ignore */ }
      } else {
        await trainingService.createSource(formData);
        // Создаём уведомление о создании
        try {
          await notificationsService.createNotification({
            type: 'success',
            titleKey: 'training.sourceCreated',
            messageKey: 'training.sourceCreatedMessage',
            params: { name: formData.name },
          });
        } catch (e) { /* ignore */ }
      }
      setIsModalOpen(false);
      await loadSources();
    } catch (error) {
      console.error('Error saving source:', error);
    }
  };

  const filteredSources = sources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || source.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const builtInSources = filteredSources.filter(s => s.isBuiltIn);
  const customSources = filteredSources.filter(s => !s.isBuiltIn);

  // Get translated name for built-in sources
  const getSourceName = (source: TrainingSource): string => {
    if (source.isBuiltIn && source.id.startsWith('builtin-')) {
      const translatedName = t(`training.builtInNames.${source.id}`, { defaultValue: '' });
      return translatedName || source.name;
    }
    return source.name;
  };

  // Get translated description for built-in sources
  const getSourceDescription = (source: TrainingSource): string | null => {
    if (source.isBuiltIn && source.id.startsWith('builtin-')) {
      const translatedDesc = t(`training.builtInDescriptions.${source.id}`, { defaultValue: '' });
      return translatedDesc || source.description;
    }
    return source.description;
  };

  // Get translated category label
  const getCategoryLabel = (category: string): string => {
    const translatedLabel = t(`training.categories.${category}`, { defaultValue: '' });
    return translatedLabel || trainingService.getCategoryLabel(category);
  };

  const getCategoryBadge = (category: string) => {
    const color = trainingService.getCategoryColor(category);
    const label = getCategoryLabel(category);
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colorClasses[color] || colorClasses.gray}`}>
        {label}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('training.sources')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('training.sourcesSubtitle')}
          </p>
        </div>
        <button
          onClick={handleCreateSource}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          {t('training.addSource')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('training.searchSources')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">{t('training.allCategories')}</option>
          {trainingService.SOURCE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.value)}</option>
          ))}
        </select>
      </div>

      {/* Built-in Sources */}
      {builtInSources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            {t('training.builtInSources')} ({builtInSources.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builtInSources.map(source => (
              <div
                key={source.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{getSourceName(source)}</h3>
                      {getCategoryBadge(source.category)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEditSource(source)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                {getSourceDescription(source) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {getSourceDescription(source)}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {source.content.length.toLocaleString()} {t('training.characters')}
                  </span>
                  <button
                    onClick={() => setViewingSource(source)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Eye size={14} />
                    {t('training.view')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sources */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          {t('training.mySources')} ({customSources.length})
        </h2>
        {customSources.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
            <BookOpen size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">{t('training.noSources')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {t('training.noSourcesHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customSources.map(source => (
              <div
                key={source.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{source.name}</h3>
                      {getCategoryBadge(source.category)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditSource(source)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {source.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {source.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {source.content.length.toLocaleString()} {t('training.characters')}
                  </span>
                  <button
                    onClick={() => setViewingSource(source)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Eye size={14} />
                    {t('training.view')}
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
                {editingSource ? t('training.editSource') : t('training.addSource')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.nameRequired')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('training.exampleSourceName')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.author')}
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder={t('training.exampleAuthor')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.categoryRequired')}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {trainingService.SOURCE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.value)}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('training.briefSourceDescription')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('training.contentRequired')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={t('training.contentPlaceholder')}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.content.length.toLocaleString()} {t('training.characters')}
                </p>
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
                onClick={handleSaveSource}
                disabled={!formData.name || !formData.content}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check size={18} />
                {editingSource ? t('common.save') : t('training.addSource')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getSourceName(viewingSource)}
                  </h2>
                  {getCategoryBadge(viewingSource.category)}
                </div>
                {viewingSource.author && (
                  <p className="text-sm text-gray-500">{viewingSource.author}</p>
                )}
              </div>
              <button onClick={() => setViewingSource(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto font-mono">
                {viewingSource.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
