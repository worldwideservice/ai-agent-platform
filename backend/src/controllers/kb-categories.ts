import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

/**
 * GET /api/kb/categories
 * Получить все категории пользователя (включая иерархию)
 */
export async function getAllCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const categories = await prisma.kbCategory.findMany({
      where: { userId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            articleCategories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch categories'
    });
  }
}

/**
 * GET /api/kb/categories/:id
 * Получить категорию по ID с детальной информацией
 */
export async function getCategoryById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const category = await prisma.kbCategory.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        articleCategories: {
          include: {
            article: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      res.status(404).json({
        error: 'Category not found',
        message: 'Category does not exist or you do not have access'
      });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch category'
    });
  }
}

/**
 * POST /api/kb/categories
 * Создать новую категорию
 */
export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, parentId } = req.body;
    const userId = req.userId!;

    // Валидация
    if (!name || name.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Category name is required'
      });
      return;
    }

    // Если указан parentId, проверяем что он существует и принадлежит пользователю
    if (parentId) {
      const parentCategory = await prisma.kbCategory.findFirst({
        where: {
          id: parentId,
          userId,
        },
      });

      if (!parentCategory) {
        res.status(404).json({
          error: 'Parent category not found',
          message: 'Parent category does not exist or you do not have access'
        });
        return;
      }
    }

    const category = await prisma.kbCategory.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        userId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create category'
    });
  }
}

/**
 * PUT /api/kb/categories/:id
 * Обновить категорию
 */
export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body;
    const userId = req.userId!;

    // Проверяем что категория существует и принадлежит пользователю
    const existingCategory = await prisma.kbCategory.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCategory) {
      res.status(404).json({
        error: 'Category not found',
        message: 'Category does not exist or you do not have access'
      });
      return;
    }

    // Валидация
    if (name && name.trim() === '') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Category name cannot be empty'
      });
      return;
    }

    // Проверка на циклическую зависимость (нельзя установить себя или своего потомка как родителя)
    if (parentId && parentId !== existingCategory.parentId) {
      // Проверяем что новый родитель не является потомком текущей категории
      const isDescendant = await checkIfDescendant(id, parentId);
      if (isDescendant || parentId === id) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Cannot set category as its own parent or descendant'
        });
        return;
      }

      // Проверяем что родитель существует и принадлежит пользователю
      const parentCategory = await prisma.kbCategory.findFirst({
        where: {
          id: parentId,
          userId,
        },
      });

      if (!parentCategory) {
        res.status(404).json({
          error: 'Parent category not found',
          message: 'Parent category does not exist or you do not have access'
        });
        return;
      }
    }

    const category = await prisma.kbCategory.update({
      where: { id },
      data: {
        name: name?.trim() || existingCategory.name,
        parentId: parentId !== undefined ? (parentId || null) : existingCategory.parentId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update category'
    });
  }
}

/**
 * DELETE /api/kb/categories/:id
 * Удалить категорию
 */
export async function deleteCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Проверяем что категория существует и принадлежит пользователю
    const category = await prisma.kbCategory.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        children: true,
      },
    });

    if (!category) {
      res.status(404).json({
        error: 'Category not found',
        message: 'Category does not exist or you do not have access'
      });
      return;
    }

    // Проверяем есть ли дочерние категории
    if (category.children.length > 0) {
      res.status(400).json({
        error: 'Cannot delete category',
        message: 'Category has child categories. Please delete or move them first.'
      });
      return;
    }

    await prisma.kbCategory.delete({
      where: { id },
    });

    res.json({
      message: 'Category deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete category'
    });
  }
}

/**
 * Вспомогательная функция для проверки является ли потенциальный родитель потомком текущей категории
 */
async function checkIfDescendant(categoryId: string, potentialDescendantId: string): Promise<boolean> {
  const category = await prisma.kbCategory.findUnique({
    where: { id: potentialDescendantId },
    include: {
      children: true,
    },
  });

  if (!category) return false;

  // Проверяем прямых потомков
  if (category.children.some(child => child.id === categoryId)) {
    return true;
  }

  // Рекурсивно проверяем потомков
  for (const child of category.children) {
    const isDescendant = await checkIfDescendant(categoryId, child.id);
    if (isDescendant) return true;
  }

  return false;
}
