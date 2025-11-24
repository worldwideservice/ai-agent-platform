import prisma from '../lib/prisma';
import { Pool } from 'pg';
import { createAndSaveEmbedding } from './embeddings.service';
import { ContentAnalysis } from './ai-kb-analyzer.service';

export interface KBBuildResult {
  categoriesCreated: number;
  articlesCreated: number;
  embeddingsGenerated: number;
  errors: string[];
  duration: number;
}

/**
 * Build Knowledge Base from AI analysis
 */
export async function buildKnowledgeBase(
  userId: string,
  analysis: ContentAnalysis,
  pool: Pool
): Promise<KBBuildResult> {
  const startTime = Date.now();
  const result: KBBuildResult = {
    categoriesCreated: 0,
    articlesCreated: 0,
    embeddingsGenerated: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Step 1: Create categories
    console.log('Creating categories...');
    const categoryMap = new Map<string, string>(); // name -> id

    // First, create parent categories
    const parentCategories = analysis.suggestedCategories.filter((cat) => !cat.parentCategory);

    for (const category of parentCategories) {
      try {
        const dbCategory = await prisma.kbCategory.create({
          data: {
            name: category.name,
            userId,
          },
        });
        categoryMap.set(category.name, dbCategory.id);
        result.categoriesCreated++;
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        const errorMsg = `Failed to create category ${category.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Then, create child categories
    const childCategories = analysis.suggestedCategories.filter((cat) => cat.parentCategory);

    for (const category of childCategories) {
      try {
        const parentId = categoryMap.get(category.parentCategory!);
        if (!parentId) {
          console.warn(`Parent category ${category.parentCategory} not found, creating as root`);
        }

        const dbCategory = await prisma.kbCategory.create({
          data: {
            name: category.name,
            userId,
            parentId: parentId || null,
          },
        });
        categoryMap.set(category.name, dbCategory.id);
        result.categoriesCreated++;
        console.log(`✅ Created subcategory: ${category.name}`);
      } catch (error) {
        const errorMsg = `Failed to create subcategory ${category.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Step 2: Create articles with categories
    console.log('Creating articles...');

    for (const article of analysis.articles) {
      try {
        // Get category IDs for this article
        const categoryIds = article.categoryNames
          .map((name) => categoryMap.get(name))
          .filter((id): id is string => id !== undefined);

        if (categoryIds.length === 0) {
          console.warn(`Article "${article.title}" has no valid categories, skipping...`);
          continue;
        }

        // Create article
        const dbArticle = await prisma.kbArticle.create({
          data: {
            title: article.title,
            content: article.content,
            isActive: true,
            userId,
            articleCategories: {
              create: categoryIds.map((categoryId) => ({
                categoryId,
              })),
            },
          },
          include: {
            articleCategories: {
              include: {
                category: true,
              },
            },
          },
        });

        result.articlesCreated++;
        console.log(`✅ Created article: ${article.title}`);

        // Step 3: Generate embedding for the article
        try {
          await createAndSaveEmbedding(pool, {
            userId,
            content: `${dbArticle.title}\n\n${dbArticle.content}`,
            sourceType: 'kb_article',
            sourceId: dbArticle.id.toString(),
            metadata: {
              title: dbArticle.title,
              categories: article.categoryNames,
              isActive: dbArticle.isActive,
              type: article.type,
              priority: article.priority,
            },
          });
          result.embeddingsGenerated++;
          console.log(`✅ Generated embedding for: ${article.title}`);
        } catch (error) {
          const errorMsg = `Failed to generate embedding for ${article.title}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      } catch (error) {
        const errorMsg = `Failed to create article ${article.title}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.duration = Date.now() - startTime;
    console.log(
      `\n✅ KB Build Complete!\nCategories: ${result.categoriesCreated}\nArticles: ${result.articlesCreated}\nEmbeddings: ${result.embeddingsGenerated}\nErrors: ${result.errors.length}\nDuration: ${result.duration}ms`
    );

    return result;
  } catch (error) {
    console.error('Fatal error building KB:', error);
    throw error;
  }
}

/**
 * Update an existing Knowledge Base with new analysis
 */
export async function updateKnowledgeBase(
  userId: string,
  analysis: ContentAnalysis,
  pool: Pool,
  mergeStrategy: 'add' | 'replace' = 'add'
): Promise<KBBuildResult> {
  if (mergeStrategy === 'replace') {
    // Delete existing KB
    console.log('Replacing existing KB...');
    await prisma.kbArticle.deleteMany({ where: { userId } });
    await prisma.kbCategory.deleteMany({ where: { userId } });
  }

  // Build new KB
  return buildKnowledgeBase(userId, analysis, pool);
}
