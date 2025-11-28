import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Menu, Send, MessageSquare, Lightbulb, Search, HelpCircle, Zap, ChevronDown, Paperclip, Mic, Command } from 'lucide-react';
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

// Suggestion cards for empty state
interface SuggestionCard {
  icon: React.ReactNode;
  titleKey: string;
  promptKey: string;
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
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Suggestion cards data
  const suggestionCards: SuggestionCard[] = [
    { icon: <MessageSquare size={20} />, titleKey: 'chat.suggestions.tellAbout', promptKey: 'chat.suggestions.tellAboutPrompt' },
    { icon: <Lightbulb size={20} />, titleKey: 'chat.suggestions.helpWith', promptKey: 'chat.suggestions.helpWithPrompt' },
    { icon: <Search size={20} />, titleKey: 'chat.suggestions.findInfo', promptKey: 'chat.suggestions.findInfoPrompt' },
    { icon: <HelpCircle size={20} />, titleKey: 'chat.suggestions.explainHow', promptKey: 'chat.suggestions.explainHowPrompt' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setShowAgentDropdown(false);
  };

  // Handle suggestion card click
  const handleSuggestionClick = (promptKey: string) => {
    const prompt = t(promptKey);
    setInput(prompt);
  };

  // Store the text that was in input before recording started
  const baseTextRef = useRef<string>('');
  // Store finalized transcripts from previous segments
  const finalizedTextRef = useRef<string>('');

  // Handle voice recording
  const handleVoiceRecording = useCallback(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t('chat.voiceNotSupported'));
      return;
    }

    if (isRecording && recognitionRef.current) {
      // Stop recording - user clicked to stop
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    // Start recording - save current input as base text
    baseTextRef.current = input;
    finalizedTextRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep recording until user stops
    recognition.interimResults = true; // Show text in real-time
    recognition.lang = 'ru-RU';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process results - separate final from interim
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Accumulate finalized text
      if (finalTranscript) {
        finalizedTextRef.current += (finalizedTextRef.current ? ' ' : '') + finalTranscript;
      }

      // Combine: base text + finalized + current interim
      const separator = baseTextRef.current ? ' ' : '';
      const fullText = baseTextRef.current +
        (finalizedTextRef.current ? separator + finalizedTextRef.current : '') +
        (interimTranscript ? (finalizedTextRef.current || baseTextRef.current ? ' ' : '') + interimTranscript : '');

      setInput(fullText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert(t('chat.voiceMicrophoneError'));
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, t, input]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
        {/* Header - Improved */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            {/* Title with breadcrumbs */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('chat.title')}
              </h1>
              {currentConversationId && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">›</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {conversations.find(c => c.id === currentConversationId)?.title || t('chat.newConversation')}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Agent selector - Custom dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${selectedAgent?.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                  {selectedAgent?.name || t('chat.selectAgent')}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAgentDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAgentDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">{t('chat.availableAgents')}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {activeAgents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('chat.noActiveAgents')}
                      </div>
                    ) : (
                      activeAgents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentChange(agent.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedAgent?.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{agent.model}</div>
                          </div>
                          {selectedAgent?.id === agent.id && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Agent status badge */}
            {selectedAgent && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                <Zap size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{selectedAgent.model}</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {messages.length === 0 ? (
            /* Empty State - Enhanced with suggestion cards */
            <div className="h-full flex flex-col items-center justify-center px-6 py-12">
              {/* Gradient background effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50" />
              </div>

              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {t('chat.emptyState.title')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {t('chat.emptyState.subtitle')}
                </p>

                {/* Suggestion cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {suggestionCards.map((card, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(card.promptKey)}
                      disabled={!selectedAgent}
                      className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {card.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {t(card.titleKey)}
                      </span>
                    </button>
                  ))}
                </div>

                {!selectedAgent && (
                  <p className="mt-6 text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {t('chat.selectAgentFirst')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || idx}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  isNew={msg.isNew}
                />
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Bot size={18} />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Area - Enhanced */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            {/* Main input container */}
            <div className="relative flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
              {/* Attachment button */}
              <button
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('chat.attachFile')}
              >
                <Paperclip size={18} />
              </button>

              {/* Input field */}
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
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:cursor-not-allowed py-2"
              />

              {/* Voice button */}
              <button
                onClick={handleVoiceRecording}
                disabled={!selectedAgent}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording
                    ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isRecording ? t('chat.stopRecording') : t('chat.voiceInput')}
              >
                <Mic size={18} />
              </button>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedAgent}
                className="bg-[#0078D4] hover:bg-[#006cbd] text-white p-2.5 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0078D4] shadow-sm hover:shadow-md"
              >
                <Send size={18} />
              </button>
            </div>

            {/* Hints row */}
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Command size={12} />
                  <span>Enter</span>
                  <span className="text-gray-300 dark:text-gray-600 mx-1">-</span>
                  <span>{t('chat.sendHint')}</span>
                </span>
              </div>
              {selectedAgent && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t('chat.poweredBy')} {selectedAgent.model}
                </span>
              )}
            </div>
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
