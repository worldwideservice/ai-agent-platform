import React from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GraduationCap,
  Zap,
  GitBranch,
  Brain,
  Network,
  FileText,
} from "lucide-react";

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
  memory?: {
    factsCount: number;
    facts?: string[];
  };
  graph?: {
    relationsCount: number;
  };
  documents?: {
    count: number;
  };
}

interface SourceTagsProps {
  sources: MessageSources;
}

interface SourceTagProps {
  icon: React.ReactNode;
  label: string;
  color: "blue" | "purple" | "amber" | "green" | "pink" | "cyan" | "slate";
  tooltip?: string;
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

const SourceTag: React.FC<SourceTagProps> = ({
  icon,
  label,
  color,
  tooltip,
}) => {
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
              tooltip={`${t("chat.sources.knowledgeBase")}: ${article.title}${article.categoryName ? ` (${article.categoryName})` : ""}`}
            />
          ))}
        </>
      )}

      {sources.trainingRole && (
        <SourceTag
          icon={<GraduationCap size={12} />}
          label={sources.trainingRole.name}
          color="purple"
          tooltip={`${t("chat.sources.trainingRole")}: ${sources.trainingRole.name}`}
        />
      )}

      {sources.triggers &&
        sources.triggers.map((trigger) => (
          <SourceTag
            key={trigger.id}
            icon={<Zap size={12} />}
            label={trigger.name}
            color="amber"
            tooltip={`${t("chat.sources.trigger")}: ${trigger.name} (${Math.round(trigger.confidence * 100)}%)`}
          />
        ))}

      {sources.pipeline && (
        <SourceTag
          icon={<GitBranch size={12} />}
          label={t("chat.sources.pipeline")}
          color="green"
          tooltip={`${t("chat.sources.pipeline")}: ${sources.pipeline.stageId}`}
        />
      )}

      {sources.memory && sources.memory.factsCount > 0 && (
        <SourceTag
          icon={<Brain size={12} />}
          label={`${t("chat.sources.memory", "Память")}: ${sources.memory.factsCount}`}
          color="pink"
          tooltip={
            sources.memory.facts
              ? sources.memory.facts.slice(0, 3).join("; ")
              : `${sources.memory.factsCount} фактов`
          }
        />
      )}

      {sources.graph && sources.graph.relationsCount > 0 && (
        <SourceTag
          icon={<Network size={12} />}
          label={`${t("chat.sources.graph", "Граф")}: ${sources.graph.relationsCount}`}
          color="cyan"
          tooltip={`${sources.graph.relationsCount} связей в графе знаний`}
        />
      )}

      {sources.documents && sources.documents.count > 0 && (
        <SourceTag
          icon={<FileText size={12} />}
          label={`${t("chat.sources.documents", "Документы")}: ${sources.documents.count}`}
          color="slate"
          tooltip={`${sources.documents.count} документов доступно`}
        />
      )}
    </div>
  );
};

export default SourceTags;
