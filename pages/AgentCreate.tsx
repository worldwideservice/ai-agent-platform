import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Agent } from '../types';

interface AgentCreateProps {
  onCancel: () => void;
  onCreate?: () => void;
  onAddAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<any>;
}

export const AgentCreate: React.FC<AgentCreateProps> = ({ onCancel, onCreate, onAddAgent }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, введите название агента');
      return;
    }

    const newAgent: Omit<Agent, 'id' | 'createdAt'> = {
      name: name.trim(),
      isActive: false,
      model: 'Google Gemini 2.5 Flash',
      systemInstructions: undefined,
      pipelineSettings: undefined,
      channelSettings: undefined,
      kbSettings: undefined
    };

    try {
      setIsLoading(true);
      setError('');
      await onAddAgent(newAgent);
      if (onCreate) onCreate();
    } catch (err) {
      setError('Не удалось создать агента. Попробуйте еще раз.');
      console.error('Failed to create agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs and Title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Агенты ИИ</span>
          <span>/</span>
          <span>Создать</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Создать Агент ИИ</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors overflow-hidden">

        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="text-gray-400 dark:text-gray-500">
            <User size={20} strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-medium text-gray-900 dark:text-white">Профиль агента</h2>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Название<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Создание...' : 'Создать'}
        </button>
        <button
          onClick={async () => {
            await handleCreate();
            setName('');
          }}
          disabled={isLoading}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          Создать и Создать еще
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};