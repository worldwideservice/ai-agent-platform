import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

/**
 * GET /api/kb/articles
 * Получить все статьи пользователя
 */
export async function getAllArticles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { categoryId, isActive } = req.query;

    // Формируем фильтр
    const where: any = { userId };

    // Фильтр по активности
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Фильтр по категории
    let articles;
    if (categoryId) {
      articles = await prisma.kbArticle.findMany({
        where: {
          ...where,
          articleCategories: {
            some: {
              categoryId: categoryId as string,
            },
          },
        },
        include: {
          articleCategories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      articles = await prisma.kbArticle.findMany({
        where,
        include: {
          articleCategories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(articles);
  } catch (error) {
    console.error('Get all articles error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch articles'
    });
  }
}

/**
 * GET /api/kb/articles/:id
 * Получить статью по ID с полной информацией
 */
export async function getArticleById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const article = await prisma.kbArticle.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        articleCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      res.status(404).json({
        error: 'Article not found',
        message: 'Article does not exist or you do not have access'
      });
      return;
    }

    res.json(article);
  } catch (error) {
    console.error('Get article by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch article'
    });
  }
}

/**
 * POST /api/kb/articles
 * Создать новую статью
 */
export async function createArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, content, isActive, categoryIds, relatedArticles } = req.body;
    const userId = req.userId!;

    // Валидация
    if (!title || title.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Article title is required'
      });
      return;
    }

    if (!content || content.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Article content is required'
      });
      return;
    }

    // Проверяем что категории существуют и принадлежат пользователю
    if (categoryIds && categoryIds.length > 0) {
      const categories = await prisma.kbCategory.findMany({
        where: {
          id: { in: categoryIds },
          userId,
        },
      });

      if (categories.length !== categoryIds.length) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'One or more categories not found or do not belong to you'
        });
        return;
      }
    }

    // Создаем статью
    const article = await prisma.kbArticle.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        isActive: isActive !== undefined ? isActive : true,
        relatedArticles: relatedArticles || [],
        userId,
        articleCategories: categoryIds && categoryIds.length > 0 ? {
          create: categoryIds.map((categoryId: string) => ({
            categoryId,
          })),
        } : undefined,
      },
      include: {
        articleCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create article'
    });
  }
}

/**
 * PUT /api/kb/articles/:id
 * Обновить статью
 */
export async function updateArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, content, isActive, categoryIds, relatedArticles } = req.body;
    const userId = req.userId!;

    const articleId = parseInt(id);

    // Проверяем что статья существует и принадлежит пользователю
    const existingArticle = await prisma.kbArticle.findFirst({
      where: {
        id: articleId,
        userId,
      },
      include: {
        articleCategories: true,
      },
    });

    if (!existingArticle) {
      res.status(404).json({
        error: 'Article not found',
        message: 'Article does not exist or you do not have access'
      });
      return;
    }

    // Валидация
    if (title !== undefined && title.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Article title cannot be empty'
      });
      return;
    }

    if (content !== undefined && content.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Article content cannot be empty'
      });
      return;
    }

    // Проверяем что категории существуют и принадлежат пользователю
    if (categoryIds && categoryIds.length > 0) {
      const categories = await prisma.kbCategory.findMany({
        where: {
          id: { in: categoryIds },
          userId,
        },
      });

      if (categories.length !== categoryIds.length) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'One or more categories not found or do not belong to you'
        });
        return;
      }
    }

    // Если обновляются категории, удаляем старые связи и создаем новые
    if (categoryIds !== undefined) {
      await prisma.articleCategory.deleteMany({
        where: { articleId },
      });
    }

    const article = await prisma.kbArticle.update({
      where: { id: articleId },
      data: {
        title: title?.trim() || existingArticle.title,
        content: content?.trim() || existingArticle.content,
        isActive: isActive !== undefined ? isActive : existingArticle.isActive,
        relatedArticles: relatedArticles !== undefined ? relatedArticles : existingArticle.relatedArticles,
        articleCategories: categoryIds !== undefined ? {
          create: categoryIds.map((categoryId: string) => ({
            categoryId,
          })),
        } : undefined,
      },
      include: {
        articleCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(article);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update article'
    });
  }
}

/**
 * DELETE /api/kb/articles/:id
 * Удалить статью
 */
export async function deleteArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const articleId = parseInt(id);

    // Проверяем что статья существует и принадлежит пользователю
    const article = await prisma.kbArticle.findFirst({
      where: {
        id: articleId,
        userId,
      },
    });

    if (!article) {
      res.status(404).json({
        error: 'Article not found',
        message: 'Article does not exist or you do not have access'
      });
      return;
    }

    // Удаляем статью (связи удалятся автоматически благодаря onDelete: Cascade)
    await prisma.kbArticle.delete({
      where: { id: articleId },
    });

    res.json({
      message: 'Article deleted successfully',
      id: articleId,
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete article'
    });
  }
}

/**
 * PATCH /api/kb/articles/:id/toggle
 * Переключить активность статьи
 */
export async function toggleArticleStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const articleId = parseInt(id);

    const article = await prisma.kbArticle.findFirst({
      where: {
        id: articleId,
        userId,
      },
    });

    if (!article) {
      res.status(404).json({
        error: 'Article not found',
        message: 'Article does not exist or you do not have access'
      });
      return;
    }

    const updatedArticle = await prisma.kbArticle.update({
      where: { id: articleId },
      data: {
        isActive: !article.isActive,
      },
      include: {
        articleCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedArticle);
  } catch (error) {
    console.error('Toggle article status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to toggle article status'
    });
  }
}
