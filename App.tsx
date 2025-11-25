import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { AgentEditor } from './pages/AgentEditor';
import { AgentCreate } from './pages/AgentCreate';
import { Chat } from './pages/Chat';
import { Billing } from './pages/Billing';
import { Settings } from './pages/Settings';
import { KbCategories } from './pages/KbCategories';
import { KbCategoryCreate } from './pages/KbCategoryCreate';
import { KbArticles } from './pages/KbArticles';
import { KbArticleCreate } from './pages/KbArticleCreate';
import { Page, Agent } from './types';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ToastContainer, Toast } from './components/Toast';
import { useAuth } from './src/contexts/AuthContext';
import { Auth } from './src/pages/Auth';
import { agentService, billingService } from './src/services/api';

const INITIAL_AGENTS: Agent[] = [];
const INITIAL_KB_CATEGORIES = [
  { id: 'general', name: 'Общее', parentId: null },
];

const App: React.FC = () => {
  // === 1. Все хуки должны быть в начале компонента ===
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State для агентов
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('currentPage');
    return (saved as Page) || 'dashboard';
  });
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(() => {
    const saved = localStorage.getItem('editingAgentId');
    return saved || null;
  });

  // State для KB Categories
  const [kbCategories, setKbCategories] = useState<{ id: string; name: string; parentId: string | null }[]>(() => {
    const saved = localStorage.getItem('kbCategories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that all items have the correct structure and valid names
        if (Array.isArray(parsed)) {
          const validCategories = parsed.filter(cat => {
            // Check structure
            if (!cat || typeof cat !== 'object' ||
                typeof cat.id !== 'string' ||
                typeof cat.name !== 'string' ||
                (cat.parentId !== null && typeof cat.parentId !== 'string')) {
              return false;
            }
            // Filter out categories with suspicious names (only digits, very short names, etc.)
            const name = cat.name.trim();
            if (!name || name.length < 2 || /^\d+$/.test(name)) {
              console.warn('Filtering out invalid category:', cat);
              return false;
            }
            return true;
          });

          if (validCategories.length > 0) {
            return validCategories;
          }
        }
        // If validation fails or no valid categories, clear invalid data
        console.warn('Invalid kbCategories data in localStorage, using defaults');
        localStorage.removeItem('kbCategories');
      } catch (e) {
        console.error('Failed to parse kbCategories from localStorage:', e);
        localStorage.removeItem('kbCategories');
      }
    }
    return INITIAL_KB_CATEGORIES;
  });
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; parentId: string | null } | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('editingCategoryId');
    return saved || null;
  });
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentCategoryId');
    return saved ? (saved === 'null' ? null : saved) : null;
  });

  // State для KB Articles
  const [kbArticles, setKbArticles] = useState<{
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  }[]>(() => {
    const saved = localStorage.getItem('kbArticles');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingArticle, setEditingArticle] = useState<typeof kbArticles[0] | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(() => {
    const saved = localStorage.getItem('editingArticleId');
    return saved ? parseInt(saved) : null;
  });

  // State для модалок и toast
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', onConfirm: () => { } });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // === 2. Вспомогательные функции ===
  const showConfirmation = (title: string, onConfirm: () => void) => {
    setConfirmationModal({ isOpen: true, title, onConfirm });
  };

  const hideConfirmation = () => {
    setConfirmationModal({ isOpen: false, title: '', onConfirm: () => { } });
  };

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const agentsData = await agentService.getAllAgents();
      setAgents(agentsData as unknown as Agent[]);
    } catch (error: any) {
      console.error('Failed to load agents:', error);
      showToast('error', 'Не удалось загрузить агентов');
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Проверка и показ уведомлений о пробном периоде
  const checkTrialNotification = async () => {
    try {
      const subscription = await billingService.getSubscription();

      // Проверяем только если пользователь на пробном периоде
      if (subscription.currentPlan !== 'trial') {
        return;
      }

      // Проверяем последнее время показа уведомления
      const lastNotificationDate = localStorage.getItem('lastTrialNotification');
      const now = new Date().getTime();

      // Если уведомление показывалось менее 24 часов назад - не показываем
      if (lastNotificationDate) {
        const lastNotificationTime = parseInt(lastNotificationDate);
        const hoursSinceLastNotification = (now - lastNotificationTime) / (1000 * 60 * 60);

        if (hoursSinceLastNotification < 24) {
          return; // Ещё не прошло 24 часа
        }
      }

      // Формируем текст уведомления в зависимости от оставшихся дней
      const daysRemaining = subscription.daysRemaining;
      let message = '';
      let type: Toast['type'] = 'info';

      if (daysRemaining === 0) {
        message = '⏰ Пробный период закончился. Оформите подписку для продолжения работы.';
        type = 'error';
      } else if (daysRemaining === 1) {
        message = '⏰ Остался 1 день пробного периода. Не забудьте оформить подписку!';
        type = 'warning';
      } else if (daysRemaining <= 3) {
        message = `⏰ Осталось ${daysRemaining} дня пробного периода. Оформите подписку, чтобы не потерять доступ.`;
        type = 'warning';
      } else if (daysRemaining <= 7) {
        message = `📅 Осталось ${daysRemaining} дней пробного периода.`;
        type = 'info';
      } else {
        message = `📅 У вас ${daysRemaining} дней пробного периода.`;
        type = 'info';
      }

      // Показываем уведомление
      showToast(type, message);

      // Сохраняем время показа уведомления
      localStorage.setItem('lastTrialNotification', now.toString());

    } catch (error) {
      console.error('Failed to check trial notification:', error);
    }
  };

  // === 3. Effects ===
  // Загрузка агентов из API при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadAgents();
      checkTrialNotification(); // Проверяем пробный период при входе
    }
  }, [isAuthenticated]);

  // Восстанавливаем editingAgent после загрузки агентов
  useEffect(() => {
    if (editingAgentId && agents.length > 0 && !editingAgent) {
      const agent = agents.find(a => a.id === editingAgentId);
      if (agent) {
        setEditingAgent(agent);
      } else {
        // Агент не найден, очищаем ID и возвращаемся на список
        localStorage.removeItem('editingAgentId');
        setEditingAgentId(null);
        if (currentPage === 'agent-editor') {
          setCurrentPage('agents');
        }
      }
    }
  }, [agents, editingAgentId, editingAgent, currentPage]);

  // Сохраняем editingAgentId в localStorage
  useEffect(() => {
    if (editingAgentId) {
      localStorage.setItem('editingAgentId', editingAgentId);
    } else {
      localStorage.removeItem('editingAgentId');
    }
  }, [editingAgentId]);

  // Восстанавливаем editingCategory
  useEffect(() => {
    if (editingCategoryId && kbCategories.length > 0 && !editingCategory) {
      const category = kbCategories.find(c => c.id === editingCategoryId);
      if (category) {
        setEditingCategory(category);
      } else {
        localStorage.removeItem('editingCategoryId');
        setEditingCategoryId(null);
        if (currentPage === 'kb-category-create') {
          setCurrentPage('kb-categories');
        }
      }
    }
  }, [kbCategories, editingCategoryId, editingCategory, currentPage]);

  // Сохраняем editingCategoryId
  useEffect(() => {
    if (editingCategoryId) {
      localStorage.setItem('editingCategoryId', editingCategoryId);
    } else {
      localStorage.removeItem('editingCategoryId');
    }
  }, [editingCategoryId]);

  // Восстанавливаем editingArticle
  useEffect(() => {
    if (editingArticleId && kbArticles.length > 0 && !editingArticle) {
      const article = kbArticles.find(a => a.id === editingArticleId);
      if (article) {
        setEditingArticle(article);
      } else {
        localStorage.removeItem('editingArticleId');
        setEditingArticleId(null);
        if (currentPage === 'kb-article-create') {
          setCurrentPage('kb-articles');
        }
      }
    }
  }, [kbArticles, editingArticleId, editingArticle, currentPage]);

  // Сохраняем editingArticleId
  useEffect(() => {
    if (editingArticleId !== null) {
      localStorage.setItem('editingArticleId', editingArticleId.toString());
    } else {
      localStorage.removeItem('editingArticleId');
    }
  }, [editingArticleId]);

  // Save currentPage to localStorage
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Save currentCategoryId to localStorage
  useEffect(() => {
    localStorage.setItem('currentCategoryId', currentCategoryId === null ? 'null' : currentCategoryId);
  }, [currentCategoryId]);

  // Save kbCategories to localStorage
  useEffect(() => {
    localStorage.setItem('kbCategories', JSON.stringify(kbCategories));
  }, [kbCategories]);

  // Save kbArticles to localStorage
  useEffect(() => {
    localStorage.setItem('kbArticles', JSON.stringify(kbArticles));
  }, [kbArticles]);

  // === 4. Обработчики событий ===
  const handleAddAgent = async (agentData: Omit<Agent, 'id' | 'createdAt'>) => {
    try {
      const newAgent = await agentService.createAgent({
        name: agentData.name,
        model: agentData.model,
        systemInstructions: agentData.systemInstructions,
        isActive: agentData.isActive,
        pipelineSettings: agentData.pipelineSettings,
        channelSettings: agentData.channelSettings,
        kbSettings: agentData.kbSettings,
      });
      await loadAgents(); // Перезагрузить список агентов
      showToast('success', 'Агент создан');
      return newAgent;
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      showToast('error', error.response?.data?.message || 'Не удалось создать агента');
      throw error;
    }
  };

  const handleAddArticle = (article: { title: string; isActive: boolean; categories: string[]; relatedArticles: string[]; content: string }) => {
    const newArticle = {
      id: Math.floor(1000 + Math.random() * 9000), // Generate 4-digit ID
      ...article,
      createdAt: new Date().toLocaleString('ru-RU', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(',', '')
    };
    setKbArticles(prev => [...prev, newArticle]);
    showToast('success', 'Статья создана');
  };

  const handleToggleAgentStatus = async (id: string) => {
    try {
      await agentService.toggleAgentStatus(id);
      await loadAgents(); // Перезагрузить список
      showToast('success', 'Статус изменен');
    } catch (error: any) {
      console.error('Failed to toggle agent status:', error);
      showToast('error', 'Не удалось изменить статус');
    }
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    showConfirmation(`Удалить ${agent.name}`, async () => {
      try {
        await agentService.deleteAgent(id);
        await loadAgents(); // Перезагрузить список
        hideConfirmation();
        showToast('success', 'Удалено');
      } catch (error: any) {
        console.error('Failed to delete agent:', error);
        showToast('error', 'Не удалось удалить агента');
        hideConfirmation();
      }
    });
  };

  const handleCopyAgent = async (agent: Agent) => {
    try {
      const newAgent = await agentService.createAgent({
        name: `${agent.name} (копия)`,
        model: agent.model,
        systemInstructions: agent.systemInstructions,
        isActive: false,
        pipelineSettings: agent.pipelineSettings,
        channelSettings: agent.channelSettings,
        kbSettings: agent.kbSettings,
      });
      await loadAgents(); // Перезагрузить список
      showToast('success', `Создана копия: ${newAgent.name}`);
    } catch (error: any) {
      console.error('Failed to copy agent:', error);
      showToast('error', 'Не удалось создать копию');
    }
  };

  const handleSaveAgent = async (updatedAgent: Agent) => {
    try {
      await agentService.updateAgent(updatedAgent.id, {
        name: updatedAgent.name,
        model: updatedAgent.model,
        systemInstructions: updatedAgent.systemInstructions,
        isActive: updatedAgent.isActive,
        pipelineSettings: updatedAgent.pipelineSettings,
        channelSettings: updatedAgent.channelSettings,
        kbSettings: updatedAgent.kbSettings,
        crmData: updatedAgent.crmData,
      });
      await loadAgents(); // Перезагрузить список
      showToast('success', 'Изменения сохранены');
    } catch (error: any) {
      console.error('Failed to save agent:', error);
      showToast('error', error.response?.data?.message || 'Не удалось сохранить изменения');
    }
  };

  const handleDeleteCategory = (id: string) => {
    const category = kbCategories.find(c => c.id === id);
    if (!category) return;

    showConfirmation(`Удалить ${category.name}`, () => {
      setKbCategories(prev => prev.filter(cat => cat.id !== id));
      hideConfirmation();
      showToast('success', 'Удалено');
    });
  };

  const handleCopyCategory = (category: { id: string; name: string; parentId: string | null }) => {
    const copiedCategory = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      name: `${category.name} (копия)`,
    };

    setKbCategories(prev => [...prev, copiedCategory]);
    showToast('success', `Создана копия: ${copiedCategory.name}`);
  };

  const handleDeleteArticle = (id: number) => {
    const article = kbArticles.find(a => a.id === id);
    if (!article) return;

    showConfirmation(`Удалить ${article.title}`, () => {
      setKbArticles(prev => prev.filter(art => art.id !== id));
      hideConfirmation();
      showToast('success', 'Удалено');
    });
  };

  const handleCopyArticle = (article: typeof kbArticles[0]) => {
    const copiedArticle = {
      ...article,
      id: Math.floor(1000 + Math.random() * 9000),
      title: `${article.title} (копия)`,
      isActive: false,
      createdAt: new Date().toLocaleString('ru-RU', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(',', '')
    };

    setKbArticles(prev => [...prev, copiedArticle]);
    showToast('success', `Создана копия: ${copiedArticle.title}`);
  };

  const handleToggleArticleStatus = (id: number) => {
    setKbArticles(prevArticles =>
      prevArticles.map(article =>
        article.id === id ? { ...article, isActive: !article.isActive } : article
      )
    );
  };

  const handleEditCategory = (id: string) => {
    const category = kbCategories.find(c => c.id === id);
    if (category) {
      setEditingCategory(category);
      setEditingCategoryId(id);
      setCurrentPage('kb-category-create');
    }
  };

  const handleEditArticle = (id: number) => {
    const article = kbArticles.find(a => a.id === id);
    if (article) {
      setEditingArticle(article);
      setEditingArticleId(id);
      setCurrentPage('kb-article-create');
    }
  };

  const handleSaveCategory = (updatedCategory: { id: string; name: string; parentId: string | null }) => {
    setKbCategories(prev => prev.map(cat =>
      cat.id === updatedCategory.id ? updatedCategory : cat
    ));
    showToast('success', 'Изменения сохранены');
    setEditingCategory(null);
    setCurrentPage('kb-categories');
  };

  const handleOpenCategory = (categoryId: string | null) => {
    setCurrentCategoryId(categoryId);
  };

  const handleAddCategory = (category: { name: string; parentId: string | null }) => {
    const newCategory = {
      id: Math.random().toString(36).substr(2, 9),
      ...category,
    };
    setKbCategories(prev => [...prev, newCategory]);
    showToast('success', 'Категория создана');
    setCurrentCategoryId(null); // Reset to root categories view
    setCurrentPage('kb-categories');
  };

  const handleSaveArticle = (updatedArticle: typeof kbArticles[0]) => {
    setKbArticles(prev => prev.map(art =>
      art.id === updatedArticle.id ? updatedArticle : art
    ));
    showToast('success', 'Изменения сохранены');
    setEditingArticle(null);
    setCurrentPage('kb-articles');
  };

  const handleNavigate = (page: Page) => {
    // Reset navigation states when switching to main pages from sidebar
    if (page === 'kb-categories') {
      setCurrentCategoryId(null); // Reset to root categories
    }
    setCurrentPage(page);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'agents': {
        // Защита от null/undefined и форматирование дат для отображения
        const safeAgents = Array.isArray(agents) ? agents.map(agent => ({
          ...agent,
          // Форматируем дату в читабельный формат, если это строка ISO
          createdAt: agent.createdAt && typeof agent.createdAt === 'string'
            ? new Date(agent.createdAt).toLocaleString('ru-RU', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).replace(',', '')
            : 'Неизвестно'
        })) : [];

        return <Agents
          agents={safeAgents}
          isLoading={isLoadingAgents}
          onToggleAgentStatus={handleToggleAgentStatus}
          onDeleteAgent={handleDeleteAgent}
          onCopyAgent={handleCopyAgent}
          onEditAgent={(agentId) => {
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
              setEditingAgent(agent);
              setEditingAgentId(agentId);
              setCurrentPage('agent-editor');
            }
          }}
          onCreateAgent={() => setCurrentPage('agent-create')}
        />;
      }
      case 'agent-create': return <AgentCreate onCancel={() => setCurrentPage('agents')} onCreate={() => setCurrentPage('agents')} onAddAgent={handleAddAgent} />;
      case 'agent-editor': return <AgentEditor agent={editingAgent} onCancel={() => { setEditingAgent(null); setEditingAgentId(null); setCurrentPage('agents'); }} onSave={handleSaveAgent} kbCategories={kbCategories} onNavigate={setCurrentPage} />;
      case 'chat': return <Chat agents={agents} />;
      case 'billing': return <Billing />;
      case 'settings': return <Settings showToast={showToast} />;
      case 'kb-categories': return <KbCategories onCreate={() => { setEditingCategory(null); setEditingCategoryId(null); setCurrentPage('kb-category-create'); }} categories={kbCategories} articles={kbArticles} currentCategoryId={currentCategoryId} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} onCopyCategory={handleCopyCategory} onOpenCategory={handleOpenCategory} onCreateArticle={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-article-create'); }} onEditArticle={handleEditArticle} />;
      case 'kb-category-create': return <KbCategoryCreate onCancel={() => { setEditingCategory(null); setEditingCategoryId(null); setCurrentPage('kb-categories'); }} category={editingCategory} onSave={handleSaveCategory} onAdd={handleAddCategory} categories={kbCategories} currentCategoryId={currentCategoryId} />;
      case 'kb-articles': return <KbArticles onCreate={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-article-create'); }} articles={kbArticles} onEditArticle={handleEditArticle} onDeleteArticle={handleDeleteArticle} onCopyArticle={handleCopyArticle} onToggleArticleStatus={handleToggleArticleStatus} />;
      case 'kb-article-create': return <KbArticleCreate onCancel={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-articles'); }} onAddArticle={handleAddArticle} onCreate={() => setCurrentPage('kb-articles')} availableArticles={kbArticles} article={editingArticle} onSave={handleSaveArticle} categories={kbCategories} />;
      default: return <Dashboard />;
    }
  };

  // === 5. Условные return (после всех хуков) ===
  // Показываем загрузку пока проверяем аутентификацию
  if (authLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Загрузка...</div>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем страницу Auth
  if (!isAuthenticated) {
    return <Auth />;
  }

  // === 6. Основной return (пользователь авторизован) ===
  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-gray-900 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {(() => {
            try {
              return renderContent();
            } catch (error) {
              console.error('❌ Error rendering content:', error);
              return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-red-500 text-xl mb-4">⚠️ Ошибка отображения</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {error instanceof Error ? error.message : 'Неизвестная ошибка'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Обновить страницу
                  </button>
                </div>
              );
            }
          })()}
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        onConfirm={confirmationModal.onConfirm}
        onCancel={hideConfirmation}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default App;