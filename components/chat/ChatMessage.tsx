import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Bot, Copy, Check, User, FileText, Download, File } from "lucide-react";
import { SourceTags } from "./SourceTags";
import "highlight.js/styles/github-dark.css";

interface AttachedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  thumbnailUrl?: string;
}

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
  attachedDocuments?: AttachedDocument[];
}

interface ChatMessageProps {
  role: "user" | "model";
  content: string;
  sources?: MessageSources;
  attachedDocuments?: AttachedDocument[];
  isNew?: boolean;
  userAvatarUrl?: string | null;
  agentName?: string;
  agentModel?: string;
}

// Форматирование размера файла
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Иконка для типа файла
const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (["pdf"].includes(type)) return <FileText size={16} className="text-red-500" />;
  if (["doc", "docx"].includes(type)) return <FileText size={16} className="text-blue-500" />;
  if (["xls", "xlsx", "csv"].includes(type)) return <FileText size={16} className="text-green-500" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(type)) return <File size={16} className="text-purple-500" />;
  return <File size={16} className="text-gray-500" />;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  sources,
  attachedDocuments,
  isNew = false,
  userAvatarUrl,
  agentName,
  agentModel,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  // Объединяем документы из props и sources
  const allDocuments = attachedDocuments || sources?.attachedDocuments || [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Generate initials from agent name
  const agentInitials = agentName
    ? agentName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AI";

  return (
    <div
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""} ${
        isNew ? "animate-fadeIn" : ""
      }`}
    >
      {/* Avatar / Agent info */}
      {isUser ? (
        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="User"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <User size={18} className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
            {agentInitials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
              {agentName || "AI"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {agentModel || ""}
            </span>
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div className={`relative max-w-[85%] min-w-0`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tr-md"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-code:text-[#0078D4] dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Attached documents */}
          {!isUser && allDocuments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                📎 {t("chat.attachedDocuments", "Прикрепленные документы")}:
              </p>
              <div className="flex flex-wrap gap-2">
                {allDocuments.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors group/doc"
                  >
                    {getFileIcon(doc.fileType)}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[180px]">
                        {doc.fileName}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                    <Download
                      size={14}
                      className="text-gray-400 group-hover/doc:text-blue-500 transition-colors ml-1"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copy button - only for assistant messages */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute -right-2 top-2 p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
            title={t("chat.copyMessage")}
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        )}

        {/* Source tags - only for assistant messages */}
        {!isUser && sources && <SourceTags sources={sources} />}
      </div>
    </div>
  );
};

export default ChatMessage;
