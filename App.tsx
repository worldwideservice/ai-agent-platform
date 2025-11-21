import React, { useState } from 'react';
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

const INITIAL_AGENTS: Agent[] = [
  { id: '1', name: 'АИ ассистент', isActive: false, model: 'OpenAI GPT-4.1', createdAt: '2025-01-01' },
  { id: '2', name: 'Менеджер по продажам', isActive: false, model: 'OpenAI GPT-5', createdAt: '2025-02-15' },
  { id: '3', name: 'Test Agent для тестирования UI', isActive: true, model: 'OpenAI GPT-5', createdAt: '2025-03-10' },
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // KB Categories state
  const [kbCategories, setKbCategories] = useState<{ id: string; name: string }[]>([
    { id: 'general', name: 'Общее' }
  ]);

  // KB Articles state
  const [kbArticles, setKbArticles] = useState<{
    id: number;
    title: string;
    isActive: boolean;
    categories: string[];
    relatedArticles: string[];
    content: string;
    createdAt: string;
  }[]>([]);

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

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'agents': return <Agents agents={agents} onToggleAgentStatus={handleToggleAgentStatus} onDeleteAgent={handleDeleteAgent} onCopyAgent={handleCopyAgent} onEditAgent={(agentId) => { const agent = agents.find(a => a.id === agentId); if (agent) { setEditingAgent(agent); setCurrentPage('agent-editor'); } }} onCreateAgent={() => setCurrentPage('agent-create')} />;
      case 'agent-create': return <AgentCreate onCancel={() => setCurrentPage('agents')} onCreate={() => setCurrentPage('agents')} onAddAgent={handleAddAgent} />;
      case 'agent-editor': return <AgentEditor agent={editingAgent} onCancel={() => { setEditingAgent(null); setCurrentPage('agents'); }} onSave={handleSaveAgent} kbCategories={kbCategories} onNavigate={setCurrentPage} />;
      case 'chat': return <Chat />;
      case 'billing': return <Billing />;
      case 'settings': return <Settings />;
      case 'kb-categories': return <KbCategories onCreate={() => setCurrentPage('kb-category-create')} categories={kbCategories} />;
      case 'kb-category-create': return <KbCategoryCreate onCancel={() => setCurrentPage('kb-categories')} />;
      case 'kb-articles': return <KbArticles onCreate={() => setCurrentPage('kb-article-create')} articles={kbArticles} />;
      case 'kb-article-create': return <KbArticleCreate onCancel={() => setCurrentPage('kb-articles')} onAddArticle={handleAddArticle} onCreate={() => setCurrentPage('kb-articles')} availableArticles={kbArticles} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-gray-900 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
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