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
import { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'agents': return <Agents onEditAgent={() => setCurrentPage('agent-editor')} onCreateAgent={() => setCurrentPage('agent-create')} />;
      case 'agent-create': return <AgentCreate onCancel={() => setCurrentPage('agents')} onCreate={() => setCurrentPage('agent-editor')} />;
      case 'agent-editor': return <AgentEditor onCancel={() => setCurrentPage('agents')} />;
      case 'chat': return <Chat />;
      case 'billing': return <Billing />;
      case 'settings': return <Settings />;
      case 'kb-categories': return <KbCategories onCreate={() => setCurrentPage('kb-category-create')} />;
      case 'kb-category-create': return <KbCategoryCreate onCancel={() => setCurrentPage('kb-categories')} />;
      case 'kb-articles': return <KbArticles onCreate={() => setCurrentPage('kb-article-create')} />;
      case 'kb-article-create': return <KbArticleCreate onCancel={() => setCurrentPage('kb-articles')} />;
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
    </div>
  );
};

export default App;