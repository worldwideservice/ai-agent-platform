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
  BookOpen,
  Shield,
  Server,
  UserCog,
  Mail,
  X
} from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../src/contexts/AuthContext';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen = false, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Section toggle states
  const [isAgentsOpen, setIsAgentsOpen] = useState(true);
  const [isKbOpen, setIsKbOpen] = useState(true);
  const [isTrainingOpen, setIsTrainingOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  // Global sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
    <button
      onClick={() => onNavigate(page)}
      title={isSidebarCollapsed ? label : undefined}
      className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        currentPage === page
          ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue-light'
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out
        fixed md:relative inset-y-0 left-0 z-50 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header / Company Switcher */}
        <div className={`p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 h-16`}>
          {(!isSidebarCollapsed || isOpen) ? (
            <div className="flex-1 min-w-0 overflow-hidden pl-3">
              <div className="text-lg font-bold">
                <span className="text-brand-blue">const</span>
                <span className="text-brand-orange">anta</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="text-lg font-bold mx-auto hover:opacity-80 transition-opacity"
              title="Развернуть"
            >
              <span className="text-brand-blue">c</span>
              <span className="text-brand-orange">.</span>
            </button>
          )}

          {/* Close button on mobile */}
          {!isSidebarCollapsed && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-2"
            >
              <X size={20} />
            </button>
          )}

          {/* Collapse button on desktop */}
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-2"
            >
              <ChevronLeft size={16} />
            </button>
          )}
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

        {/* Admin Section - Only visible for admins */}
        {isAdmin && (
          <div>
            <GroupHeader
              label={t('sidebar.admin', 'Администрирование')}
              isOpen={isAdminOpen}
              toggle={() => setIsAdminOpen(!isAdminOpen)}
            />
            {(isAdminOpen || isSidebarCollapsed) && (
              <div className="space-y-1">
                <NavItem page="admin-dashboard" icon={Shield} label={t('sidebar.adminDashboard', 'Обзор')} />
                <NavItem page="admin-users" icon={UserCog} label={t('sidebar.adminUsers', 'Пользователи')} />
                <NavItem page="admin-agents" icon={Bot} label={t('sidebar.adminAgents', 'Все агенты')} />
                <NavItem page="admin-system" icon={Server} label={t('sidebar.adminSystem', 'Система')} />
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Support Section */}
      <div className={`border-t border-gray-100 dark:border-gray-700 p-4 ${isSidebarCollapsed ? 'text-center' : ''}`}>
        <a
          href="mailto:support@constanta.com"
          title={isSidebarCollapsed ? t('sidebar.support', 'Поддержка') : undefined}
          className={`flex items-center gap-3 text-gray-500 dark:text-gray-400 hover:text-brand-blue dark:hover:text-brand-blue-light transition-colors ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Mail size={18} className="flex-shrink-0" />
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs text-gray-400 dark:text-gray-500">{t('sidebar.support', 'Поддержка')}</div>
              <div className="text-sm font-medium truncate">support@constanta.com</div>
            </div>
          )}
        </a>
      </div>
      </aside>
    </>
  );
};