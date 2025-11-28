import React, { useState, useRef, useEffect } from 'react';
import { Folder, Edit, Trash2, Filter, LayoutGrid, ChevronDown, Copy, ArrowLeft, X, Search, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface KbCategoriesProps {
  onCreate: () => void;
  categories: { id: string; name: string; parentId: string | null }[];
  articles?: { id: number; title: string; categories: string[]; isActive: boolean }[];
  currentCategoryId?: string | null;
  onEditCategory?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onCopyCategory?: (category: { id: string; name: string; parentId: string | null }) => void;
  onOpenCategory?: (id: string | null) => void;
  onCreateArticle?: () => void;
  onEditArticle?: (id: number) => void;
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
  onEditArticle
}) => {
  const { t } = useTranslation();

  // Helper function to translate category names
  const getCategoryName = (name: string): string => {
    const translatedName = t(`knowledgeBase.defaultCategories.${name}`, { defaultValue: '' });
    return translatedName || name;
  };

  // Фильтруем категории по текущему parentId
  const displayedCategories = categories.filter(cat => cat.parentId === currentCategoryId);

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
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

  // Функция подсчета статей в категории
  const getArticlesCount = (categoryName: string): number => {
    return articles.filter(article => article.categories.includes(categoryName)).length;
  };

  // Построить путь breadcrumbs
  const buildBreadcrumbs = (): { id: string | null; name: string }[] => {
    if (!currentCategoryId) return [{ id: null, name: t('knowledgeBase.categories') }];

    const path: { id: string | null; name: string }[] = [{ id: null, name: t('knowledgeBase.categories') }];
    let currentId: string | null = currentCategoryId;

    while (currentId) {
      const category = categories.find(c => c.id === currentId);
      if (!category) break;
      path.push({ id: category.id, name: getCategoryName(category.name) });
      currentId = category.parentId;
    }

    return path.reverse();
  };

  const breadcrumbs = buildBreadcrumbs();
  const currentCategory = currentCategoryId ? categories.find(c => c.id === currentCategoryId) : null;

  // Фильтруем статьи для текущей категории
  const categoryArticles = currentCategory
    ? articles.filter(article => article.categories.includes(currentCategory.name))
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
                {index > 0 && <span>›</span>}
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors relative">
        {/* Filters / Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            ref={filterButtonRef}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors relative"
            title={t('common.filters')}
          >
            <Filter size={16} />
            {filters.parentCategory !== 'all' && (
              <span className="absolute -top-1 -right-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1 rounded-full">1</span>
            )}
          </button>
          <button
            ref={columnsButtonRef}
            onClick={() => setShowColumnsPanel(!showColumnsPanel)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors"
            title={t('common.columns')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Filter Panel - Боковая панель фильтров */}
        {showFilterPanel && (
          <div ref={filterPanelRef} className="absolute top-12 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">{t('common.filters')}</h3>
              <button
                onClick={() => setFilters({ parentCategory: 'all' })}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('common.reset')}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('knowledgeBase.parentCategory')}
                </label>
                <select
                  value={filters.parentCategory}
                  onChange={(e) => setFilters(prev => ({ ...prev, parentCategory: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">{t('common.all')}</option>
                  {categories.filter(cat => cat.parentId === null).map(cat => (
                    <option key={cat.id} value={cat.id}>{getCategoryName(cat.name)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Columns Panel - Боковая панель столбцов */}
        {showColumnsPanel && (
          <div ref={columnsPanelRef} className="absolute top-12 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('common.columns')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.title}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, title: !prev.title }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.title')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.subcategories}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, subcategories: !prev.subcategories }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.subcategories')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.articles}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, articles: !prev.articles }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('knowledgeBase.articles')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Empty State for Subcategories */}
        {displayedCategories.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <X size={24} className="text-gray-400 dark:text-gray-500" />
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
                        {getArticlesCount(category.name)}
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
          </>
        )}
      </div>

      {/* Articles Section - Only show when inside a category */}
      {currentCategory && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('knowledgeBase.articlesInCategory', { name: getCategoryName(currentCategory.name) })}
          </h2>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent"
                />
              </div>
            </div>

            {/* Articles List or Empty State */}
            {filteredArticles.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <X size={24} className="text-gray-400 dark:text-gray-500" />
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
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('knowledgeBase.title')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider"></th>
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
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">{article.title}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          article.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {article.isActive ? t('knowledgeBase.isActive') : t('knowledgeBase.isInactive')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEditArticle === 'function') onEditArticle(article.id);
                          }}
                          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span></span>
              <div className="flex items-center gap-2">
                <span>{t('common.perPage')}</span>
                <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
