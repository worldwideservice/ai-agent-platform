/**
 * Document Analysis Service
 * Автоматический анализ загруженных документов:
 * - Извлечение текста из файлов
 * - Создание embeddings для семантического поиска
 * - Извлечение ключевых фактов через AI
 */

import { Pool } from "pg";
import * as path from "path";
import { extractContent } from "./content-extraction.service";
import {
  createAndSaveEmbedding,
  deleteEmbeddingsBySource,
} from "./embeddings.service";
import { chatCompletion } from "./openrouter.service";

// Директории с файлами
const AGENT_DOCUMENTS_DIR = path.join(
  __dirname,
  "../../uploads/agent-documents",
);
const KB_ARTICLE_FILES_DIR = path.join(
  __dirname,
  "../../uploads/kb-article-files",
);

// Типы файлов которые можно анализировать (текстовые документы)
const ANALYZABLE_FILE_TYPES = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "md",
  "csv",
  "html",
  "htm",
  "json",
  "xls",
  "xlsx",
];

// Медиа файлы не анализируются - проверка через !ANALYZABLE_FILE_TYPES.includes()

export interface DocumentAnalysisResult {
  success: boolean;
  extractedText?: string;
  textLength?: number;
  embeddingId?: string;
  facts?: string[];
  error?: string;
}

/**
 * Проверяет, можно ли анализировать файл данного типа
 */
export function isAnalyzableFileType(fileType: string): boolean {
  return ANALYZABLE_FILE_TYPES.includes(fileType.toLowerCase());
}

/**
 * Анализирует документ агента после загрузки
 * - Извлекает текст
 * - Создает embedding для семантического поиска
 * - Опционально извлекает факты через AI
 */
export async function analyzeAgentDocument(
  pool: Pool,
  params: {
    documentId: string;
    agentId: string;
    userId: string;
    fileName: string;
    fileType: string;
    storageKey: string;
    extractFacts?: boolean; // Извлекать факты через AI (default: true)
  },
): Promise<DocumentAnalysisResult> {
  const {
    documentId,
    agentId,
    userId,
    fileName,
    fileType,
    storageKey,
    extractFacts = true,
  } = params;

  // Проверяем тип файла
  if (!isAnalyzableFileType(fileType)) {
    console.log(
      `⏭️ Skipping analysis for media file: ${fileName} (${fileType})`,
    );
    return { success: true, extractedText: undefined };
  }

  const filePath = path.join(AGENT_DOCUMENTS_DIR, storageKey);

  try {
    console.log(`📄 Analyzing agent document: ${fileName}`);

    // 1. Извлекаем текст из файла
    const extracted = await extractContent(filePath, fileType);

    if (!extracted.text || extracted.text.trim().length === 0) {
      console.log(`⚠️ No text extracted from ${fileName}`);
      return { success: true, extractedText: "" };
    }

    console.log(
      `📝 Extracted ${extracted.text.length} characters from ${fileName}`,
    );

    // 2. Создаем embedding для семантического поиска
    // Ограничиваем текст для embedding (первые 8000 символов)
    const textForEmbedding = extracted.text.substring(0, 8000);

    const embeddingId = await createAndSaveEmbedding(pool, {
      userId,
      content: textForEmbedding,
      sourceType: "agent_document",
      sourceId: documentId,
      metadata: {
        agentId,
        fileName,
        fileType,
        title: extracted.metadata.title || fileName,
        pages: extracted.metadata.pages,
        extractedAt: new Date().toISOString(),
      },
    });

    console.log(`🔮 Created embedding for document: ${documentId}`);

    // 3. Извлекаем ключевые факты через AI (опционально)
    let facts: string[] = [];
    if (extractFacts && extracted.text.length > 100) {
      facts = await extractDocumentFacts(extracted.text, fileName);
      console.log(`🧠 Extracted ${facts.length} facts from ${fileName}`);
    }

    return {
      success: true,
      extractedText: extracted.text,
      textLength: extracted.text.length,
      embeddingId,
      facts,
    };
  } catch (error: any) {
    console.error(`❌ Error analyzing document ${fileName}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Анализирует файл KB статьи после загрузки
 */
export async function analyzeKbArticleFile(
  pool: Pool,
  params: {
    fileId: string;
    articleId: number;
    userId: string;
    fileName: string;
    fileType: string;
    storageKey: string;
    articleTitle?: string;
  },
): Promise<DocumentAnalysisResult> {
  const {
    fileId,
    articleId,
    userId,
    fileName,
    fileType,
    storageKey,
    articleTitle,
  } = params;

  // Проверяем тип файла
  if (!isAnalyzableFileType(fileType)) {
    console.log(
      `⏭️ Skipping analysis for media file: ${fileName} (${fileType})`,
    );
    return { success: true, extractedText: undefined };
  }

  const filePath = path.join(KB_ARTICLE_FILES_DIR, storageKey);

  try {
    console.log(`📄 Analyzing KB article file: ${fileName}`);

    // 1. Извлекаем текст из файла
    const extracted = await extractContent(filePath, fileType);

    if (!extracted.text || extracted.text.trim().length === 0) {
      console.log(`⚠️ No text extracted from ${fileName}`);
      return { success: true, extractedText: "" };
    }

    console.log(
      `📝 Extracted ${extracted.text.length} characters from ${fileName}`,
    );

    // 2. Создаем embedding для семантического поиска
    const textForEmbedding = extracted.text.substring(0, 8000);

    const embeddingId = await createAndSaveEmbedding(pool, {
      userId,
      content: textForEmbedding,
      sourceType: "kb_article_file",
      sourceId: fileId,
      metadata: {
        articleId,
        articleTitle,
        fileName,
        fileType,
        title: extracted.metadata.title || fileName,
        pages: extracted.metadata.pages,
        extractedAt: new Date().toISOString(),
      },
    });

    console.log(`🔮 Created embedding for KB file: ${fileId}`);

    return {
      success: true,
      extractedText: extracted.text,
      textLength: extracted.text.length,
      embeddingId,
    };
  } catch (error: any) {
    console.error(`❌ Error analyzing KB file ${fileName}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Извлекает ключевые факты из текста документа через AI
 */
async function extractDocumentFacts(
  documentText: string,
  fileName: string,
  model: string = "openai/gpt-4o-mini",
): Promise<string[]> {
  try {
    // Ограничиваем текст для AI (первые 6000 символов)
    const truncatedText = documentText.substring(0, 6000);

    const result = await chatCompletion({
      model,
      messages: [
        {
          role: "system",
          content: `Ты - система извлечения ключевых фактов из документов.

ЗАДАЧА: Проанализируй документ и извлеки самые важные факты, которые могут быть полезны для AI-агента при общении с клиентами.

ЧТО ИЗВЛЕКАТЬ:
- Ключевые характеристики продуктов/услуг
- Цены и условия
- Технические спецификации
- Преимущества и особенности
- Контактные данные
- Важные даты и сроки
- Правила и условия
- FAQ ответы

ФОРМАТ: Верни JSON массив строк. Каждая строка - один конкретный факт (1-2 предложения).
Максимум 15 фактов. Если фактов меньше - верни меньше.
Если документ пустой или не содержит полезной информации - верни пустой массив [].`,
        },
        {
          role: "user",
          content: `Документ: "${fileName}"

Содержимое:
${truncatedText}

---
Извлеки ключевые факты (JSON массив):`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const responseText = result.choices[0]?.message?.content || "[]";

    // Парсим JSON ответ
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const facts = JSON.parse(cleanJson);

      if (!Array.isArray(facts)) {
        return [];
      }

      return facts.slice(0, 15); // Максимум 15 фактов
    } catch (parseError) {
      console.log("⚠️ Could not parse facts JSON from document");
      return [];
    }
  } catch (error: any) {
    console.error("Error extracting document facts:", error.message);
    return [];
  }
}

/**
 * Удаляет embeddings для документа агента
 */
export async function deleteAgentDocumentEmbeddings(
  pool: Pool,
  documentId: string,
): Promise<void> {
  await deleteEmbeddingsBySource(pool, {
    sourceType: "agent_document",
    sourceId: documentId,
  });
  console.log(`🗑️ Deleted embeddings for agent document: ${documentId}`);
}

/**
 * Удаляет embeddings для файла KB статьи
 */
export async function deleteKbArticleFileEmbeddings(
  pool: Pool,
  fileId: string,
): Promise<void> {
  await deleteEmbeddingsBySource(pool, {
    sourceType: "kb_article_file",
    sourceId: fileId,
  });
  console.log(`🗑️ Deleted embeddings for KB article file: ${fileId}`);
}

/**
 * Переиндексирует все документы агента
 * Полезно для миграции или обновления embeddings
 */
export async function reindexAgentDocuments(
  pool: Pool,
  agentId: string,
  userId: string,
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string;
    storageKey: string;
  }>,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  console.log(
    `🔄 Reindexing ${documents.length} documents for agent ${agentId}`,
  );

  for (const doc of documents) {
    // Удаляем старые embeddings
    await deleteAgentDocumentEmbeddings(pool, doc.id);

    // Создаем новые
    const result = await analyzeAgentDocument(pool, {
      documentId: doc.id,
      agentId,
      userId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      storageKey: doc.storageKey,
      extractFacts: false, // Не извлекаем факты при переиндексации
    });

    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`✅ Reindexing complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
