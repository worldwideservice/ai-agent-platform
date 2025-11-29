import React, { useState, useRef, useEffect } from 'react';
import { Folder, Edit, Trash2, Filter, LayoutGrid, Copy, ArrowLeft, X, Search, Plus, Check, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../components/ui';

interface KbCategoriesProps {
  onCreate: () => void;
  categories: { id: string; name: string; parentId: string | null }[];
  articles?: { id: number; title: string; categories: string[]; isActive: boolean; createdAt: string }[];
  currentCategoryId?: string | null;
  onEditCategory?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onCopyCategory?: (category: { id: string; name: string; parentId: string | null }) => void;
  onOpenCategory?: (id: string | null) => void;
  onCreateArticle?: () => void;
  onEditArticle?: (id: number) => void;
  onToggleArticleStatus?: (id: number) => void;
  loading?: boolean;
}

export const KbCategories: React.FC<KbCategoriesProps> = ({
  onCreate,
  categories,
  articles = [],
  currentCategoryId = null,
  onEditCategory,
  onDeleteCategory,
  onCopyCategory,
  onOpenCategory,
  onCreateArticle,
  onEditArticle,
  onToggleArticleStatus,
  loading = false
}) => {
  const { t } = useTranslation();

  // Helper function to translate category names or look up by ID
  const getCategoryName = (nameOrId: string): string => {
    // First, try to find a category by ID
    const category = categories.find(c => c.id === nameOrId);
    const name = category ? category.name : nameOrId;

    // Then translate the name
    const translatedName = t(`knowledgeBase.defaultCategories.${name}`, { defaultValue: '' });
    return translatedName || name;
  };

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Фильтруем категории по текущему parentId и поисковому запросу
  const displayedCategories = categories.filter(cat => {
    const matchesParent = cat.parentId === currentCategoryId;
    const matchesSearch = !searchQuery || getCategoryName(cat.name).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesParent && matchesSearch;
  });
  const [showColumnsPanel, setShowColumnsPanel] = React.useState(false);
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [visibleColumns, setVisibleColumns] = React.useState({
    title: true,
    subcategories: true,
    articles: true,
  });
  const [filters, setFilters] = React.useState({
    parentCategory: 'all',
  });

  // Refs for click-outside detection
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const columnsPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

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

  const toggleSelectCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedCategories(displayedCategories.map(c => c.id));
  const deselectAll = () => setSelectedCategories([]);

  // Функция подсчета подкатегорий
  const getSubcategoriesCount = (categoryId: string): number => {
    return categories.filter(cat => cat.parentId === categoryId).length;
  };

  // Функция подсчета статей в категории (по ID категории)
  const getArticlesCount = (categoryId: string): number => {
    return articles.filter(article => article.categories.includes(categoryId)).length;
  };

  // Построить путь breadcrumbs
  const buildBreadcrumbs = (): { id: string | null; name: string }[] => {
    const basePath: { id: string | null; name: string }[] = [
      { id: null, name: t('knowledgeBase.categories') },
      { id: null, name: t('common.list') }
    ];

    if (!currentCategoryId) return basePath;

    const path = [...basePath];
    let currentId: string | null = currentCategoryId;
    const categoryPath: { id: string; name: string }[] = [];

    while (currentId) {
      const category = categories.find(c => c.id === currentId);
      if (!category) break;
      categoryPath.push({ id: category.id, name: getCategoryName(category.name) });
      currentId = category.parentId;
    }

    return [...path, ...categoryPath.reverse()];
  };

  const breadcrumbs = buildBreadcrumbs();
  const currentCategory = currentCategoryId ? categories.find(c => c.id === currentCategoryId) : null;

  // Фильтруем статьи для текущей категории (по ID)
  const categoryArticles = currentCategory
    ? articles.filter(article => article.categories.includes(currentCategory.id))
    : [];

  const filteredArticles = categoryArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || 'root'}>
                {index > 0 && <span>/</span>}
                <button
                  onClick={() => {
                    if (typeof onOpenCategory === 'function') {
                      onOpenCategory(crumb.id);
                    }
                  }}
                  className={`hover:text-gray-700 dark:hover:text-gray-300 ${
                    index === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-white' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentCategory ? getCategoryName(currentCategory.name) : t('knowledgeBase.categories')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {currentCategory && (
            <button
              onClick={() => {
                if (typeof onOpenCategory === 'function') {
                  onOpenCategory(currentCategory.parentId);
                }
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              {t('knowledgeBase.backToParent')}
            </button>
          )}
          <button
            onClick={onCreate}
            className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"
          >
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Subcategories Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors relative">
        {/* Filters / Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('knowledgeBase.searchCategories')}
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
              showFilterPanel
                ? 'bg-[#0078D4]/10 text-[#0078D4] border border-[#0078D4]/30'
                : filters.parentCategory !== 'all'
                  ? 'bg-[#0078D4]/5 text-[#0078D4] border border-[#0078D4]/20 hover:bg-[#0078D4]/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}
            title={t('common.filters')}
          >
            <Filter size={16} />
            {filters.parentCategory !== 'all' && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] bg-[#0078D4] text-white text-[9px] font-bold rounded-full">
                1
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
              <div className="flex items-center gap-2">
                {filters.parentCategory !== 'all' && (
                  <button
                    onClick={() => {
                      setFilters({ parentCategory: 'all' });
                    }}
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
              {/* Parent Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {t('knowledgeBase.parentCategory')}
                </label>
                <select
                  value={filters.parentCategory}
                  onChange={(e) => setFilters(prev => ({ ...prev, parentCategory: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4] outline-none cursor-pointer transition-all"
                >
                  <option value="all">{t('common.all')}</option>
                  {categories.filter(cat => cat.parentId === null).map(cat => (
                    <option key={cat.id} value={cat.id}>{getCategoryName(cat.name)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filters indicator */}
            {filters.parentCategory !== 'all' && (
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
              {/* Title column toggle */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, title: !prev.title }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('knowledgeBase.title')}
                </span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.title ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.title ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Subcategories column toggle */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, subcategories: !prev.subcategories }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('knowledgeBase.subcategories')}
                </span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.subcategories ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.subcategories ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>

              {/* Articles column toggle */}
              <button
                onClick={() => setVisibleColumns(prev => ({ ...prev, articles: !prev.articles }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('knowledgeBase.articles')}
                </span>
                <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ease-in-out ${
                  visibleColumns.articles ? 'bg-[#0078D4]' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                    visibleColumns.articles ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : displayedCategories.length === 0 ? (
          /* Empty State for Subcategories */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <X size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('knowledgeBase.noSubcategories')}</h3>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === displayedCategories.length && displayedCategories.length > 0}
                      onChange={() => (selectedCategories.length === displayedCategories.length ? deselectAll() : selectAll())}
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  {visibleColumns.title && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.title')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.subcategories && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.subcategories')}</th>
                  )}
                  {visibleColumns.articles && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('knowledgeBase.articles')}</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayedCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => {
                      if (typeof onOpenCategory === 'function') {
                        onOpenCategory(category.id);
                      }
                    }}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectCategory(category.id);
                        }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    {visibleColumns.title && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Folder size={18} className="text-gray-400 dark:text-gray-500" />
                          <span className="text-sm text-gray-900 dark:text-white">{getCategoryName(category.name)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.subcategories && (
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {getSubcategoriesCount(category.id)}
                      </td>
                    )}
                    {visibleColumns.articles && (
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {getArticlesCount(category.id)}
                      </td>
                    )}
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEditCategory === 'function') onEditCategory(category.id);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onCopyCategory === 'function') onCopyCategory(category);
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onDeleteCategory === 'function') onDeleteCategory(category.id);
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

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('common.showingFromTo', { from: 1, to: displayedCategories.length, total: displayedCategories.length })}</span>
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

      {/* Articles Section - Only show when inside a category */}
      {currentCategory && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('knowledgeBase.articlesInCategory', { name: getCategoryName(currentCategory.name) })}
            </h2>
          </div>

          {/* Articles List or Empty State */}
          {filteredArticles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
                  <X size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('knowledgeBase.noArticlesFound')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('knowledgeBase.articlesWillAppearHere')}
                </p>
                {onCreateArticle && (
                  <button
                    onClick={onCreateArticle}
                    className="inline-flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"
                  >
                    <Plus size={16} />
                    {t('knowledgeBase.createArticle')}
                  </button>
                )}
              </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.id')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.title')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.isActive')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.categories')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.createdAt')} <ChevronDown size={14} className="inline ml-1" />
                    </th>
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
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {article.id}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">{article.title}</span>
                      </td>
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
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {article.categories.map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300"
                            >
                              {getCategoryName(cat)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {article.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{t('common.showingFromTo', { from: 1, to: filteredArticles.length, total: filteredArticles.length })}</span>
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
      )}
    </div>
  );
};
