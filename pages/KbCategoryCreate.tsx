import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui';

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
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategory, setParentCategory] = useState<string | null>(currentCategoryId);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!category;

  useEffect(() => {
    if (category) {
      setTitle(category.name);
      setParentCategory(category.parentId);
    } else {
      setParentCategory(currentCategoryId);
    }
  }, [category, currentCategoryId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowParentDropdown(false);
      }
    };

    if (showParentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showParentDropdown]);

  const getParentCategoryName = () => {
    if (!parentCategory) return null;
    const parent = categories.find(c => c.id === parentCategory);
    return parent ? parent.name : null;
  };

  const handleSave = async () => {
    if (!title || isSaving) return;
    setIsSaving(true);
    try {
      if (isEditMode && onSave && category) {
        await onSave({ ...category, name: title, parentId: parentCategory });
      } else if (onAdd) {
        await onAdd({ name: title, parentId: parentCategory });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndNew = async () => {
    if (!title || isSaving) return;
    setIsSaving(true);
    try {
      if (onAdd) {
        await onAdd({ name: title, parentId: parentCategory });
        setTitle('');
        setDescription('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs and Title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>{t('knowledgeBase.categories')}</span>
          <span>/</span>
          <span>{isEditMode ? t('knowledgeBase.edit') : t('common.create')}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? t('knowledgeBase.editCategory') : t('knowledgeBase.createCategory')}
        </h1>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8 space-y-6 transition-colors">
        
        {/* Parent Category Field */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('knowledgeBase.parentCategoryLabel')}
          </label>
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setShowParentDropdown(!showParentDropdown)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 flex items-center justify-between bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
            >
              <span className={`text-sm ${getParentCategoryName() ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {getParentCategoryName() || t('knowledgeBase.noParentCategory')}
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
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-auto">
                <div
                  onClick={() => {
                    setParentCategory(null);
                    setShowParentDropdown(false);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                >
                  {t('knowledgeBase.noParentCategory')}
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
            {t('knowledgeBase.titleLabel')}<span className="text-red-500">*</span>
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
            {t('knowledgeBase.descriptionLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow resize-y bg-white dark:bg-gray-700 text-gray-900 dark:text-white leading-relaxed"
          />
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          loading={isSaving}
          loadingText={t('common.saving', 'Сохранение...')}
          size="lg"
        >
          {isEditMode ? t('common.save') : t('common.create')}
        </Button>
        {!isEditMode && (
          <Button
            onClick={handleSaveAndNew}
            disabled={isSaving}
            variant="secondary"
            size="lg"
          >
            {t('knowledgeBase.createAndAnother')}
          </Button>
        )}
        <Button
          onClick={onCancel}
          variant="ghost"
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
};