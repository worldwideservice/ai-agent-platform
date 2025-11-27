import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, FlaskConical, Play, Pause, RefreshCw, Info } from 'lucide-react';
import { apiClient } from '../src/services/api/apiClient';
import { testService, AgentPauseStatus } from '../src/services/api/test.service';
import { notificationsService } from '../src/services/api';
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

  // Test Mode State
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testStatus, setTestStatus] = useState<AgentPauseStatus | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Автоматически выбираем первого активного агента при загрузке
  useEffect(() => {
    if (activeAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(activeAgents[0]);
    }
  }, [agents]);

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
        { role: 'model', text: 'Нет доступных агентов для тестирования' }
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

    try {
      // Вызываем бэкенд API для обработки сообщения (включая триггеры)
      const result = await apiClient.post('/chat/message', {
        agentId: selectedAgent.id,
        message: userMsg,
        history: messages.map(m => ({
          role: m.role,
          text: m.text
        }))
      });

      const responseText = result.data.response || 'Ошибка получения ответа.';
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

      // Логируем сработавшие триггеры
      if (result.data.triggeredActions?.length > 0) {
        console.log('🎯 Сработали триггеры:', result.data.triggeredActions);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Ошибка: ${error.response?.data?.message || error.message}`
      }]);
    }

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

  // === TEST MODE FUNCTIONS ===
  const refreshTestStatus = async () => {
    if (!selectedAgent) return;
    setTestLoading(true);
    try {
      const status = await testService.getAgentStatus(selectedAgent.id);
      setTestStatus(status);
      setTestMessage(null);
    } catch (error: any) {
      setTestMessage(`Ошибка: ${error.message}`);
    }
    setTestLoading(false);
  };

  const handleSimulateEmployeeReply = async () => {
    if (!selectedAgent) return;
    setTestLoading(true);
    try {
      const result = await testService.simulateEmployeeReply(selectedAgent.id);
      setTestMessage(`✅ ${result.message}`);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `🧪 [ТЕСТ] Симуляция: Сотрудник ответил клиенту. Агент поставлен на паузу.`
      }]);
      await refreshTestStatus();
    } catch (error: any) {
      setTestMessage(`❌ Ошибка: ${error.message}`);
    }
    setTestLoading(false);
  };

  const handleSimulateClientMessage = async () => {
    if (!selectedAgent) return;
    setTestLoading(true);
    try {
      const result = await testService.simulateClientMessage(selectedAgent.id);
      const statusText = result.canRespond ? 'МОЖЕТ отвечать' : 'НЕ может отвечать (на паузе)';
      setTestMessage(`ℹ️ Агент ${statusText}`);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `🧪 [ТЕСТ] Проверка: Агент ${statusText}`
      }]);
      await refreshTestStatus();
    } catch (error: any) {
      setTestMessage(`❌ Ошибка: ${error.message}`);
    }
    setTestLoading(false);
  };

  const handleForceResume = async () => {
    if (!selectedAgent) return;
    setTestLoading(true);
    try {
      const result = await testService.forceResumeAgent(selectedAgent.id);
      setTestMessage(`✅ ${result.message}`);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `🧪 [ТЕСТ] Агент возобновлён принудительно`
      }]);
      await refreshTestStatus();
      // Создаём уведомление о принудительном возобновлении
      try {
        await notificationsService.createNotification({
          type: 'info',
          title: 'Агент возобновлён',
          message: `Агент "${selectedAgent.name}" возобновлён принудительно`,
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      setTestMessage(`❌ Ошибка: ${error.message}`);
    }
    setTestLoading(false);
  };

  // Обновляем статус при открытии панели или смене агента
  useEffect(() => {
    if (showTestPanel && selectedAgent) {
      refreshTestStatus();
    }
  }, [showTestPanel, selectedAgent]);

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
          <div className="flex items-center gap-3">
            {selectedAgent && (
              <>
                <button
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors ${
                    showTestPanel
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FlaskConical size={16} />
                  Test Mode
                </button>
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Trash2 size={16} />
                  Очистить
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Test Mode Panel */}
      {showTestPanel && selectedAgent && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={18} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-medium text-purple-900 dark:text-purple-100">Test Mode: Симуляция интеграции</h3>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 mb-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Статус агента:</span>
              <button
                onClick={refreshTestStatus}
                disabled={testLoading}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 disabled:opacity-50"
              >
                <RefreshCw size={14} className={testLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            {testStatus ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {testStatus.paused ? (
                    <>
                      <Pause size={16} className="text-orange-500" />
                      <span className="text-orange-600 dark:text-orange-400 font-medium">На паузе</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} className="text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">Активен</span>
                    </>
                  )}
                </div>
                {testStatus.pausedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Пауза с: {new Date(testStatus.pausedAt).toLocaleString('ru-RU')}
                  </p>
                )}
                {testStatus.settings && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Настройки: {testStatus.settings.stopOnReply ? 'Пауза при ответе вкл' : 'Пауза при ответе выкл'},
                    возобновление через {testStatus.settings.resumeTime} {testStatus.settings.resumeUnit}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs">Загрузка...</p>
            )}
          </div>

          {/* Test message */}
          {testMessage && (
            <div className="bg-white dark:bg-gray-800 rounded-md p-2 mb-3 text-sm">
              {testMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSimulateEmployeeReply}
              disabled={testLoading}
              className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50 transition-colors"
            >
              <Pause size={14} />
              Сотрудник ответил
            </button>
            <button
              onClick={handleSimulateClientMessage}
              disabled={testLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
            >
              <Info size={14} />
              Проверить статус
            </button>
            <button
              onClick={handleForceResume}
              disabled={testLoading}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
            >
              <Play size={14} />
              Снять паузу
            </button>
          </div>

          <p className="text-xs text-purple-600 dark:text-purple-400 mt-3">
            💡 Используйте эти кнопки для тестирования функции "Останавливать агента при ответе сотрудника" без реальной интеграции Kommo
          </p>
        </div>
      )}

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
          <div className="flex gap-2 items-stretch">
             {/* Agent Select - с реальными данными */}
             <select
               value={selectedAgent?.id || ''}
               onChange={(e) => {
                 const agent = agents.find(a => a.id === e.target.value);
                 setSelectedAgent(agent || null);
               }}
               className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-64 flex-shrink-0"
             >
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

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Введите сообщение здесь..."
              disabled={!selectedAgent}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
            />

            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !selectedAgent}
              className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <span>Отправить</span>
            </button>
          </div>
          {activeAgents.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚠️ У вас нет активных агентов. Активируйте агента в настройках.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
