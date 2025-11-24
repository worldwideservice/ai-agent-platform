/**
 * Knowledge Base Service для агентов
 * Получение релевантной информации из базы знаний для формирования контекста
 */

import { Pool } from 'pg';
import { semanticSearch } from './embeddings.service';
import { prisma } from '../config/database';

interface KBSettings {
  allCategories?: boolean;
  selectedCategories?: string[];
  createTaskIfNotFound?: boolean;
  noAnswerMessage?: string;
}

/**
 * Парсит настройки базы знаний из JSON строки
 */
export function parseKBSettings(kbSettingsJson: string | null): KBSettings | null {
  if (!kbSettingsJson) return null;

  try {
    return JSON.parse(kbSettingsJson) as KBSettings;
  } catch (error) {
    console.error('Error parsing KB settings:', error);
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
  limit: number = 3
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
      sourceTypes: ['kb_article'],
    });

    if (searchResults.length === 0) {
      return [];
    }

    // Получаем полные статьи из БД
    const articleIds = searchResults.map(r => r.sourceId);
    const articles = await prisma.kbArticle.findMany({
      where: {
        id: { in: articleIds.map(id => parseInt(id)) },
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
    if (!kbSettings.allCategories && kbSettings.selectedCategories && kbSettings.selectedCategories.length > 0) {
      filteredArticles = articles.filter((article: any) =>
        article.articleCategories.some((ac: any) =>
          kbSettings.selectedCategories!.includes(ac.categoryId)
        )
      );
    }

    // Формируем текстовое представление статей
    const knowledgeTexts = filteredArticles.map((article: any) => {
      return `# ${article.title}\n\n${article.content}`;
    });

    return knowledgeTexts;
  } catch (error) {
    console.error('Error getting relevant knowledge:', error);
    return [];
  }
}

/**
 * Формирует секцию базы знаний для промпта
 * @param knowledgeArticles - Массив текстов статей
 * @returns Форматированная строка для промпта
 */
export function buildKnowledgeContext(knowledgeArticles: string[]): string | null {
  if (!knowledgeArticles || knowledgeArticles.length === 0) {
    return null;
  }

  const articlesText = knowledgeArticles.join('\n\n---\n\n');

  return `## База знаний (ваши знания и факты)

${articlesText}

ВАЖНО: Используйте информацию из базы знаний как источник фактов. Отвечайте только на основе этих знаний. Если информации нет в базе знаний, честно скажите об этом.`;
}
