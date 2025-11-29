import React, { useState, useRef, useEffect } from 'react';
import { Filter, LayoutGrid, X, Search, ChevronDown, Edit, Trash2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../components/ui';

interface KbArticlesProps {
  onCreate: () => void;
  articles: {
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  }[];
  categories?: { id: string; name: string; parentId: string | null }[];
  onEditArticle?: (id: number) => void;
  onDeleteArticle?: (id: number) => void;
  onCopyArticle?: (article: KbArticlesProps['articles'][0]) => void;
  onToggleArticleStatus?: (id: number) => void;
  loading?: boolean;
}

export const KbArticles: React.FC<KbArticlesProps> = ({ onCreate, articles, categories = [], onEditArticle, onDeleteArticle, onCopyArticle, onToggleArticleStatus, loading = false }) => {
  const { t } = useTranslation();

  // Helper function to get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      const translatedName = t(`knowledgeBase.defaultCategories.${category.name}`, { defaultValue: '' });
      return translatedName || category.name;
    }
    return categoryId;
  };

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    title: true,
    active: true,
    categories: true,
    relatedArticles: true,
    createdAt: true,
  });
  const [filters, setFilters] = useState({
    status: 'all', // all, active, inactive
    category: 'all',
  });

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  const toggleSelectArticle = (id: number) => {
    setSelectedArticles(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Фильтрация статей по поисковому запросу и фильтрам
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.id.toString().includes(searchQuery);
    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' && article.isActive) ||
      (filters.status === 'inactive' && !article.isActive);
    const matchesCategory = filters.category === 'all' ||
      article.categories.includes(filters.category);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const selectAll = () => setSelectedArticles(filteredArticles.map(a => a.id));
  const deselectAll = () => setSelectedArticles([]);

  // Закрытие панелей при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Закрытие панели фильтров
      if (showFilterMenu &&
          filterPanelRef.current &&
          !filterPanelRef.current.contains(event.target as Node) &&
          filterButtonRef.current &&
          !filterButtonRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }

      // Закрытие панели столбцов
      if (showColumnsPanel &&
          columnsPanelRef.current &&
          !columnsPanelRef.current.contains(event.target as Node) &&
          columnsButtonRef.current &&
          !columnsButtonRef.current.contains(event.target as Node)) {
        setShowColumnsPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu, showColumnsPanel]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('knowledgeBase.articles')}</span>
            <span>/</span>
            <span>{t('knowledgeBase.list')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('knowledgeBase.articles')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCreate}
            className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"
          >
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col transition-colors relative">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
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
              setShowFilterMenu(!showFilterMenu);
              setShowColumnsPanel(false);
            }}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              showFilterMenu
                ? 'bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30'
                : (filters.status !== 'all' || filters.category !== 'all')
                  ? 'bg-[#0078D4]/5 text-[#0078D4] border border-[#0078D4]/20 hover:bg-[#0078D4]/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}
            title={t('common.filters')}
          >
            <Filter size={16} />
            {(filters.status !== 'all' || filters.category !== 'all') && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] bg-[#0078D4] text-white text-[9px] font-bold rounded-full">
                {(filters.status !== 'all' ? 1 : 0) + (filters.category !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          <button
            ref={columnsButtonRef}
            onClick={() => {
              setShowColumnsPanel(!showColumnsPanel);
              setShowFilterMenu(false);
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
            showFilterMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
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
                {(filters.status !== 'all' || filters.category !== 'all') && (
                  <button
                    onClick={() => setFilters({ status: 'all', category: 'all' })}
                    className="text-xs text-[#0078D4] hover:text-[#006cbd] font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {t('common.reset')}
                  </button>
                )}
                <button
                  onClick={() => setShowFilterMenu(false)}
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
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                </select>
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('knowledgeBase.category')}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="all">{t('knowledgeBase.allCategories')}</option>
                  <option value="Общее">{getCategoryName('Общее')}</option>
                  <option value="Поддержка">{getCategoryName('Поддержка')}</option>
                  <option value="FAQ">{getCategoryName('FAQ')}</option>
                </select>
              </div>
            </div>
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
              {/* ID column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, id: !prev.id }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.id')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.id ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.id ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Title column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, title: !prev.title }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.title')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.title ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.title ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Active column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, active: !prev.active }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.isActive')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.active ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.active ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Categories column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, categories: !prev.categories }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.categories')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.categories ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.categories ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Related Articles column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, relatedArticles: !prev.relatedArticles }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.relatedArticles')}</span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.relatedArticles ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.relatedArticles ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Created At column */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, createdAt: !prev.createdAt }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('common.createdAt')}</span>
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

        {/* Content: Loading, Table or Empty State */}
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : filteredArticles.length > 0 ? (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedArticles.length === filteredArticles.length && filteredArticles.length > 0}
                      onChange={() => (selectedArticles.length === filteredArticles.length ? deselectAll() : selectAll())}
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  {visibleColumns.id && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.id')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.title && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.title')}</th>
                  )}
                  {visibleColumns.active && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.isActive')}</th>
                  )}
                  {visibleColumns.categories && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.categories')}</th>
                  )}
                  {visibleColumns.relatedArticles && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.relatedArticles')}</th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.createdAt')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => {
                      if (typeof onEditArticle === 'function') {
                        onEditArticle(article.id);
                      }
                    }}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectArticle(article.id);
                        }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    {visibleColumns.id && (
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{article.id}</td>
                    )}
                    {visibleColumns.title && (
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{article.title}</td>
                    )}
                    {visibleColumns.active && (
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onToggleArticleStatus === 'function') onToggleArticleStatus(article.id);
                          }}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${article.isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${article.isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </td>
                    )}
                    {visibleColumns.categories && (
                      <td className="px-4 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {article.categories.map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-default"
                            >
                              {getCategoryName(cat)}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    {visibleColumns.relatedArticles && (
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{article.relatedArticles.length > 0 ? article.relatedArticles.join(', ') : ''}</td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{article.createdAt}</td>
                    )}
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEditArticle === 'function') onEditArticle(article.id);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onCopyArticle === 'function') onCopyArticle(article);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onDeleteArticle === 'function') onDeleteArticle(article.id);
                          }}
                          className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('common.total')}: {filteredArticles.length}</span>
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
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <X size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {searchQuery ? t('knowledgeBase.noArticlesForQuery') : t('knowledgeBase.noArticles')}
            </h3>
            {searchQuery && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('knowledgeBase.tryDifferentQuery')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};