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

const INITIAL_AGENTS: Agent[] = [];
const INITIAL_KB_CATEGORIES = [
  { id: 'general', name: 'Общее', parentId: null },
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('currentPage');
    return (saved as Page) || 'dashboard';
  });
  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('agents');
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
  });
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // KB Categories state
  const [kbCategories, setKbCategories] = useState<{ id: string; name: string; parentId: string | null }[]>(() => {
    const saved = localStorage.getItem('kbCategories');
    return saved ? JSON.parse(saved) : INITIAL_KB_CATEGORIES;
  });
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; parentId: string | null } | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentCategoryId');
    return saved ? (saved === 'null' ? null : saved) : null;
  }); // для навигации внутрь категорий

  // Save currentPage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Save currentCategoryId to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentCategoryId', currentCategoryId === null ? 'null' : currentCategoryId);
  }, [currentCategoryId]);

  // Save agents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('agents', JSON.stringify(agents));
  }, [agents]);

  // Save kbCategories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('kbCategories', JSON.stringify(kbCategories));
  }, [kbCategories]);

  // KB Articles state
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

  // Save kbArticles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('kbArticles', JSON.stringify(kbArticles));
  }, [kbArticles]);

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', onConfirm: () => { } });

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const handleAddAgent = (agent: Agent) => {
    setAgents(prev => [...prev, agent]);
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

  const handleToggleAgentStatus = (id: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === id ? { ...agent, isActive: !agent.isActive } : agent
      )
    );
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    showConfirmation(`Удалить ${agent.name}`, () => {
      setAgents(prev => prev.filter(agent => agent.id !== id));
      hideConfirmation();
      showToast('success', 'Удалено');
    });
  };

  const handleCopyAgent = (agent: Agent) => {
    const copiedAgent: Agent = {
      ...agent,
      id: Math.random().toString(36).substr(2, 9),
      name: `${agent.name} (копия)`,
      isActive: false,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setAgents(prev => [...prev, copiedAgent]);
    showToast('success', `Создана копия: ${copiedAgent.name}`);
  };

  const handleSaveAgent = (updatedAgent: Agent) => {
    setAgents(prev => prev.map(agent =>
      agent.id === updatedAgent.id ? updatedAgent : agent
    ));
    showToast('success', 'Изменения сохранены');
    setEditingAgent(null);
    setCurrentPage('agents');
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
      setCurrentPage('kb-category-create');
    }
  };

  const handleEditArticle = (id: number) => {
    const article = kbArticles.find(a => a.id === id);
    if (article) {
      setEditingArticle(article);
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
      case 'agents': return <Agents agents={agents} onToggleAgentStatus={handleToggleAgentStatus} onDeleteAgent={handleDeleteAgent} onCopyAgent={handleCopyAgent} onEditAgent={(agentId) => { const agent = agents.find(a => a.id === agentId); if (agent) { setEditingAgent(agent); setCurrentPage('agent-editor'); } }} onCreateAgent={() => setCurrentPage('agent-create')} />;
      case 'agent-create': return <AgentCreate onCancel={() => setCurrentPage('agents')} onCreate={() => setCurrentPage('agents')} onAddAgent={handleAddAgent} />;
      case 'agent-editor': return <AgentEditor agent={editingAgent} onCancel={() => { setEditingAgent(null); setCurrentPage('agents'); }} onSave={handleSaveAgent} kbCategories={kbCategories} onNavigate={setCurrentPage} />;
      case 'chat': return <Chat agents={agents} />;
      case 'billing': return <Billing />;
      case 'settings': return <Settings />;
      case 'kb-categories': return <KbCategories onCreate={() => { setEditingCategory(null); setCurrentPage('kb-category-create'); }} categories={kbCategories} articles={kbArticles} currentCategoryId={currentCategoryId} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} onCopyCategory={handleCopyCategory} onOpenCategory={handleOpenCategory} onCreateArticle={() => { setEditingArticle(null); setCurrentPage('kb-article-create'); }} onEditArticle={handleEditArticle} />;
      case 'kb-category-create': return <KbCategoryCreate onCancel={() => { setEditingCategory(null); setCurrentPage('kb-categories'); }} category={editingCategory} onSave={handleSaveCategory} onAdd={handleAddCategory} categories={kbCategories} currentCategoryId={currentCategoryId} />;
      case 'kb-articles': return <KbArticles onCreate={() => { setEditingArticle(null); setCurrentPage('kb-article-create'); }} articles={kbArticles} onEditArticle={handleEditArticle} onDeleteArticle={handleDeleteArticle} onCopyArticle={handleCopyArticle} onToggleArticleStatus={handleToggleArticleStatus} />;
      case 'kb-article-create': return <KbArticleCreate onCancel={() => { setEditingArticle(null); setCurrentPage('kb-articles'); }} onAddArticle={handleAddArticle} onCreate={() => setCurrentPage('kb-articles')} availableArticles={kbArticles} article={editingArticle} onSave={handleSaveArticle} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-gray-900 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderContent()}
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