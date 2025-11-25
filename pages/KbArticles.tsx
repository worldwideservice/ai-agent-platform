import React, { useState, useRef, useEffect } from 'react';
import { Filter, LayoutGrid, X, Search, ChevronDown, Edit, Trash2, Copy } from 'lucide-react';

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
  onEditArticle?: (id: number) => void;
  onDeleteArticle?: (id: number) => void;
  onCopyArticle?: (article: KbArticlesProps['articles'][0]) => void;
  onToggleArticleStatus?: (id: number) => void;
}

export const KbArticles: React.FC<KbArticlesProps> = ({ onCreate, articles, onEditArticle, onDeleteArticle, onCopyArticle, onToggleArticleStatus }) => {
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
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Статьи</span>
            <span>/</span>
            <span>Список</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Статьи</h1>
        </div>
        <button
          onClick={onCreate}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Создать
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors relative">

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {/* Active Filters */}
          <div className="flex items-center gap-2 min-h-[26px]">
            {activeFilters.length > 0 && <span className="text-sm text-gray-700 dark:text-gray-300">Активные фильтры</span>}
            {activeFilters.map(filter => (
              <span key={filter} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-900/50">
                {filter}
                <button onClick={() => removeFilter(filter)} className="cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none">
                  <X size={12} />
                </button>
              </span>
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2 focus:outline-none"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Поиск"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <button
              ref={filterButtonRef}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors relative"
              title="Фильтры"
            >
              <Filter size={16} />
              {(filters.status !== 'all' || filters.category !== 'all') && (
                <span className="absolute -top-1 -right-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1 rounded-full">
                  {(filters.status !== 'all' ? 1 : 0) + (filters.category !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>
            <button
              ref={columnsButtonRef}
              onClick={() => setShowColumnsPanel(!showColumnsPanel)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors"
              title="Столбцы"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel - Боковая панель фильтров */}
        {showFilterMenu && (
          <div ref={filterPanelRef} className="absolute top-12 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Фильтры</h3>
              <button
                onClick={() => setFilters({ status: 'all', category: 'all' })}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Сбросить
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Все</option>
                  <option value="active">Активные</option>
                  <option value="inactive">Неактивные</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Все категории</option>
                  <option value="Общее">Общее</option>
                  <option value="Поддержка">Поддержка</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Columns Panel - Боковая панель столбцов */}
        {showColumnsPanel && (
          <div ref={columnsPanelRef} className="absolute top-12 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Столбцы</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.id}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, id: !prev.id }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">ID</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.title}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, title: !prev.title }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Заголовок</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.active}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, active: !prev.active }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Активно</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.categories}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, categories: !prev.categories }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Категории</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.relatedArticles}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, relatedArticles: !prev.relatedArticles }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Связанные статьи</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.createdAt}
                  onChange={() => setVisibleColumns(prev => ({ ...prev, createdAt: !prev.createdAt }))}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Дата создания</span>
              </label>
            </div>
          </div>
        )}

        {/* Content: Table or Empty State */}
        {filteredArticles.length > 0 ? (
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
                      ID <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  {visibleColumns.title && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Заголовок</th>
                  )}
                  {visibleColumns.active && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Активно</th>
                  )}
                  {visibleColumns.categories && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Категории</th>
                  )}
                  {visibleColumns.relatedArticles && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Связанные статьи</th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      Дата создания <ChevronDown size={14} className="inline ml-1" />
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Действия</th>
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
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${article.isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${article.isActive ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'}`}
                          />
                        </button>
                      </td>
                    )}
                    {visibleColumns.categories && (
                      <td className="px-4 py-4 text-sm">
                        <button className="text-[#0078D4] hover:underline" onClick={(e) => e.stopPropagation()}>{article.categories.join(', ')}</button>
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
              <span>Показано с 1 по {filteredArticles.length} из {articles.length}</span>
              <div className="flex items-center gap-2">
                <span>на страницу</span>
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
              {searchQuery ? 'Не найдено статей по запросу' : 'Не найдено Статьи'}
            </h3>
            {searchQuery && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Попробуйте изменить поисковый запрос
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};