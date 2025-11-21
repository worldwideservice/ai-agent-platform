import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface KbCategoryCreateProps {
  onCancel: () => void;
  category?: { id: string; name: string; parentId: string | null } | null;
  onSave?: (category: { id: string; name: string; parentId: string | null }) => void;
  onAdd?: (category: { name: string; parentId: string | null }) => void;
  categories?: { id: string; name: string; parentId: string | null }[];
  currentCategoryId?: string | null;
}

export const KbCategoryCreate: React.FC<KbCategoryCreateProps> = ({
  onCancel,
  category,
  onSave,
  onAdd,
  categories = [],
  currentCategoryId = null
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategory, setParentCategory] = useState<string | null>(currentCategoryId);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  const isEditMode = !!category;

  useEffect(() => {
    if (category) {
      setTitle(category.name);
      setParentCategory(category.parentId);
    } else {
      setParentCategory(currentCategoryId);
    }
  }, [category, currentCategoryId]);

  const getParentCategoryName = () => {
    if (!parentCategory) return null;
    const parent = categories.find(c => c.id === parentCategory);
    return parent ? parent.name : null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs and Title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Категории</span>
          <span>/</span>
          <span>{isEditMode ? 'Редактировать' : 'Создать'}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Редактировать Категорию' : 'Создать Категорию'}
        </h1>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8 space-y-6 transition-colors">
        
        {/* Parent Category Field */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Родительская категория
          </label>
          <div className="relative">
            <div
              onClick={() => setShowParentDropdown(!showParentDropdown)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 flex items-center justify-between bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
            >
              <span className={`text-sm ${getParentCategoryName() ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {getParentCategoryName() || 'Нет родительской категории (корневая)'}
              </span>
              <div className="flex items-center gap-2 text-gray-400">
                {parentCategory && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setParentCategory(null); }}
                    className="hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                )}
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Dropdown */}
            {showParentDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                <div
                  onClick={() => {
                    setParentCategory(null);
                    setShowParentDropdown(false);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                >
                  Нет родительской категории (корневая)
                </div>
                {categories.filter(c => !category || c.id !== category.id).map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setParentCategory(cat.id);
                      setShowParentDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Заголовок<span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
          />
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Описание
          </label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow resize-y bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (!title) return;
            if (isEditMode && onSave && category) {
              onSave({ ...category, name: title, parentId: parentCategory });
            } else if (onAdd) {
              onAdd({ name: title, parentId: parentCategory });
            }
          }}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          {isEditMode ? 'Сохранить' : 'Создать'}
        </button>
        {!isEditMode && (
          <button
            onClick={() => {
              if (!title) return;
              if (onAdd) {
                onAdd({ name: title, parentId: parentCategory });
                setTitle('');
                setDescription('');
              }
            }}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            Создать и Создать еще
          </button>
        )}
        <button
          onClick={onCancel}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};