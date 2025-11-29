import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Menu,
  Send,
  MessageSquare,
  Lightbulb,
  Search,
  HelpCircle,
  ChevronDown,
  Mic,
  Command,
  Check,
  Info,
  BookOpen,
  Brain,
  Zap,
  FileText,
  GraduationCap,
  Settings2,
  UserCircle,
  ShieldQuestion,
} from "lucide-react";
import {
  testChatService,
  TestConversation,
  TestConversationMessage,
  MessageSources,
  AgentInfo,
  AttachedDocument,
  AgentPrompt,
} from "../src/services/api/test-chat.service";
import { profileService } from "../src/services/api";
import { ChatSidebar } from "../components/chat/ChatSidebar";
import { ChatMessage } from "../components/chat/ChatMessage";
import { Agent } from "../types";

interface ChatProps {
  agents: Agent[];
}

interface LocalMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  sources?: MessageSources;
  attachedDocuments?: AttachedDocument[];
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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<TestConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Ширина сайдбара с сохранением в localStorage
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-sidebar-width');
      return saved ? parseInt(saved, 10) : 288; // default 288px (w-72)
    }
    return 288;
  });

  // Сохраняем ширину в localStorage при изменении
  const handleSidebarWidthChange = (width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('chat-sidebar-width', String(width));
  };
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [showAgentInfo, setShowAgentInfo] = useState(false);
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Маппинг иконок по имени
  const getPromptIcon = (iconName: string) => {
    switch (iconName) {
      case "BookOpen": return <BookOpen size={20} />;
      case "FileText": return <FileText size={20} />;
      case "Zap": return <Zap size={20} />;
      case "GraduationCap": return <GraduationCap size={20} />;
      case "MessageCircle": return <MessageSquare size={20} />;
      case "HelpCircle": return <HelpCircle size={20} />;
      case "Search": return <Search size={20} />;
      default: return <Lightbulb size={20} />;
    }
  };

  // Fallback static suggestion cards for agent testing
  const defaultSuggestionCards: SuggestionCard[] = [
    {
      icon: <UserCircle size={20} />,
      titleKey: "chat.suggestions.introduceYourself",
      promptKey: "chat.suggestions.introduceYourselfPrompt",
    },
    {
      icon: <Brain size={20} />,
      titleKey: "chat.suggestions.testMemory",
      promptKey: "chat.suggestions.testMemoryPrompt",
    },
    {
      icon: <MessageSquare size={20} />,
      titleKey: "chat.suggestions.askAboutServices",
      promptKey: "chat.suggestions.askAboutServicesPrompt",
    },
    {
      icon: <ShieldQuestion size={20} />,
      titleKey: "chat.suggestions.handleObjection",
      promptKey: "chat.suggestions.handleObjectionPrompt",
    },
  ];

  // Load user avatar on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { user } = await profileService.getProfile();
        if (user.avatarUrl) {
          setUserAvatarUrl(profileService.getAvatarUrl(user.avatarUrl));
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    loadUserProfile();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeAgents = agents.filter((agent) => agent.isActive);

  // Load conversations and prompts when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadConversations();
      loadAgentInfo();
      loadAgentPrompts();
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!selectedAgent) return;
    try {
      const convs = await testChatService.getConversations(selectedAgent.id);
      setConversations(convs);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadAgentInfo = async () => {
    if (!selectedAgent) return;
    try {
      const info = await testChatService.getAgentInfo(selectedAgent.id);
      setAgentInfo(info);
    } catch (error) {
      console.error("Error loading agent info:", error);
    }
  };

  const loadAgentPrompts = async () => {
    if (!selectedAgent) return;
    setPromptsLoading(true);
    try {
      const prompts = await testChatService.getAgentPrompts(selectedAgent.id);
      setAgentPrompts(prompts);
    } catch (error) {
      console.error("Error loading agent prompts:", error);
      setAgentPrompts([]);
    } finally {
      setPromptsLoading(false);
    }
  };

  const handleNewConversation = async () => {
    if (!selectedAgent) return;

    try {
      const conv = await testChatService.createConversation(selectedAgent.id);
      setConversations((prev) => [conv, ...prev]);
      setCurrentConversationId(conv.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const { conversation } = await testChatService.getConversation(id);
      setCurrentConversationId(id);
      setMessages(
        conversation.messages.map((msg: TestConversationMessage) => ({
          id: msg.id,
          role: msg.role as "user" | "model",
          content: msg.content,
          sources: msg.sources,
        })),
      );
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await testChatService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await testChatService.updateConversation(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      );
    } catch (error) {
      console.error("Error renaming conversation:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMsg = input;
    setInput("");

    // Add user message to UI
    const userMessage: LocalMessage = {
      role: "user",
      content: userMsg,
      isNew: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send message using new test-chat API
      const result = await testChatService.sendMessage(
        selectedAgent.id,
        userMsg,
        currentConversationId || undefined,
      );

      // Update conversation ID if new
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        loadConversations();
      }

      // Update conversation title if AI generated one
      if (result.generatedTitle && result.conversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === result.conversationId
              ? { ...c, title: result.generatedTitle! }
              : c
          )
        );
      }

      // Add assistant message to UI
      const assistantMessage: LocalMessage = {
        role: "model",
        content: result.response,
        sources: result.sources,
        attachedDocuments: result.attachedDocuments,
        isNew: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `${t("chat.error")} ${error.response?.data?.message || error.message}`,
          isNew: true,
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    setSelectedAgent(agent || null);
    setCurrentConversationId(null);
    setMessages([]);
    setShowAgentDropdown(false);
    setAgentInfo(null);
  };

  // Handle suggestion card click
  const handleSuggestionClick = (promptKeyOrText: string, isDirect: boolean = false) => {
    const prompt = isDirect ? promptKeyOrText : t(promptKeyOrText);
    setInput(prompt);
  };

  // Store the text that was in input before recording started
  const baseTextRef = useRef<string>("");
  // Store finalized transcripts from previous segments
  const finalizedTextRef = useRef<string>("");

  // Handle voice recording
  const handleVoiceRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t("chat.voiceNotSupported"));
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    baseTextRef.current = input;
    finalizedTextRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ru-RU";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        finalizedTextRef.current +=
          (finalizedTextRef.current ? " " : "") + finalTranscript;
      }

      const separator = baseTextRef.current ? " " : "";
      const fullText =
        baseTextRef.current +
        (finalizedTextRef.current ? separator + finalizedTextRef.current : "") +
        (interimTranscript
          ? (finalizedTextRef.current || baseTextRef.current ? " " : "") +
            interimTranscript
          : "");

      setInput(fullText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        alert(t("chat.voiceMicrophoneError"));
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

  // Agent info panel component
  const AgentInfoPanel = () => {
    if (!agentInfo) return null;

    const settings = agentInfo.settings;

    return (
      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Настройки агента
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {/* System Instructions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText size={14} />
              <span>Инструкции</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.hasSystemInstructions ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.hasSystemInstructions
                ? `${settings.systemInstructionsLength} симв.`
                : "Нет"}
            </span>
          </div>

          {/* Role */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <GraduationCap size={14} />
              <span>Роль</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.hasRole ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.hasRole ? settings.roleName : "Не назначена"}
            </span>
          </div>

          {/* Knowledge Base */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BookOpen size={14} />
              <span>База знаний</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.hasKnowledgeBase ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.hasKnowledgeBase
                ? `${settings.kbArticlesCount} статей`
                : "Нет"}
            </span>
          </div>

          {/* Documents */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText size={14} />
              <span>Документы</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.hasDocuments ? "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.hasDocuments
                ? `${settings.documentsCount} файлов`
                : "Нет"}
            </span>
          </div>

          {/* Triggers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Zap size={14} />
              <span>Триггеры</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.hasTrigggers ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.hasTrigggers
                ? `${settings.triggersCount} активных`
                : "Нет"}
            </span>
          </div>

          {/* Memory */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Brain size={14} />
              <span>Память</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${settings.memoryEnabled ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {settings.memoryEnabled ? "Включена" : "Выключена"}
            </span>
          </div>

          {/* Graph */}
          {settings.memoryEnabled && (
            <div className="flex items-center justify-between pl-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                <span className="text-xs">Граф знаний</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${settings.graphEnabled ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
              >
                {settings.graphEnabled ? "Да" : "Нет"}
              </span>
            </div>
          )}

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Язык</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {settings.autoDetectLanguage
                ? "Авто"
                : settings.responseLanguage || "По умолчанию"}
            </span>
          </div>
        </div>
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            Все настройки применяются в тестовом чате
          </p>
        </div>
      </div>
    );
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
        width={sidebarWidth}
        onWidthChange={handleSidebarWidthChange}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            {/* Title with test mode indicator */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("chat.title")}
              </h1>
              {currentConversationId && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">›</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                    {conversations.find((c) => c.id === currentConversationId)
                      ?.title || t("chat.newConversation")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Agent info button */}
            {selectedAgent && (
              <div className="relative">
                <button
                  onClick={() => setShowAgentInfo(!showAgentInfo)}
                  className={`p-2 rounded-lg transition-colors ${showAgentInfo ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"}`}
                  title="Настройки агента"
                >
                  <Info size={18} />
                </button>
                {showAgentInfo && <AgentInfoPanel />}
              </div>
            )}

            {/* Agent selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full ${selectedAgent?.isActive ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                  {selectedAgent?.name || t("chat.selectAgent")}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${showAgentDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showAgentDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("chat.availableAgents")}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {activeAgents.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bot
                          size={32}
                          className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t("chat.noActiveAgents")}
                        </p>
                      </div>
                    ) : (
                      activeAgents.map((agent) => {
                        const isSelected = selectedAgent?.id === agent.id;
                        const initials = agent.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <button
                            key={agent.id}
                            onClick={() => handleAgentChange(agent.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                              isSelected
                                ? "bg-[#0078D4]/10"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <div className="relative w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {initials}
                              <div
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
                                  agent.isActive
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                              />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <span
                                className={`text-sm font-medium truncate block ${
                                  isSelected
                                    ? "text-[#0078D4]"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {agent.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">
                                {agent.model}
                              </span>
                            </div>
                            {isSelected && (
                              <Check size={16} className="text-[#0078D4]" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 via-gray-100/50 to-gray-50 dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-900/50">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center px-6 py-12">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t("chat.emptyState.title")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  {t("chat.emptyState.subtitle")}
                </p>

                {/* Suggestion cards grid - dynamic or fallback */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promptsLoading ? (
                    // Loading skeleton
                    [...Array(4)].map((_, idx) => (
                      <div key={idx} className="animate-pulse flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                      </div>
                    ))
                  ) : agentPrompts.length > 0 ? (
                    // Dynamic prompts based on agent config
                    agentPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(prompt.fullPrompt, true)}
                        disabled={!selectedAgent}
                        className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#0078D4] dark:hover:border-[#0078D4] hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-[#0078D4] dark:group-hover:text-[#0078D4] transition-colors">
                          {getPromptIcon(prompt.icon)}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate">
                          {prompt.text}
                        </span>
                      </button>
                    ))
                  ) : (
                    // Fallback to static suggestions
                    defaultSuggestionCards.map((card, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(card.promptKey)}
                        disabled={!selectedAgent}
                        className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#0078D4] dark:hover:border-[#0078D4] hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-[#0078D4] dark:group-hover:text-[#0078D4] transition-colors">
                          {card.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {t(card.titleKey)}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {!selectedAgent && (
                  <p className="mt-6 text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {t("chat.selectAgentFirst")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full px-6 py-6 space-y-4">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || idx}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  attachedDocuments={msg.attachedDocuments}
                  isNew={msg.isNew}
                  userAvatarUrl={userAvatarUrl}
                  agentName={selectedAgent?.name}
                  agentModel={agentInfo?.agent.model || selectedAgent?.model}
                />
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                      {selectedAgent?.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "AI"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {selectedAgent?.name || "AI"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                        {agentInfo?.agent.model || selectedAgent?.model || ""}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex space-x-1.5">
                      <div
                        className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="w-full">
            {/* Main input container */}
            <div className="relative flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 focus-within:border-[#0078D4] dark:focus-within:border-[#0078D4] focus-within:ring-2 focus-within:ring-[#0078D4]/20 transition-all">
              {/* Input field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t("chat.typeMessage")}
                disabled={!selectedAgent}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:cursor-not-allowed py-2"
              />

              {/* Voice button */}
              <button
                onClick={handleVoiceRecording}
                disabled={!selectedAgent}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording
                    ? "text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={
                  isRecording ? t("chat.stopRecording") : t("chat.voiceInput")
                }
              >
                <Mic size={18} />
              </button>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedAgent}
                className={`p-2 rounded-lg transition-all ${
                  input.trim() && selectedAgent
                    ? "bg-[#0078D4] text-white hover:bg-[#006cbd]"
                    : "text-gray-400"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
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
                  <span className="text-gray-300 dark:text-gray-600 mx-1">
                    -
                  </span>
                  <span>{t("chat.sendHint")}</span>
                </span>
              </div>
              {selectedAgent && agentInfo && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t("chat.poweredBy")} {agentInfo.agent.model}
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
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
