import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { TrainingRoles } from './pages/TrainingRoles';
import { TrainingSources } from './pages/TrainingSources';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminAgents } from './pages/AdminAgents';
import { AdminSystem } from './pages/AdminSystem';
import { Page, Agent } from './types';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ToastContainer, Toast } from './components/Toast';
import { useAuth } from './src/contexts/AuthContext';
import { useToast } from './src/contexts/ToastContext';
import { Auth } from './src/pages/Auth';
import { agentService, billingService, notificationsService, kbService } from './src/services/api';

const INITIAL_AGENTS: Agent[] = [];
// Категории теперь ВСЕГДА загружаются из API, не используем фейковые ID
const INITIAL_KB_CATEGORIES: { id: string; name: string; parentId: string | null }[] = [];

const App: React.FC = () => {
  // === 1. Все хуки должны быть в начале компонента ===
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast, toasts, removeToast } = useToast();

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

  // State для KB Categories - ВСЕГДА загружаем из API, не используем localStorage
  // Это предотвращает использование старых фейковых ID
  const [kbCategories, setKbCategories] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; parentId: string | null } | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('editingCategoryId');
    return saved || null;
  });
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentCategoryId');
    return saved ? (saved === 'null' ? null : saved) : null;
  });

  // State для KB Articles - ВСЕГДА загружаем из API
  const [kbArticles, setKbArticles] = useState<{
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  }[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
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

  // === 2. Вспомогательные функции ===
  const showConfirmation = (title: string, onConfirm: () => void) => {
    setConfirmationModal({ isOpen: true, title, onConfirm });
  };

  const hideConfirmation = () => {
    setConfirmationModal({ isOpen: false, title: '', onConfirm: () => { } });
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

  // Загрузка категорий из API
  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const categoriesData = await kbService.getAllCategories();
      // ВСЕГДА заменяем данные из API, даже если пустой массив
      // Это предотвращает использование старых фейковых ID из localStorage
      setKbCategories(categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId || null,
      })));
      console.log('✅ Loaded categories from API:', categoriesData.length);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      // При ошибке очищаем категории, чтобы не использовать фейковые ID
      setKbCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Загрузка статей из API (синхронизируется с backend)
  const loadArticles = async () => {
    setIsLoadingArticles(true);
    try {
      const articlesData = await kbService.getAllArticles();
      // ВСЕГДА заменяем данные из API
      setKbArticles(articlesData.map(article => ({
        id: article.id,
        title: article.title,
        isActive: article.isActive,
        categories: article.articleCategories?.map((ac: { category: { id: string } }) => ac.category.id) || [],
        relatedArticles: article.relatedArticles || [],
        content: article.content,
        createdAt: new Date(article.createdAt).toLocaleString('ru-RU', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(',', '')
      })));
      console.log('✅ Loaded articles from API:', articlesData.length);
    } catch (error: any) {
      console.error('Failed to load articles:', error);
      setKbArticles([]);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  // Проверка и показ уведомлений о пробном периоде
  const checkTrialNotification = async () => {
    try {
      const subscription = await billingService.getSubscription();

      // Проверяем только если пользователь на пробном периоде
      if (subscription.plan !== 'trial') {
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
  // Загрузка данных из API при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadAgents();
      loadCategories(); // Загружаем категории из API
      loadArticles(); // Загружаем статьи из API
      checkTrialNotification(); // Проверяем пробный период при входе
    }
  }, [isAuthenticated]);

  // Восстанавливаем editingAgent после загрузки агентов - загружаем свежие данные с сервера
  useEffect(() => {
    const restoreEditingAgent = async () => {
      if (editingAgentId && !editingAgent) {
        try {
          // Загружаем свежие данные агента напрямую с сервера
          const freshAgent = await agentService.getAgentById(editingAgentId);
          console.log('✅ Loaded fresh agent data:', freshAgent.id, freshAgent.name);
          setEditingAgent(freshAgent as unknown as Agent);
        } catch (error) {
          console.error('Failed to load agent:', editingAgentId, error);
          // Агент не найден, очищаем ID и возвращаемся на список
          localStorage.removeItem('editingAgentId');
          setEditingAgentId(null);
          if (currentPage === 'agent-editor') {
            setCurrentPage('agents');
          }
        }
      }
    };

    if (editingAgentId && !editingAgent && isAuthenticated) {
      restoreEditingAgent();
    }
  }, [editingAgentId, editingAgent, currentPage, isAuthenticated]);

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

  // НЕ сохраняем kbCategories в localStorage - они ВСЕГДА загружаются из API
  // Это предотвращает проблему с фейковыми ID категорий

  // НЕ сохраняем kbArticles в localStorage - они ВСЕГДА загружаются из API

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
      showToast('success', t('notifications.agentCreatedMessage', { name: newAgent.name }));
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.agentCreated',
          messageKey: 'notifications.agentCreatedMessage',
          params: { name: newAgent.name },
        });
      } catch (e) { /* ignore */ }
      return newAgent;
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      showToast('error', error.response?.data?.message || t('notifications.loadError'));
      throw error;
    }
  };

  const handleAddArticle = async (article: { title: string; isActive: boolean; categories: string[]; relatedArticles: string[]; content: string }, files?: File[]) => {
    try {
      // Создаём статью через backend API
      const createdArticle = await kbService.createArticle({
        title: article.title,
        content: article.content,
        isActive: article.isActive,
        categoryIds: article.categories,
      });

      // Загружаем файлы, если они есть
      if (files && files.length > 0) {
        try {
          await kbService.uploadArticleFiles(createdArticle.id, files);
        } catch (fileError) {
          console.error('Failed to upload files:', fileError);
          showToast('warning', t('notifications.filesUploadFailed'));
        }
      }

      // Добавляем статью в локальный state для отображения
      const newArticle = {
        id: createdArticle.id,
        title: article.title,
        isActive: article.isActive,
        categories: article.categories,
        relatedArticles: article.relatedArticles,
        content: article.content,
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
      showToast('success', t('notifications.articleCreated'));

      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.articleCreated',
          messageKey: 'notifications.articleCreatedMessage',
          params: { name: article.title },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      console.error('Failed to create article:', error);
      showToast('error', t('notifications.articleCreateFailed'));
    }
  };

  const handleToggleAgentStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    const wasActive = agent.isActive;
    const newStatus = !wasActive;

    // Optimistic update - обновляем UI сразу для плавной анимации
    setAgents(prevAgents =>
      prevAgents.map(a => a.id === id ? { ...a, isActive: newStatus } : a)
    );

    try {
      await agentService.toggleAgentStatus(id);
      const statusText = wasActive ? t('notifications.disabled') : t('notifications.enabled');
      const statusKey = wasActive ? 'disabled' : 'enabled';
      showToast('success', t('notifications.agentToggledMessage', { name: agent.name, status: statusText }));
      // Создаём уведомление с ключом статуса для перевода на стороне Header
      try {
        await notificationsService.createNotification({
          type: 'info',
          titleKey: 'notifications.agentToggled',
          messageKey: 'notifications.agentToggledMessage',
          params: { name: agent.name || '', status: statusKey, statusKey },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      // Revert on error - откатываем если API вернул ошибку
      setAgents(prevAgents =>
        prevAgents.map(a => a.id === id ? { ...a, isActive: wasActive } : a)
      );
      console.error('Failed to toggle agent status:', error);
      showToast('error', t('notifications.unknownError'));
    }
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    showConfirmation(`${t('confirmation.delete')} ${agent.name}`, async () => {
      try {
        await agentService.deleteAgent(id);
        await loadAgents(); // Перезагрузить список
        hideConfirmation();
        showToast('success', t('notifications.deletedMessage', { name: agent.name }));
        // Создаём уведомление
        try {
          await notificationsService.createNotification({
            type: 'warning',
            titleKey: 'notifications.deleted',
            messageKey: 'notifications.deletedMessage',
            params: { name: agent.name },
          });
        } catch (e) { /* ignore */ }
      } catch (error: any) {
        console.error('Failed to delete agent:', error);
        showToast('error', t('notifications.unknownError'));
        hideConfirmation();
      }
    });
  };

  const handleCopyAgent = async (agent: Agent) => {
    try {
      const newAgent = await agentService.createAgent({
        name: `${agent.name} (${t('notifications.copy')})`,
        model: agent.model,
        systemInstructions: agent.systemInstructions,
        isActive: false,
        pipelineSettings: agent.pipelineSettings,
        channelSettings: agent.channelSettings,
        kbSettings: agent.kbSettings,
      });
      await loadAgents(); // Перезагрузить список
      showToast('success', t('notifications.agentCopiedMessage', { name: agent.name, newName: newAgent.name }));
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.agentCopied',
          messageKey: 'notifications.agentCopiedMessage',
          params: { name: agent.name, newName: newAgent.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      console.error('Failed to copy agent:', error);
      showToast('error', t('notifications.unknownError'));
    }
  };

  const handleSaveAgent = async (updatedAgent: Agent) => {
    try {
      console.log('=== handleSaveAgent START ===');
      console.log('Agent data to save:', {
        id: updatedAgent.id,
        name: updatedAgent.name,
        model: updatedAgent.model,
      });

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

      console.log('Agent saved successfully, reloading agents...');
      await loadAgents(); // Перезагрузить список
      console.log('=== handleSaveAgent SUCCESS ===');
    } catch (error: any) {
      console.error('=== handleSaveAgent ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || t('notifications.unknownError');
      showToast('error', errorMessage);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const category = kbCategories.find(c => c.id === id);
    if (!category) return;

    showConfirmation(`${t('confirmation.delete')} ${category.name}`, async () => {
      try {
        // Удаляем из базы данных через API
        await kbService.deleteCategory(id);
        setKbCategories(prev => prev.filter(cat => cat.id !== id));
        hideConfirmation();
        showToast('success', t('notifications.deleted'));
        // Создаём уведомление
        try {
          await notificationsService.createNotification({
            type: 'warning',
            titleKey: 'notifications.categoryDeleted',
            messageKey: 'notifications.categoryDeletedMessage',
            params: { name: category.name },
          });
        } catch (e) { /* ignore */ }
      } catch (error: any) {
        console.error('Failed to delete category:', error);
        hideConfirmation();
        showToast('error', t('notifications.categoryDeleteFailed'));
      }
    });
  };

  const handleCopyCategory = async (category: { id: string; name: string; parentId: string | null }) => {
    try {
      // Создаём копию категории в базе данных через API
      const createdCategory = await kbService.createCategory({
        name: `${category.name} (${t('notifications.copy')})`,
        parentId: category.parentId,
      });

      const copiedCategory = {
        id: createdCategory.id,
        name: createdCategory.name,
        parentId: createdCategory.parentId || null,
      };

      setKbCategories(prev => [...prev, copiedCategory]);
      showToast('success', t('notifications.categoryCopiedMessage', { name: category.name }));
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.categoryCopied',
          messageKey: 'notifications.categoryCopiedMessage',
          params: { name: category.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      console.error('Failed to copy category:', error);
      showToast('error', t('notifications.categoryCopyFailed'));
    }
  };

  const handleDeleteArticle = (id: number) => {
    const article = kbArticles.find(a => a.id === id);
    if (!article) return;

    showConfirmation(`${t('confirmation.delete')} ${article.title}`, async () => {
      try {
        // Удаляем статью через API
        await kbService.deleteArticle(id);

        setKbArticles(prev => prev.filter(art => art.id !== id));
        hideConfirmation();
        showToast('success', t('notifications.deleted'));
        // Создаём уведомление
        try {
          await notificationsService.createNotification({
            type: 'warning',
            titleKey: 'notifications.articleDeleted',
            messageKey: 'notifications.articleDeletedMessage',
            params: { name: article.title },
          });
        } catch (e) { /* ignore */ }
      } catch (error: any) {
        console.error('Failed to delete article:', error);
        hideConfirmation();
        showToast('error', t('notifications.articleDeleteFailed'));
      }
    });
  };

  const handleCopyArticle = async (article: typeof kbArticles[0]) => {
    try {
      // Создаём копию статьи через API
      const createdArticle = await kbService.createArticle({
        title: `${article.title} (${t('notifications.copy')})`,
        content: article.content,
        isActive: false,
        categoryIds: article.categories,
      });

      const copiedArticle = {
        id: createdArticle.id,
        title: createdArticle.title,
        content: createdArticle.content,
        isActive: createdArticle.isActive,
        categories: article.categories,
        relatedArticles: article.relatedArticles,
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
      showToast('success', t('notifications.articleCopiedMessage', { name: article.title }));
      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.articleCopied',
          messageKey: 'notifications.articleCopiedMessage',
          params: { name: article.title },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      console.error('Failed to copy article:', error);
      showToast('error', t('notifications.articleCopyFailed'));
    }
  };

  const handleToggleArticleStatus = async (id: number) => {
    const article = kbArticles.find(a => a.id === id);
    if (!article) return;

    const wasActive = article.isActive;
    const newStatus = !wasActive;

    // Optimistic update
    setKbArticles(prevArticles =>
      prevArticles.map(a =>
        a.id === id ? { ...a, isActive: newStatus } : a
      )
    );

    try {
      // Переключаем статус через API
      await kbService.toggleArticleStatus(id);

      // Создаём уведомление
      const statusKey = wasActive ? 'disabled' : 'enabled';
      try {
        await notificationsService.createNotification({
          type: 'info',
          titleKey: 'notifications.articleStatusChanged',
          messageKey: 'notifications.articleStatusChangedMessage',
          params: { name: article.title, statusKey },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      // Revert on error
      setKbArticles(prevArticles =>
        prevArticles.map(a =>
          a.id === id ? { ...a, isActive: wasActive } : a
        )
      );
      console.error('Failed to toggle article status:', error);
      showToast('error', t('notifications.unknownError'));
    }
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

  const handleSaveCategory = async (updatedCategory: { id: string; name: string; parentId: string | null }) => {
    try {
      // Обновляем категорию в базе данных через API
      await kbService.updateCategory(updatedCategory.id, {
        name: updatedCategory.name,
        parentId: updatedCategory.parentId,
      });

      setKbCategories(prev => prev.map(cat =>
        cat.id === updatedCategory.id ? updatedCategory : cat
      ));
      showToast('success', t('notifications.changesSaved'));
      setEditingCategory(null);
      setCurrentPage('kb-categories');
    } catch (error: any) {
      console.error('Failed to update category:', error);
      showToast('error', t('notifications.categoryUpdateFailed'));
    }
  };

  const handleOpenCategory = (categoryId: string | null) => {
    setCurrentCategoryId(categoryId);
  };

  const handleAddCategory = async (category: { name: string; parentId: string | null }) => {
    try {
      // Сохраняем категорию в базу данных через API
      const createdCategory = await kbService.createCategory({
        name: category.name,
        parentId: category.parentId,
      });

      // Добавляем в локальный state с реальным ID из базы
      const newCategory = {
        id: createdCategory.id,
        name: createdCategory.name,
        parentId: createdCategory.parentId || null,
      };
      setKbCategories(prev => [...prev, newCategory]);
      showToast('success', t('notifications.categoryCreated'));

      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'notifications.categoryCreated',
          messageKey: 'notifications.categoryCreatedMessage',
          params: { name: category.name },
        });
      } catch (e) { /* ignore */ }
    } catch (error: any) {
      console.error('Failed to create category:', error);
      showToast('error', t('notifications.categoryCreateFailed'));
    }
    setCurrentCategoryId(null); // Reset to root categories view
    setCurrentPage('kb-categories');
  };

  const handleSaveArticle = async (updatedArticle: typeof kbArticles[0]) => {
    try {
      // Обновляем статью через API
      await kbService.updateArticle(updatedArticle.id, {
        title: updatedArticle.title,
        content: updatedArticle.content,
        isActive: updatedArticle.isActive,
        categoryIds: updatedArticle.categories,
      });

      setKbArticles(prev => prev.map(art =>
        art.id === updatedArticle.id ? updatedArticle : art
      ));
      showToast('success', t('notifications.changesSaved'));
      setEditingArticle(null);
      setCurrentPage('kb-articles');
    } catch (error: any) {
      console.error('Failed to update article:', error);
      showToast('error', t('notifications.articleUpdateFailed'));
    }
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
      case 'agent-editor': {
        // ВАЖНО: Не рендерим AgentEditor пока agent не загружен!
        // Иначе useState в AgentEditor инициализируется с дефолтными значениями
        if (!editingAgent) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Загрузка агента...</span>
              </div>
            </div>
          );
        }
        return <AgentEditor agent={editingAgent} onCancel={() => { setEditingAgent(null); setEditingAgentId(null); setCurrentPage('agents'); }} onSave={handleSaveAgent} kbCategories={kbCategories} onNavigate={setCurrentPage} />;
      }
      case 'chat': return <Chat agents={agents} />;
      case 'billing': return <Billing />;
      case 'settings': return <Settings showToast={showToast} />;
      case 'kb-categories': return <KbCategories onCreate={() => { setEditingCategory(null); setEditingCategoryId(null); setCurrentPage('kb-category-create'); }} categories={kbCategories} articles={kbArticles} currentCategoryId={currentCategoryId} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} onCopyCategory={handleCopyCategory} onOpenCategory={handleOpenCategory} onCreateArticle={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-article-create'); }} onEditArticle={handleEditArticle} loading={isLoadingCategories} />;
      case 'kb-category-create': return <KbCategoryCreate onCancel={() => { setEditingCategory(null); setEditingCategoryId(null); setCurrentPage('kb-categories'); }} category={editingCategory} onSave={handleSaveCategory} onAdd={handleAddCategory} categories={kbCategories} currentCategoryId={currentCategoryId} />;
      case 'kb-articles': return <KbArticles onCreate={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-article-create'); }} articles={kbArticles} categories={kbCategories} onEditArticle={handleEditArticle} onDeleteArticle={handleDeleteArticle} onCopyArticle={handleCopyArticle} onToggleArticleStatus={handleToggleArticleStatus} loading={isLoadingArticles} />;
      case 'kb-article-create': return <KbArticleCreate onCancel={() => { setEditingArticle(null); setEditingArticleId(null); setCurrentPage('kb-articles'); }} onAddArticle={handleAddArticle} onCreate={() => setCurrentPage('kb-articles')} availableArticles={kbArticles} article={editingArticle} onSave={handleSaveArticle} categories={kbCategories} />;
      case 'training-roles': return <TrainingRoles />;
      case 'training-sources': return <TrainingSources />;
      case 'admin-dashboard': return <AdminDashboard />;
      case 'admin-users': return <AdminUsers />;
      case 'admin-agents': return <AdminAgents />;
      case 'admin-system': return <AdminSystem />;
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
        background: '#fff',
      }}>
        <div style={{ color: '#64748b', fontSize: '18px' }}>Загрузка...</div>
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