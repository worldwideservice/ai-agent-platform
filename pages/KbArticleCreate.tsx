import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, Upload, File, Image, FileText, Music, Video, Trash2 } from 'lucide-react';
import { kbService, KbArticleFileResponse } from '../src/services/api/kb.service';

interface KbArticleCreateProps {
  onCancel: () => void;
  onAddArticle: (article: { title: string; isActive: boolean; categories: string[]; relatedArticles: string[]; content: string }, files?: File[]) => void;
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

// Helper to get file icon based on type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
  if (mimeType.startsWith('audio/')) return <Music size={20} className="text-purple-500" />;
  if (mimeType.startsWith('video/')) return <Video size={20} className="text-red-500" />;
  if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-600" />;
  return <File size={20} className="text-gray-500" />;
};

// Helper to format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

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

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // For create mode
  const [existingFiles, setExistingFiles] = useState<KbArticleFileResponse[]>([]); // For edit mode
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!article;

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setIsActive(article.isActive);
      // Convert category names to IDs for edit mode
      const categoryIds = article.categories
        .map(catName => categories.find(c => c.name === catName)?.id)
        .filter((id): id is string => id !== undefined);
      setSelectedCategories(categoryIds);
      setRelatedArticles(article.relatedArticles);
      setContent(article.content);
      // Load existing files
      loadExistingFiles(article.id);
    }
  }, [article, categories]);

  const loadExistingFiles = async (articleId: number) => {
    try {
      const files = await kbService.getArticleFiles(articleId);
      setExistingFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

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

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Helper to get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
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

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);

    if (isEditMode && article) {
      // Upload files immediately in edit mode
      uploadFilesForArticle(article.id, fileArray);
    } else {
      // Store files locally in create mode
      setPendingFiles(prev => [...prev, ...fileArray]);
    }
  }, [isEditMode, article]);

  const uploadFilesForArticle = async (articleId: number, files: File[]) => {
    setUploadingFiles(true);
    try {
      const uploadedFiles = await kbService.uploadArticleFiles(articleId, files);
      setExistingFiles(prev => [...uploadedFiles, ...prev]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = async (fileId: string) => {
    if (!article) return;

    try {
      await kbService.deleteArticleFile(article.id, fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

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
      }, pendingFiles.length > 0 ? pendingFiles : undefined);
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
    }, pendingFiles.length > 0 ? pendingFiles : undefined);
    // Clear form
    setTitle('');
    setIsActive(true);
    setSelectedCategories([]);
    setRelatedArticles([]);
    setContent('');
    setPendingFiles([]);
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
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
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
                  selectedCategories.map((catId) => (
                    <span key={catId} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm">
                      {getCategoryName(catId)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(catId);
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
                  <>
                    {/* Root categories and their subcategories */}
                    {categories
                      .filter(cat => cat.parentId === null)
                      .map((parentCat) => {
                        const subcategories = categories.filter(cat => cat.parentId === parentCat.id);
                        return (
                          <div key={parentCat.id}>
                            {/* Parent category */}
                            <div
                              onClick={() => toggleCategory(parentCat.id)}
                              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 text-sm text-gray-900 dark:text-white font-medium"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(parentCat.id)}
                                onChange={() => { }}
                                className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                              />
                              {parentCat.name}
                            </div>
                            {/* Subcategories */}
                            {subcategories.map((subCat) => (
                              <div
                                key={subCat.id}
                                onClick={() => toggleCategory(subCat.id)}
                                className="pl-8 pr-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(subCat.id)}
                                  onChange={() => { }}
                                  className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                                />
                                {subCat.name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                  </>
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

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#0078D4] bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
            <Upload size={24} className={`mb-2 ${isDragging ? 'text-[#0078D4]' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Перетащите файлы или <span className="text-[#0078D4] hover:underline">выберите</span>
            </span>
            {uploadingFiles && (
              <span className="text-xs text-gray-500 mt-2">Загрузка...</span>
            )}
          </div>

          {/* Pending Files (Create Mode) */}
          {pendingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Файлы для загрузки ({pendingFiles.length}):
              </p>
              {pendingFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removePendingFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Existing Files (Edit Mode) */}
          {existingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Прикрепленные файлы ({existingFiles.length}):
              </p>
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  {getFileIcon(file.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExistingFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
