import React from 'react';
import { Folder, Edit, Trash2, Filter, LayoutGrid, ChevronDown } from 'lucide-react';

interface KbCategoriesProps {
  onCreate: () => void;
  categories: { id: string; name: string }[];
  onEditCategory?: (id: string) => void;
}

export const KbCategories: React.FC<KbCategoriesProps> = ({ onCreate, categories, onEditCategory }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Категории</span>
            <span>/</span>
            <span>Список</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Категории</h1>
        </div>
        <button
          onClick={onCreate}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"
        >
          Создать
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
        {/* Filters / Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors relative">
            <Filter size={16} />
            <span className="absolute -top-1 -right-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1 rounded-full">0</span>
          </button>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors">
            <LayoutGrid size={16} />
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                Заголовок <ChevronDown size={14} className="inline ml-1" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Подкатегории</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Статьи</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category) => (
              <tr
                key={category.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => {
                  if (typeof onEditCategory === 'function') {
                    onEditCategory(category.id);
                  }
                }}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    onChange={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Folder size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-900 dark:text-white">{category.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">0</td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">1</td>
                <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                    <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}><Folder size={16} /></button>
                    <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={(e) => { e.stopPropagation(); if (typeof onEditCategory === 'function') onEditCategory(category.id); }}><Edit size={16} /></button>
                    <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors" onClick={(e) => e.stopPropagation()}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Показано с 1 по {categories.length} из {categories.length}</span>
          <div className="flex items-center gap-2">
            <span>на страницу</span>
            <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};