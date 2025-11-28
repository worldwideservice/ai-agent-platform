import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare, Trash2, Edit2, X } from 'lucide-react';

interface Conversation {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'thisWeek';
  return 'earlier';
};

const groupConversations = (conversations: Conversation[]) => {
  const groups: Record<string, Conversation[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  conversations.forEach((conv) => {
    const group = formatDate(conv.updatedAt);
    groups[group].push(conv);
  });

  return groups;
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const groups = groupConversations(conversations);

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const renderGroup = (groupKey: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div key={groupKey} className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
          {t(`chat.${groupKey}`)}
        </h3>
        <div className="space-y-1">
          {items.map((conv) => (
            <div
              key={conv.id}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conv.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <MessageSquare size={16} className="flex-shrink-0" />

              {editingId === conv.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditTitle('');
                    }
                  }}
                  className="flex-1 bg-white dark:bg-gray-600 text-sm px-2 py-0.5 rounded border border-blue-500 focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate text-sm">{conv.title}</span>
              )}

              {/* Action buttons */}
              <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(conv);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title={t('chat.renameConversation')}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('chat.confirmDelete'))) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  title={t('chat.deleteConversation')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t('chat.conversations')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X size={20} />
            </button>
          </div>

          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            {t('chat.newChat')}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-4">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8 px-4">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('chat.noConversations')}</p>
              <p className="text-xs mt-1">{t('chat.startNewChat')}</p>
            </div>
          ) : (
            <>
              {renderGroup('today', groups.today)}
              {renderGroup('yesterday', groups.yesterday)}
              {renderGroup('thisWeek', groups.thisWeek)}
              {renderGroup('earlier', groups.earlier)}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
