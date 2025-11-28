import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Menu, Send } from 'lucide-react';
import { apiClient } from '../src/services/api/apiClient';
import { conversationsService, Conversation, ConversationMessage, MessageSources } from '../src/services/api/conversations.service';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatMessage } from '../components/chat/ChatMessage';
import { Agent } from '../types';

interface ChatProps {
  agents: Agent[];
}

interface LocalMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  sources?: MessageSources;
  isNew?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ agents }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeAgents = agents.filter(agent => agent.isActive);

  // Load conversations when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadConversations();
    }
  }, [selectedAgent?.id]);

  // Auto-select first active agent
  useEffect(() => {
    if (activeAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(activeAgents[0]);
    }
  }, [agents]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!selectedAgent) return;
    try {
      const convs = await conversationsService.getConversations(selectedAgent.id);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    if (!selectedAgent) return;

    try {
      const conv = await conversationsService.createConversation(selectedAgent.id);
      setConversations(prev => [conv, ...prev]);
      setCurrentConversationId(conv.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const { conversation } = await conversationsService.getConversation(id);
      setCurrentConversationId(id);
      setMessages(
        conversation.messages.map((msg: ConversationMessage) => ({
          id: msg.id,
          role: msg.role as 'user' | 'model',
          content: msg.content,
          sources: msg.sources,
        }))
      );
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationsService.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await conversationsService.updateConversation(id, newTitle);
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMsg = input;
    setInput('');

    // Create new conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      try {
        const conv = await conversationsService.createConversation(selectedAgent.id);
        convId = conv.id;
        setCurrentConversationId(conv.id);
        setConversations(prev => [conv, ...prev]);
      } catch (error) {
        console.error('Error creating conversation:', error);
        return;
      }
    }

    // Add user message to UI
    const userMessage: LocalMessage = { role: 'user', content: userMsg, isNew: true };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message to DB
      await conversationsService.addMessage(convId, 'user', userMsg);

      // Get AI response
      const result = await apiClient.post('/chat/message', {
        agentId: selectedAgent.id,
        message: userMsg,
        history: messages.map(m => ({
          role: m.role,
          text: m.content,
        })),
      });

      const responseText = result.data.response || t('chat.errorGettingResponse');
      const sources = result.data.sources;

      // Add assistant message to UI
      const assistantMessage: LocalMessage = {
        role: 'model',
        content: responseText,
        sources,
        isNew: true,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to DB
      await conversationsService.addMessage(convId, 'model', responseText, sources);

      // Update conversation in list
      loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: `${t('chat.error')} ${error.response?.data?.message || error.message}`,
          isNew: true,
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setSelectedAgent(agent || null);
    setCurrentConversationId(null);
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              {t('chat.title')}
            </h1>

            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-xs"
            >
              <option value="" disabled>
                {t('chat.selectAgent')}
              </option>
              {activeAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.model})
                </option>
              ))}
            </select>
          </div>

          {selectedAgent && (
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Bot size={16} className="text-blue-600 dark:text-blue-400" />
              <span>{t('chat.model')} {selectedAgent.model}</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Bot size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('chat.selectAgentPrompt')}</p>
              <p className="text-sm mt-2">{t('chat.startNewChat')}</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
                isNew={msg.isNew}
              />
            ))
          )}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-none px-5 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 items-center max-w-4xl mx-auto">
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
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
            />

            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !selectedAgent}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
