import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap, Zap, GitBranch } from 'lucide-react';

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

interface SourceTagsProps {
  sources: MessageSources;
}

interface SourceTagProps {
  icon: React.ReactNode;
  label: string;
  color: 'blue' | 'purple' | 'amber' | 'green';
  tooltip?: string;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const SourceTag: React.FC<SourceTagProps> = ({ icon, label, color, tooltip }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color]} transition-all hover:scale-105 cursor-default`}
      title={tooltip}
    >
      {icon}
      <span className="truncate max-w-[150px]">{label}</span>
    </div>
  );
};

export const SourceTags: React.FC<SourceTagsProps> = ({ sources }) => {
  const { t } = useTranslation();

  if (!sources || Object.keys(sources).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      {sources.knowledgeBase && sources.knowledgeBase.articles.length > 0 && (
        <>
          {sources.knowledgeBase.articles.map((article) => (
            <SourceTag
              key={article.id}
              icon={<BookOpen size={12} />}
              label={article.title}
              color="blue"
              tooltip={`${t('chat.sources.knowledgeBase')}: ${article.title}${article.categoryName ? ` (${article.categoryName})` : ''}`}
            />
          ))}
        </>
      )}

      {sources.trainingRole && (
        <SourceTag
          icon={<GraduationCap size={12} />}
          label={sources.trainingRole.name}
          color="purple"
          tooltip={`${t('chat.sources.trainingRole')}: ${sources.trainingRole.name}`}
        />
      )}

      {sources.triggers && sources.triggers.map((trigger) => (
        <SourceTag
          key={trigger.id}
          icon={<Zap size={12} />}
          label={trigger.name}
          color="amber"
          tooltip={`${t('chat.sources.trigger')}: ${trigger.name} (${Math.round(trigger.confidence * 100)}%)`}
        />
      ))}

      {sources.pipeline && (
        <SourceTag
          icon={<GitBranch size={12} />}
          label={t('chat.sources.pipeline')}
          color="green"
          tooltip={`${t('chat.sources.pipeline')}: ${sources.pipeline.stageId}`}
        />
      )}
    </div>
  );
};

export default SourceTags;
