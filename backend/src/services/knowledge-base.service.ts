/**
 * Knowledge Base Service для агентов
 * Получение релевантной информации из базы знаний для формирования контекста
 * Включает поиск в:
 * - Статьях базы знаний (kb_article)
 * - Загруженных документах агента (agent_document)
 * - Файлах прикрепленных к статьям (kb_article_file)
 */

import { Pool } from "pg";
import { semanticSearch, EmbeddingSearchResult } from "./embeddings.service";
import { prisma } from "../config/database";

interface KBSettings {
  allCategories?: boolean;
  selectedCategories?: string[];
  createTaskIfNotFound?: boolean;
  noAnswerMessage?: string;
  // Настройки для документов агента
  allowAllDocuments?: boolean;
  useAgentDocuments?: boolean; // Использовать загруженные документы агента
  // Настройки для отправки документов клиентам
  allowAllArticlesForSending?: boolean;
  selectedArticlesForSending?: number[];
}

/**
 * Парсит настройки базы знаний из JSON строки
 */
export function parseKBSettings(
  kbSettingsJson: string | null,
): KBSettings | null {
  if (!kbSettingsJson) return null;

  try {
    return JSON.parse(kbSettingsJson) as KBSettings;
  } catch (error) {
    console.error("Error parsing KB settings:", error);
    return null;
  }
}

/**
 * Получает релевантные статьи из базы знаний для текущего сообщения
 * @param pool - PostgreSQL pool для embeddings
 * @param userId - ID пользователя
 * @param kbSettingsJson - Настройки БЗ агента
 * @param userMessage - Текущее сообщение пользователя
 * @param limit - Максимальное количество статей
 * @returns Массив релевантных статей
 */
export async function getRelevantKnowledge(
  pool: Pool,
  userId: string,
  kbSettingsJson: string | null,
  userMessage: string,
  limit: number = 3,
): Promise<string[]> {
  try {
    const kbSettings = parseKBSettings(kbSettingsJson);
    if (!kbSettings) return [];

    // Используем семантический поиск для нахождения релевантных статей
    const searchResults = await semanticSearch(pool, {
      userId,
      query: userMessage,
      limit,
      threshold: 0.7, // Минимальная схожесть 70%
      sourceTypes: ["kb_article"],
    });

    if (searchResults.length === 0) {
      return [];
    }

    // Получаем полные статьи из БД
    const articleIds = searchResults.map((r) => r.sourceId);
    const articles = await prisma.kbArticle.findMany({
      where: {
        id: { in: articleIds.map((id) => parseInt(id)) },
        isActive: true,
        userId,
      },
      include: {
        articleCategories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Фильтруем по категориям если нужно
    let filteredArticles = articles;
    if (
      !kbSettings.allCategories &&
      kbSettings.selectedCategories &&
      kbSettings.selectedCategories.length > 0
    ) {
      filteredArticles = articles.filter((article: any) =>
        article.articleCategories.some((ac: any) =>
          kbSettings.selectedCategories!.includes(ac.categoryId),
        ),
      );
    }

    // Формируем текстовое представление статей
    const knowledgeTexts = filteredArticles.map((article: any) => {
      return `# ${article.title}\n\n${article.content}`;
    });

    return knowledgeTexts;
  } catch (error) {
    console.error("Error getting relevant knowledge:", error);
    return [];
  }
}

/**
 * Формирует секцию базы знаний для промпта
 * @param knowledgeArticles - Массив текстов статей
 * @returns Форматированная строка для промпта
 */
export function buildKnowledgeContext(
  knowledgeArticles: string[],
): string | null {
  if (!knowledgeArticles || knowledgeArticles.length === 0) {
    return null;
  }

  const articlesText = knowledgeArticles.join("\n\n---\n\n");

  return `## База знаний (ваши знания и факты)

${articlesText}

ВАЖНО: Используйте информацию из базы знаний как источник фактов. Отвечайте только на основе этих знаний. Если информации нет в базе знаний, честно скажите об этом.`;
}

/**
 * Расширенный поиск знаний - включает статьи, документы агента и файлы статей
 * @param pool - PostgreSQL pool для embeddings
 * @param userId - ID пользователя
 * @param agentId - ID агента (для поиска его документов)
 * @param kbSettingsJson - Настройки БЗ агента
 * @param userMessage - Текущее сообщение пользователя
 * @param limit - Максимальное количество результатов
 * @returns Объект с найденными знаниями
 */
export async function getExtendedKnowledge(
  pool: Pool,
  userId: string,
  agentId: string,
  kbSettingsJson: string | null,
  userMessage: string,
  limit: number = 5,
): Promise<{
  articles: string[];
  documents: string[];
  files: string[];
  totalResults: number;
}> {
  try {
    const kbSettings = parseKBSettings(kbSettingsJson);

    const results: {
      articles: string[];
      documents: string[];
      files: string[];
      totalResults: number;
    } = {
      articles: [],
      documents: [],
      files: [],
      totalResults: 0,
    };

    // Определяем какие источники искать
    const sourceTypes: Array<
      "kb_article" | "agent_document" | "kb_article_file"
    > = ["kb_article", "kb_article_file"];

    // Добавляем документы агента если включено (по умолчанию включено)
    if (kbSettings?.useAgentDocuments !== false) {
      sourceTypes.push("agent_document");
    }

    // Семантический поиск по всем источникам
    const searchResults = await semanticSearch(pool, {
      userId,
      query: userMessage,
      limit: limit + 5, // Берем с запасом для фильтрации
      threshold: 0.6, // Немного ниже порог для расширенного поиска
      sourceTypes,
    });

    if (searchResults.length === 0) {
      console.log("📚 No relevant knowledge found");
      return results;
    }

    console.log(`📚 Found ${searchResults.length} relevant knowledge items`);

    // Группируем результаты по типу
    const articleResults: EmbeddingSearchResult[] = [];
    const documentResults: EmbeddingSearchResult[] = [];
    const fileResults: EmbeddingSearchResult[] = [];

    for (const result of searchResults) {
      switch (result.sourceType) {
        case "kb_article":
          articleResults.push(result);
          break;
        case "agent_document":
          // Проверяем что документ принадлежит этому агенту
          if (result.metadata?.agentId === agentId) {
            documentResults.push(result);
          }
          break;
        case "kb_article_file":
          fileResults.push(result);
          break;
      }
    }

    // Обрабатываем статьи
    if (articleResults.length > 0) {
      const articleIds = articleResults.map((r) => r.sourceId);
      const articles = await prisma.kbArticle.findMany({
        where: {
          id: { in: articleIds.map((id) => parseInt(id)) },
          isActive: true,
          userId,
        },
        include: {
          articleCategories: {
            include: {
              category: true,
            },
          },
        },
      });

      // Фильтруем по категориям если нужно
      let filteredArticles = articles;
      if (
        kbSettings &&
        !kbSettings.allCategories &&
        kbSettings.selectedCategories &&
        kbSettings.selectedCategories.length > 0
      ) {
        filteredArticles = articles.filter((article: any) =>
          article.articleCategories.some((ac: any) =>
            kbSettings.selectedCategories!.includes(ac.categoryId),
          ),
        );
      }

      results.articles = filteredArticles.slice(0, 3).map((article: any) => {
        return `# ${article.title}\n\n${article.content}`;
      });
    }

    // Обрабатываем документы агента
    if (documentResults.length > 0) {
      results.documents = documentResults.slice(0, 2).map((result) => {
        const fileName = result.metadata?.fileName || "Документ";
        const title = result.metadata?.title || fileName;
        // Берем извлеченный текст из content (уже сохранен при анализе)
        return `# 📄 ${title}\n\n${result.content}`;
      });
    }

    // Обрабатываем файлы статей
    if (fileResults.length > 0) {
      results.files = fileResults.slice(0, 2).map((result) => {
        const fileName = result.metadata?.fileName || "Файл";
        const articleTitle = result.metadata?.articleTitle || "";
        const title = articleTitle ? `${articleTitle} - ${fileName}` : fileName;
        return `# 📎 ${title}\n\n${result.content}`;
      });
    }

    results.totalResults =
      results.articles.length + results.documents.length + results.files.length;

    console.log(
      `📚 Knowledge breakdown: ${results.articles.length} articles, ${results.documents.length} documents, ${results.files.length} files`,
    );

    return results;
  } catch (error) {
    console.error("Error getting extended knowledge:", error);
    return {
      articles: [],
      documents: [],
      files: [],
      totalResults: 0,
    };
  }
}

/**
 * Формирует расширенный контекст знаний для промпта
 */
export function buildExtendedKnowledgeContext(knowledge: {
  articles: string[];
  documents: string[];
  files: string[];
}): string | null {
  const allKnowledge: string[] = [];

  if (knowledge.articles.length > 0) {
    allKnowledge.push(
      "## Статьи из базы знаний\n\n" + knowledge.articles.join("\n\n---\n\n"),
    );
  }

  if (knowledge.documents.length > 0) {
    allKnowledge.push(
      "## Загруженные документы\n\n" + knowledge.documents.join("\n\n---\n\n"),
    );
  }

  if (knowledge.files.length > 0) {
    allKnowledge.push(
      "## Прикрепленные файлы\n\n" + knowledge.files.join("\n\n---\n\n"),
    );
  }

  if (allKnowledge.length === 0) {
    return null;
  }

  return `# База знаний (ваши знания и факты)

${allKnowledge.join("\n\n")}

ВАЖНО: Используйте информацию из базы знаний как источник фактов. Отвечайте на основе этих знаний. Если нужной информации нет, честно скажите об этом.`;
}
