import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface KbArticleCreateProps {
  onCancel: () => void;
  onAddArticle: (article: { title: string; isActive: boolean; categories: string[]; relatedArticles: string[]; content: string }) => void;
  onCreate: () => void;
  availableArticles: { id: number; title: string }[];
  categories: { id: string; name: string; parentId: string | null }[];
  article?: {
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  } | null;
  onSave?: (article: {
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  }) => void;
}

export const KbArticleCreate: React.FC<KbArticleCreateProps> = ({ onCancel, onAddArticle, onCreate, availableArticles, categories, article, onSave }) => {
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!article;

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setIsActive(article.isActive);
      setSelectedCategories(article.categories);
      setRelatedArticles(article.relatedArticles);
      setContent(article.content);
    }
  }, [article]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRelatedDropdown(false);
      }
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    };

    if (showRelatedDropdown || showCategoriesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRelatedDropdown, showCategoriesDropdown]);

  const removeCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== cat));
  };

  const toggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
    } else {
      setSelectedCategories([...selectedCategories, categoryName]);
    }
  };

  const toggleRelatedArticle = (articleTitle: string) => {
    if (relatedArticles.includes(articleTitle)) {
      setRelatedArticles(relatedArticles.filter(a => a !== articleTitle));
    } else {
      setRelatedArticles([...relatedArticles, articleTitle]);
    }
  };

  const removeRelatedArticle = (articleTitle: string) => {
    setRelatedArticles(relatedArticles.filter(a => a !== articleTitle));
  };

  const handleCreate = () => {
    if (!title || !content || selectedCategories.length === 0) {
      return;
    }
    if (isEditMode && onSave && article) {
      onSave({
        ...article,
        title,
        isActive,
        categories: selectedCategories,
        relatedArticles,
        content
      });
    } else {
      onAddArticle({
        title,
        isActive,
        categories: selectedCategories,
        relatedArticles,
        content
      });
      onCreate();
    }
  };

  const handleCreateAndNew = () => {
    if (!title || !content || selectedCategories.length === 0) {
      return;
    }
    onAddArticle({
      title,
      isActive,
      categories: selectedCategories,
      relatedArticles,
      content
    });
    // Clear form
    setTitle('');
    setIsActive(true);
    setSelectedCategories([]);
    setRelatedArticles([]);
    setContent('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Breadcrumbs and Title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Статьи</span>
          <span>/</span>
          <span>{isEditMode ? 'Редактировать' : 'Создать'}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Редактировать Статью' : 'Создать Статью'}
        </h1>
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
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${isActive ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'}`} />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Активно</span>
          </div>
        </div>

        {/* Categories Multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Категории<span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={categoriesDropdownRef}>
            <div
              onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 min-h-[42px] flex items-center justify-between bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex flex-wrap gap-2 flex-1">
                {selectedCategories.length > 0 ? (
                  selectedCategories.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm">
                      {cat}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(cat);
                        }}
                        className="hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">Выберите категории...</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                {selectedCategories.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategories([]);
                    }}
                    className="hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                )}
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Dropdown */}
            {showCategoriesDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-auto">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.name)}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.name)}
                        onChange={() => { }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                      {cat.name}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Нет доступных категорий
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Articles */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Связанные статьи
          </label>
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setShowRelatedDropdown(!showRelatedDropdown)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 min-h-[42px] flex items-center justify-between bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
            >
              <div className="flex flex-wrap gap-2 flex-1">
                {relatedArticles.length > 0 ? (
                  relatedArticles.map((article) => (
                    <span key={article} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm">
                      {article}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRelatedArticle(article);
                        }}
                        className="hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">Найдите и выберите связанные статьи...</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                {relatedArticles.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRelatedArticles([]);
                    }}
                    className="hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                )}
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Dropdown */}
            {showRelatedDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-auto">
                {availableArticles.length > 0 ? (
                  availableArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => toggleRelatedArticle(article.title)}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={relatedArticles.includes(article.title)}
                        onChange={() => { }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                      {article.title}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Нет доступных статей
                  </div>
                )}
              </div>
            )}
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
        <button
          onClick={handleCreate}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          {isEditMode ? 'Сохранить' : 'Создать'}
        </button>
        {!isEditMode && (
          <button
            onClick={handleCreateAndNew}
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