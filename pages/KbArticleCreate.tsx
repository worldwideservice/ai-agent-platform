import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface KbArticleCreateProps {
  onCancel: () => void;
}

export const KbArticleCreate: React.FC<KbArticleCreateProps> = ({ onCancel }) => {
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState(['Общее']);
  const [relatedArticles, setRelatedArticles] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const removeCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== cat));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Breadcrumbs and Title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Статьи</span>
          <span>/</span>
          <span>Создать</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Создать Статья</h1>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8 space-y-8 transition-colors">
        
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

        {/* Active Toggle */}
        <div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Активно</span>
          </div>
        </div>

        {/* Categories Multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Категории<span className="text-red-500">*</span>
          </label>
          <div className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 min-h-[42px] flex items-center justify-between bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm">
                  {cat}
                  <button onClick={() => removeCategory(cat)} className="hover:text-blue-900 dark:hover:text-blue-300">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              {selectedCategories.length > 0 && (
                <button onClick={() => setSelectedCategories([])} className="hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={16} />
                </button>
              )}
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Связанные статьи
          </label>
          <div className="relative">
             <div className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 flex items-center justify-between text-gray-400">
               <span>Найдите и выберите связанные статьи...</span>
               <ChevronDown size={16} />
             </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Когда агент находит эту статью, он также использует связанные статьи для предоставления более полного ответа.
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Содержимое<span className="text-red-500">*</span>
          </label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow min-h-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* File Upload */}
        <div>
           <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Отправить файлы
          </label>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
             <button className="text-sm text-gray-600 dark:text-gray-400">
               Перетащите файлы или <span className="text-[#0078D4] hover:underline">выберите</span>
             </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            Эти файлы (изображения, аудио, видео или документы) будут отправлены клиентам, когда Агент ИИ использует эту статью в ответе. Если используются несколько статей, отправляются файлы из наиболее релевантной статьи.
          </p>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
          Создать
        </button>
        <button className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
          Создать и Создать еще
        </button>
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