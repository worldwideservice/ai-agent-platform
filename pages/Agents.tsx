import React, { useState } from 'react';
import { Edit, Copy, Trash2, Search } from 'lucide-react';
import { Agent } from '../types';

interface AgentsProps {
  onEditAgent: () => void;
  onCreateAgent: () => void;
}

const INITIAL_AGENTS: Agent[] = [
  { id: '1', name: 'АИ ассистент', isActive: false, model: 'OpenAI GPT-4.1', createdAt: '2025-01-01' },
  { id: '2', name: 'Менеджер по продажам', isActive: false, model: 'OpenAI GPT-5', createdAt: '2025-02-15' },
  { id: '3', name: 'Test Agent для тестирования UI', isActive: true, model: 'OpenAI GPT-5', createdAt: '2025-03-10' },
];

export const Agents: React.FC<AgentsProps> = ({ onEditAgent, onCreateAgent }) => {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);

  const toggleAgentStatus = (id: string) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === id ? { ...agent, isActive: !agent.isActive } : agent
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Агенты ИИ</span>
            <span>/</span>
            <span>Список</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Агенты ИИ</h1>
        </div>
        <button 
          onClick={onCreateAgent}
          className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
        >
          Создать
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Поиск" 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th className="w-12 p-4">
                <input 
                  type="checkbox" 
                  className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" 
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Название</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Активно</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Модель ИИ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" 
                  />
                </td>
                <td className="px-4 py-4 text-sm font-medium">
                  <button 
                    onClick={onEditAgent}
                    className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left font-medium transition-colors"
                  >
                    {agent.name}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <button 
                    onClick={() => toggleAgentStatus(agent.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${agent.isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agent.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{agent.model}</td>
                <td className="px-4 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-4">
                    <button onClick={onEditAgent} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1">
                      <Edit size={16} /> Изменить
                    </button>
                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1">
                      <Copy size={16} /> Копировать
                    </button>
                    <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1">
                      <Trash2 size={16} /> Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Показано с <span className="font-medium">1</span> по <span className="font-medium">{agents.length}</span> из <span className="font-medium">{agents.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">на страницу</span>
            <select className="border border-gray-300 dark:border-gray-600 rounded text-sm p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-blue-500 focus:border-blue-500">
              <option>10</option>
              <option>20</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};