import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, User, Trash2 } from 'lucide-react';
import { apiClient } from '../src/services/api/apiClient';
import { Agent } from '../types';

interface ChatProps {
  agents: Agent[];
}

export const Chat: React.FC<ChatProps> = ({ agents }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Автоматически выбираем первого активного агента при загрузке
  useEffect(() => {
    if (activeAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(activeAgents[0]);
    }
  }, [agents]);

  // Set initial message depending on selected agent
  useEffect(() => {
    if (selectedAgent) {
      const welcomeMessage = selectedAgent.systemInstructions
        ? t('chat.welcomeMessageWithInstructions', { name: selectedAgent.name, instructions: selectedAgent.systemInstructions.substring(0, 150) })
        : t('chat.welcomeMessage', { name: selectedAgent.name });

      setMessages([
        { role: 'model', text: welcomeMessage }
      ]);
    } else {
      setMessages([
        { role: 'model', text: t('chat.noAvailableAgents') }
      ]);
    }
  }, [selectedAgent, t]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Check that agent is selected
    if (!selectedAgent) {
      alert(t('chat.pleaseSelectAgent'));
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

      const responseText = result.data.response || t('chat.errorGettingResponse');
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

      // Log triggered actions
      if (result.data.triggeredActions?.length > 0) {
        console.log('🎯 Triggered actions:', result.data.triggeredActions);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `${t('chat.error')} ${error.response?.data?.message || error.message}`
      }]);
    }

    setIsLoading(false);
  };

  const handleClearChat = () => {
    if (selectedAgent) {
      const welcomeMessage = selectedAgent.systemInstructions
        ? t('chat.welcomeMessageWithInstructions', { name: selectedAgent.name, instructions: selectedAgent.systemInstructions.substring(0, 150) })
        : t('chat.welcomeMessage', { name: selectedAgent.name });

      setMessages([
        { role: 'model', text: welcomeMessage }
      ]);
    } else {
      setMessages([
        { role: 'model', text: t('chat.selectAgentPrompt') }
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
            <span>{t('chat.breadcrumbAgents')}</span>
            <span>/</span>
            <span>{t('chat.breadcrumbChat')}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('chat.title')}</h1>
          <div className="flex items-center gap-3">
            {selectedAgent && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Trash2 size={16} />
                {t('chat.clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors">

        {/* Selected agent info */}
        {selectedAgent && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-3">
            <Bot size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('chat.testing')} {selectedAgent.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                • {t('chat.model')} {selectedAgent.model}
              </span>
              {!selectedAgent.isActive && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">
                  ⚠️ {t('chat.agentNotActive')}
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
              <p className="text-lg font-medium">{t('chat.selectAgentPrompt')}</p>
              <p className="text-sm mt-2">{t('chat.selectActiveAgent')}</p>
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
                <option value="" disabled>{t('chat.selectAgent')}</option>
                {activeAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.model})
                  </option>
                ))}
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
              placeholder={t('chat.typeMessage')}
              disabled={!selectedAgent}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
            />

            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !selectedAgent}
              className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <span>{t('chat.send')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
