import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GraduationCap,
  Zap,
  GitBranch,
  Brain,
  Network,
  FileText,
  Paperclip,
  X,
  ChevronRight,
} from "lucide-react";

interface KnowledgeArticle {
  id: number;
  title: string;
  categoryName?: string;
  relevanceScore?: number;
}

interface DocumentItem {
  id: string;
  title: string;
  similarity: number;
}

interface FileItem {
  id: string;
  title: string;
  similarity: number;
}

interface MessageSources {
  knowledgeBase?: {
    articles: KnowledgeArticle[];
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
    relations?: string[];
  };
  documents?: {
    count: number;
    items?: DocumentItem[];
  };
  files?: {
    count: number;
    items?: FileItem[];
  };
}

interface SourceTagsProps {
  sources: MessageSources;
}

interface SourceTagProps {
  icon: React.ReactNode;
  label: string;
  color: "blue" | "purple" | "amber" | "green" | "pink" | "cyan" | "slate" | "indigo";
  tooltip?: string;
  onClick?: () => void;
  clickable?: boolean;
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
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const SourceTag: React.FC<SourceTagProps> = ({
  icon,
  label,
  color,
  tooltip,
  onClick,
  clickable = false,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color]} transition-all hover:scale-105 ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current' : 'cursor-default'}`}
      title={tooltip}
      onClick={onClick}
    >
      {icon}
      <span className="truncate max-w-[150px]">{label}</span>
      {clickable && <ChevronRight size={10} className="ml-0.5 opacity-60" />}
    </div>
  );
};

// Modal component for detailed source view
type ModalSection = 'articles' | 'documents' | 'files' | 'memory' | 'graph' | 'all';

interface SourceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: MessageSources;
  initialSection?: ModalSection;
}

const SourceDetailsModal: React.FC<SourceDetailsModalProps> = ({
  isOpen,
  onClose,
  sources,
  initialSection = 'all',
}) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<ModalSection>(initialSection);

  if (!isOpen) return null;

  const renderRelevanceBar = (score: number) => {
    const percentage = Math.round(score * 100);
    const barColor = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500';
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
    );
  };

  const sections = [
    { id: 'all' as const, label: t('chat.sources.allSources', 'Все источники'), show: true },
    { id: 'articles' as const, label: t('chat.sources.articles', 'Статьи'), show: sources.knowledgeBase?.articles && sources.knowledgeBase.articles.length > 0 },
    { id: 'documents' as const, label: t('chat.sources.documents', 'Документы'), show: sources.documents?.items && sources.documents.items.length > 0 },
    { id: 'files' as const, label: t('chat.sources.files', 'Файлы'), show: sources.files?.items && sources.files.items.length > 0 },
    { id: 'memory' as const, label: t('chat.sources.memory', 'Память'), show: sources.memory?.facts && sources.memory.facts.length > 0 },
    { id: 'graph' as const, label: t('chat.sources.graph', 'Граф'), show: sources.graph?.relations && sources.graph.relations.length > 0 },
  ].filter(s => s.show);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('chat.sources.detailsTitle', 'Источники ответа')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        {sections.length > 1 && (
          <div className="flex gap-1 px-6 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)] space-y-6">
          {/* Articles */}
          {(activeSection === 'all' || activeSection === 'articles') &&
           sources.knowledgeBase?.articles && sources.knowledgeBase.articles.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <BookOpen size={16} className="text-blue-500" />
                {t('chat.sources.knowledgeBase', 'База знаний')} ({sources.knowledgeBase.articles.length})
              </h4>
              <div className="space-y-2">
                {sources.knowledgeBase.articles.map(article => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {article.title}
                      </p>
                      {article.categoryName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {article.categoryName}
                        </p>
                      )}
                    </div>
                    {article.relevanceScore && renderRelevanceBar(article.relevanceScore)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {(activeSection === 'all' || activeSection === 'documents') &&
           sources.documents?.items && sources.documents.items.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <FileText size={16} className="text-slate-500" />
                {t('chat.sources.documents', 'Документы')} ({sources.documents.items.length})
              </h4>
              <div className="space-y-2">
                {sources.documents.items.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
                      {doc.title}
                    </p>
                    {renderRelevanceBar(doc.similarity)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {(activeSection === 'all' || activeSection === 'files') &&
           sources.files?.items && sources.files.items.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Paperclip size={16} className="text-indigo-500" />
                {t('chat.sources.files', 'Файлы')} ({sources.files.items.length})
              </h4>
              <div className="space-y-2">
                {sources.files.items.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
                      {file.title}
                    </p>
                    {renderRelevanceBar(file.similarity)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memory */}
          {(activeSection === 'all' || activeSection === 'memory') &&
           sources.memory?.facts && sources.memory.facts.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Brain size={16} className="text-pink-500" />
                {t('chat.sources.memory', 'Память')} ({sources.memory.facts.length})
              </h4>
              <div className="space-y-2">
                {sources.memory.facts.map((fact, index) => (
                  <div
                    key={index}
                    className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg"
                  >
                    <p className="text-sm text-gray-900 dark:text-white">
                      {fact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graph */}
          {(activeSection === 'all' || activeSection === 'graph') &&
           sources.graph?.relations && sources.graph.relations.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <Network size={16} className="text-cyan-500" />
                {t('chat.sources.graph', 'Граф знаний')} ({sources.graph.relations.length})
              </h4>
              <div className="space-y-2">
                {sources.graph.relations.map((relation, index) => (
                  <div
                    key={index}
                    className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg"
                  >
                    <p className="text-sm text-gray-900 dark:text-white">
                      {relation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role & Triggers summary */}
          {activeSection === 'all' && (sources.trainingRole || (sources.triggers && sources.triggers.length > 0)) && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <GraduationCap size={16} className="text-purple-500" />
                {t('chat.sources.agentConfig', 'Конфигурация')}
              </h4>
              <div className="space-y-2">
                {sources.trainingRole && (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <GraduationCap size={14} className="text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('chat.sources.trainingRole', 'Роль')}:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{sources.trainingRole.name}</span>
                  </div>
                )}
                {sources.triggers && sources.triggers.map(trigger => (
                  <div key={trigger.id} className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('chat.sources.trigger', 'Триггер')}:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{trigger.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{Math.round(trigger.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SourceTags: React.FC<SourceTagsProps> = ({ sources }) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSection, setModalSection] = useState<ModalSection>('all');

  if (!sources || Object.keys(sources).length === 0) {
    return null;
  }

  const openModal = (section: ModalSection = 'all') => {
    setModalSection(section);
    setModalOpen(true);
  };

  // Check if we have detailed data to show in modal
  const hasArticleDetails = sources.knowledgeBase?.articles && sources.knowledgeBase.articles.length > 0;
  const hasDocumentDetails = sources.documents?.items && sources.documents.items.length > 0;
  const hasFileDetails = sources.files?.items && sources.files.items.length > 0;
  const hasMemoryDetails = sources.memory?.facts && sources.memory.facts.length > 0;
  const hasGraphDetails = sources.graph?.relations && sources.graph.relations.length > 0;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {/* Knowledge Base Articles */}
        {hasArticleDetails && (
          <SourceTag
            icon={<BookOpen size={12} />}
            label={`${t("chat.sources.knowledgeBase", "База знаний")}: ${sources.knowledgeBase!.articles.length}`}
            color="blue"
            tooltip={sources.knowledgeBase!.articles.map(a => a.title).join(", ")}
            clickable
            onClick={() => openModal('articles')}
          />
        )}

        {/* Documents */}
        {(hasDocumentDetails || (sources.documents && sources.documents.count > 0)) && (
          <SourceTag
            icon={<FileText size={12} />}
            label={`${t("chat.sources.documents", "Документы")}: ${sources.documents?.items?.length || sources.documents?.count || 0}`}
            color="slate"
            tooltip={sources.documents?.items?.map(d => d.title).join(", ") || `${sources.documents?.count} документов`}
            clickable={hasDocumentDetails}
            onClick={hasDocumentDetails ? () => openModal('documents') : undefined}
          />
        )}

        {/* Files */}
        {hasFileDetails && (
          <SourceTag
            icon={<Paperclip size={12} />}
            label={`${t("chat.sources.files", "Файлы")}: ${sources.files!.items!.length}`}
            color="indigo"
            tooltip={sources.files!.items!.map(f => f.title).join(", ")}
            clickable
            onClick={() => openModal('files')}
          />
        )}

        {/* Memory */}
        {(hasMemoryDetails || (sources.memory && sources.memory.factsCount > 0)) && (
          <SourceTag
            icon={<Brain size={12} />}
            label={`${t("chat.sources.memory", "Память")}: ${sources.memory?.facts?.length || sources.memory?.factsCount || 0}`}
            color="pink"
            tooltip={
              sources.memory?.facts
                ? sources.memory.facts.slice(0, 3).join("; ")
                : `${sources.memory?.factsCount} фактов`
            }
            clickable={hasMemoryDetails}
            onClick={hasMemoryDetails ? () => openModal('memory') : undefined}
          />
        )}

        {/* Graph */}
        {(hasGraphDetails || (sources.graph && sources.graph.relationsCount > 0)) && (
          <SourceTag
            icon={<Network size={12} />}
            label={`${t("chat.sources.graph", "Граф")}: ${sources.graph?.relations?.length || sources.graph?.relationsCount || 0}`}
            color="cyan"
            tooltip={
              sources.graph?.relations
                ? sources.graph.relations.slice(0, 2).join("; ")
                : `${sources.graph?.relationsCount} связей`
            }
            clickable={hasGraphDetails}
            onClick={hasGraphDetails ? () => openModal('graph') : undefined}
          />
        )}

        {/* Training Role */}
        {sources.trainingRole && (
          <SourceTag
            icon={<GraduationCap size={12} />}
            label={sources.trainingRole.name}
            color="purple"
            tooltip={`${t("chat.sources.trainingRole", "Роль")}: ${sources.trainingRole.name}`}
          />
        )}

        {/* Triggers */}
        {sources.triggers &&
          sources.triggers.map((trigger) => (
            <SourceTag
              key={trigger.id}
              icon={<Zap size={12} />}
              label={`${trigger.name} ${Math.round(trigger.confidence * 100)}%`}
              color="amber"
              tooltip={`${t("chat.sources.trigger", "Триггер")}: ${trigger.name}`}
            />
          ))}

        {/* Pipeline */}
        {sources.pipeline && (
          <SourceTag
            icon={<GitBranch size={12} />}
            label={t("chat.sources.pipeline", "Воронка")}
            color="green"
            tooltip={`${t("chat.sources.pipeline", "Воронка")}: ${sources.pipeline.stageId}`}
          />
        )}
      </div>

      {/* Details Modal */}
      <SourceDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        sources={sources}
        initialSection={modalSection}
      />
    </>
  );
};

export default SourceTags;
export { SourceDetailsModal };
export type { MessageSources };
