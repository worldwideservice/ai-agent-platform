import React, { useState } from 'react';
import { Edit, Copy, Trash2, Search, LayoutGrid, X, ChevronDown, Loader2 } from 'lucide-react';
import { Agent } from '../types';

interface AgentsProps {
  agents: Agent[];
  isLoading?: boolean;
  onToggleAgentStatus: (id: string) => void;
  onDeleteAgent: (id: string) => void;
  onCopyAgent: (agent: Agent) => void;
  onEditAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

export const Agents: React.FC<AgentsProps> = ({
  agents,
  isLoading = false,
  onToggleAgentStatus,
  onDeleteAgent,
  onCopyAgent,
  onEditAgent,
  onCreateAgent,
}) => {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const toggleSelectAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedAgents(agents.map(a => a.id));
  const deselectAll = () => setSelectedAgents([]);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Main container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Открыть действия
          </button>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Поиск"
                className="pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 border border-gray-200 dark:border-gray-600 rounded transition-colors">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Загрузка агентов...</h3>
          </div>
        ) : agents.length > 0 ? (
          <>
            {/* Table */}
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={selectedAgents.length === agents.length && agents.length > 0}
                      onChange={() => (selectedAgents.length === agents.length ? deselectAll() : selectAll())}
                      className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    Название <ChevronDown size={14} className="inline ml-1" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    Активно
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    Дата создания <ChevronDown size={14} className="inline ml-1" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {agents.map(agent =>
                  <tr
                    key={agent.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => onEditAgent(agent.id)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectAgent(agent.id);
                        }}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22%3E%3Cpath d=%22M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{agent.name}</td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAgentStatus(agent.id);
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${agent.isActive ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agent.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{agent.createdAt}</td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                        <button onClick={(e) => { e.stopPropagation(); onEditAgent(agent.id); }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCopyAgent(agent); }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Copy size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteAgent(agent.id); }} className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Показано с 1 по {agents.length} из {agents.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">на страницу</span>
                <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <X size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Не найдено Агенты ИИ</h3>
          </div>
        )}
    </div>
    </div >
  );
};
