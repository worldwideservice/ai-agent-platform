import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { Agent } from '../types';

interface ChatProps {
  agents: Agent[];
}

export const Chat: React.FC<ChatProps> = ({ agents }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Устанавливаем начальное сообщение в зависимости от выбранного агента
  useEffect(() => {
    if (selectedAgent) {
      const welcomeMessage = selectedAgent.systemInstructions
        ? `Привет! Я ${selectedAgent.name}. ${selectedAgent.systemInstructions.substring(0, 150)}...`
        : `Привет! Я ${selectedAgent.name}. Чем могу помочь?`;

      setMessages([
        { role: 'model', text: welcomeMessage }
      ]);
    } else {
      setMessages([
        { role: 'model', text: 'Выберите агента для начала тестирования' }
      ]);
    }
  }, [selectedAgent]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Проверяем что агент выбран
    if (!selectedAgent) {
      alert('Пожалуйста, выберите агента ИИ');
      return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    // Передаем настройки агента в API
    const response = await sendMessageToGemini({
      message: userMsg,
      history: messages,
      agentConfig: {
        model: selectedAgent.model,
        systemInstructions: selectedAgent.systemInstructions || 'Вы - полезный помощник.',
        agentName: selectedAgent.name
      }
    });

    setMessages(prev => [...prev, { role: 'model', text: response || 'Ошибка получения ответа.' }]);
    setIsLoading(false);
  };

  const handleClearChat = () => {
    if (selectedAgent) {
      const welcomeMessage = selectedAgent.systemInstructions
        ? `Привет! Я ${selectedAgent.name}. ${selectedAgent.systemInstructions.substring(0, 150)}...`
        : `Привет! Я ${selectedAgent.name}. Чем могу помочь?`;

      setMessages([
        { role: 'model', text: welcomeMessage }
      ]);
    } else {
      setMessages([
        { role: 'model', text: 'Выберите агента для начала тестирования' }
      ]);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Фильтруем только активные агенты
  const activeAgents = agents.filter(agent => agent.isActive);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Агенты ИИ</span>
            <span>/</span>
            <span>Чат</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Тестовый чат</h1>
          {selectedAgent && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Trash2 size={16} />
              Очистить чат
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors">

        {/* Информация о выбранном агенте */}
        {selectedAgent && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-3">
            <Bot size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white">
                Тестируется: {selectedAgent.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                • Модель: {selectedAgent.model}
              </span>
              {!selectedAgent.isActive && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">
                  ⚠️ Агент не активен
                </span>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Bot size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Выберите агента для начала тестирования</p>
              <p className="text-sm mt-2">Выберите активного агента из списка ниже</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <Bot size={18} />
                  </div>
                )}
                <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                   <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
             <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-none px-5 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
             </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 items-end">
             {/* Agent Select - с реальными данными */}
             <select
               value={selectedAgent?.id || ''}
               onChange={(e) => {
                 const agent = agents.find(a => a.id === e.target.value);
                 setSelectedAgent(agent || null);
               }}
               className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-64"
             >
                <option value="">Выберите агента ИИ</option>
                {activeAgents.length > 0 ? (
                  activeAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.model})
                    </option>
                  ))
                ) : (
                  <option disabled>Нет активных агентов</option>
                )}
             </select>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={selectedAgent ? "Введите сообщение здесь..." : "Сначала выберите агента..."}
                disabled={!selectedAgent}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-4 pr-12 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                rows={1}
                style={{ minHeight: '42px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !selectedAgent}
              className={`bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>Отправить</span>
            </button>
          </div>
          {!selectedAgent && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Выберите агента из списка выше, чтобы начать тестирование
            </p>
          )}
          {selectedAgent && activeAgents.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚠️ У вас нет активных агентов. Активируйте агента в настройках.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
