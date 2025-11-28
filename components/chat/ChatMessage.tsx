import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Bot, User, Copy, Check } from 'lucide-react';
import { SourceTags } from './SourceTags';
import 'highlight.js/styles/github-dark.css';

interface MessageSources {
  knowledgeBase?: {
    articles: Array<{
      id: number;
      title: string;
      categoryName?: string;
      relevanceScore?: number;
    }>;
  };
  trainingRole?: {
    id: string;
    name: string;
  };
  triggers?: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
  pipeline?: {
    pipelineId: string;
    stageId: string;
  };
}

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
  sources?: MessageSources;
  isNew?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  sources,
  isNew = false,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={`group flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} ${
        isNew ? 'animate-fadeIn' : ''
      }`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
          <Bot size={18} />
        </div>
      )}

      <div className={`relative max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-bl-none'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-blue-600 dark:prose-code:text-blue-400">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy button - only for assistant messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -right-2 -top-2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-500"
              title={t('chat.copyMessage')}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
        </div>

        {/* Source tags - only for assistant messages */}
        {!isUser && sources && <SourceTags sources={sources} />}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
          <User size={18} />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
