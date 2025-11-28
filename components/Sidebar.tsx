import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Folder,
  FileText,
  Library,
  Users,
  BookOpen
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useTranslation();

  // Section toggle states
  const [isAgentsOpen, setIsAgentsOpen] = useState(true);
  const [isKbOpen, setIsKbOpen] = useState(true);
  const [isTrainingOpen, setIsTrainingOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(true);

  // Global sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
    <button
      onClick={() => onNavigate(page)}
      title={isSidebarCollapsed ? label : undefined}
      className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        currentPage === page 
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
      } ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!isSidebarCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const GroupHeader = ({ label, isOpen, toggle }: { label: string, isOpen: boolean, toggle: () => void }) => {
    if (isSidebarCollapsed) {
      return <div className="my-4 h-px bg-gray-100 dark:bg-gray-700 mx-2" />;
    }
    return (
      <button 
        onClick={toggle}
        className="w-full px-3 mb-2 flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <span>{label}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
    );
  };

  return (
    <aside 
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out`}
    >
      {/* Header / Company Switcher */}
      <div className={`p-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} border-b border-gray-100 dark:border-gray-700 h-16`}>
        <div className="w-8 h-8 bg-black dark:bg-white dark:text-black text-white rounded flex items-center justify-center font-bold text-xs flex-shrink-0">
          WS
        </div>
        
        {!isSidebarCollapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">World Wide Services</div>
          </div>
        )}
        
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-1 mb-6">
          <NavItem page="dashboard" icon={LayoutDashboard} label={t('sidebar.dashboard')} />
        </div>

        {/* Agents Section */}
        <div>
          <GroupHeader
            label={t('sidebar.aiAgents')}
            isOpen={isAgentsOpen}
            toggle={() => setIsAgentsOpen(!isAgentsOpen)}
          />

          {/* Show items if group is open OR if sidebar is collapsed (to keep icons accessible) */}
          {(isAgentsOpen || isSidebarCollapsed) && (
            <div className="space-y-1">
              <NavItem page="agents" icon={Bot} label={t('sidebar.aiAgents')} />
              <NavItem page="chat" icon={MessageSquare} label={t('sidebar.testChat')} />
            </div>
          )}
        </div>

        {/* Knowledge Base Section */}
        <div>
          <GroupHeader
            label={t('sidebar.knowledgeBase')}
            isOpen={isKbOpen}
            toggle={() => setIsKbOpen(!isKbOpen)}
          />
          {(isKbOpen || isSidebarCollapsed) && (
            <div className="space-y-1">
              <NavItem page="kb-categories" icon={Folder} label={t('sidebar.categories')} />
              <NavItem page="kb-articles" icon={FileText} label={t('sidebar.articles')} />
            </div>
          )}
        </div>

        {/* Training Library Section */}
        <div>
          <GroupHeader
            label={t('sidebar.trainingLibrary')}
            isOpen={isTrainingOpen}
            toggle={() => setIsTrainingOpen(!isTrainingOpen)}
          />
          {(isTrainingOpen || isSidebarCollapsed) && (
            <div className="space-y-1">
              <NavItem page="training-roles" icon={Users} label={t('sidebar.agentRoles')} />
              <NavItem page="training-sources" icon={BookOpen} label={t('sidebar.knowledgeSources')} />
            </div>
          )}
        </div>

        {/* Account Section */}
        <div>
          <GroupHeader
            label={t('sidebar.account')}
            isOpen={isAccountOpen}
            toggle={() => setIsAccountOpen(!isAccountOpen)}
          />
          {(isAccountOpen || isSidebarCollapsed) && (
            <div className="space-y-1">
              <NavItem page="settings" icon={Settings} label={t('sidebar.accountSettings')} />
              <NavItem page="billing" icon={CreditCard} label={t('sidebar.billing')} />
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};