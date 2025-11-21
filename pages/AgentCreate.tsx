import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Agent } from '../types';

interface AgentCreateProps {
  onCancel: () => void;
  onCreate?: () => void;
  onAddAgent: (agent: Agent) => void;
}

export const AgentCreate: React.FC<AgentCreateProps> = ({ onCancel, onCreate, onAddAgent }) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Пожалуйста, введите название агента');
      return;
    }

    const newAgent: Agent = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      isActive: false,
      model: 'OpenAI GPT-4.1',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddAgent(newAgent);
    if (onCreate) onCreate();
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
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCreate}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Создать
        </button>
        <button
          onClick={() => {
            handleCreate();
            setName('');
          }}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Создать и Создать еще
        </button>
        <button
          onClick={onCancel}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};