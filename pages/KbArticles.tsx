import React, { useState } from 'react';
import { FileText, Filter, LayoutGrid, X } from 'lucide-react';

interface KbArticlesProps {
  onCreate: () => void;
}

export const KbArticles: React.FC<KbArticlesProps> = ({ onCreate }) => {
  const [activeFilters, setActiveFilters] = useState<string[]>(['Категория: Общее']);

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden min-h-[600px] flex flex-col transition-colors">
        
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
               <input 
                 type="text" 
                 placeholder="Поиск" 
                 className="pl-3 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
               />
             </div>
             <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors relative">
               <Filter size={16} />
               {activeFilters.length > 0 && (
                 <span className="absolute -top-1 -right-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1 rounded-full">{activeFilters.length}</span>
               )}
             </button>
             <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors">
               <LayoutGrid size={16} />
             </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
           <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
             <X size={32} strokeWidth={1.5} />
           </div>
           <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Не найдено Статьи</h3>
        </div>
      </div>
    </div>
  );
};