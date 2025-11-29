/**
 * Training Service
 * Управляет источниками знаний и ролями для обучения агентов
 */

import { prisma } from '../config/database';
import { BUILT_IN_TRAINING_SOURCES, getBuiltInSourceById } from '../data/builtInTrainingSources';

// Unified types for both built-in and custom
export interface TrainingSource {
  id: string;
  name: string;
  author: string | null;
  description: string | null;
  category: string;
  content: string;
  isBuiltIn: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingRole {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  sourceIds: string[];
  isBuiltIn: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SOURCES
// ============================================================================

/**
 * Получить все источники (встроенные + пользовательские)
 * Если пользователь редактировал встроенный источник, возвращается его версия
 */
export async function getAllSources(userId: string): Promise<TrainingSource[]> {
  // Получаем все источники пользователя из БД (включая отредактированные built-in)
  const dbSources = await prisma.trainingSource.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  // Создаём Set ID-шников источников из БД
  const dbSourceIds = new Set(dbSources.map(s => s.id));

  // Встроенные источники (только те, которые НЕ были отредактированы пользователем)
  const builtInSources: TrainingSource[] = BUILT_IN_TRAINING_SOURCES
    .filter(source => !dbSourceIds.has(source.id))
    .map(source => ({
      id: source.id,
      name: source.name,
      author: source.author,
      description: source.description,
      category: source.category,
      content: source.content,
      isBuiltIn: true,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

  // Источники из БД
  const dbMapped: TrainingSource[] = dbSources.map(source => ({
    id: source.id,
    name: source.name,
    author: source.author,
    description: source.description,
    category: source.category,
    content: source.content,
    isBuiltIn: source.isBuiltIn,
    userId: source.userId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  }));

  // Разделяем на built-in (из БД) и custom
  const editedBuiltIn = dbMapped.filter(s => s.isBuiltIn);
  const customSources = dbMapped.filter(s => !s.isBuiltIn);

  return [...builtInSources, ...editedBuiltIn, ...customSources];
}

/**
 * Получить источник по ID
 * Приоритет: отредактированная копия из БД > встроенный оригинал
 */
export async function getSourceById(id: string, userId: string): Promise<TrainingSource | null> {
  // Для встроенных источников - БД имеет тип UUID, нельзя искать по строковому id
  // Поэтому для builtin- просто возвращаем из встроенных данных
  if (id.startsWith('builtin-')) {
    const builtIn = getBuiltInSourceById(id);
    if (builtIn) {
      return {
        id: builtIn.id,
        name: builtIn.name,
        author: builtIn.author,
        description: builtIn.description,
        category: builtIn.category,
        content: builtIn.content,
        isBuiltIn: true,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }

  // Для обычных UUID источников - только из БД
  const dbSource = await prisma.trainingSource.findFirst({
    where: { id, userId }
  });

  if (dbSource) {
    return {
      id: dbSource.id,
      name: dbSource.name,
      author: dbSource.author,
      description: dbSource.description,
      category: dbSource.category,
      content: dbSource.content,
      isBuiltIn: dbSource.isBuiltIn,
      userId: dbSource.userId,
      createdAt: dbSource.createdAt,
      updatedAt: dbSource.updatedAt
    };
  }

  return null;
}

/**
 * Создать пользовательский источник
 */
export async function createSource(
  userId: string,
  data: {
    name: string;
    author?: string;
    description?: string;
    category: string;
    content: string;
  }
): Promise<TrainingSource> {
  const source = await prisma.trainingSource.create({
    data: {
      name: data.name,
      author: data.author || null,
      description: data.description || null,
      category: data.category,
      content: data.content,
      isBuiltIn: false,
      userId
    }
  });

  return {
    id: source.id,
    name: source.name,
    author: source.author,
    description: source.description,
    category: source.category,
    content: source.content,
    isBuiltIn: source.isBuiltIn,
    userId: source.userId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

/**
 * Обновить источник (включая встроенные - создаёт копию в БД)
 */
export async function updateSource(
  id: string,
  userId: string,
  data: {
    name?: string;
    author?: string;
    description?: string;
    category?: string;
    content?: string;
  }
): Promise<TrainingSource | null> {
  // Для встроенных источников - создаём/обновляем копию в БД
  if (id.startsWith('builtin-')) {
    const builtIn = getBuiltInSourceById(id);
    if (!builtIn) return null;

    // Проверяем, есть ли уже копия в БД
    let existingCopy = await prisma.trainingSource.findFirst({
      where: { id, userId }
    });

    if (existingCopy) {
      // Обновляем существующую копию
      const source = await prisma.trainingSource.update({
        where: { id },
        data: {
          name: data.name ?? existingCopy.name,
          author: data.author ?? existingCopy.author,
          description: data.description ?? existingCopy.description,
          category: data.category ?? existingCopy.category,
          content: data.content ?? existingCopy.content
        }
      });

      return {
        id: source.id,
        name: source.name,
        author: source.author,
        description: source.description,
        category: source.category,
        content: source.content,
        isBuiltIn: true, // Всё ещё помечаем как built-in для UI
        userId: source.userId,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt
      };
    } else {
      // Создаём новую копию с тем же ID
      const source = await prisma.trainingSource.create({
        data: {
          id, // Сохраняем оригинальный builtin- ID
          name: data.name ?? builtIn.name,
          author: data.author ?? builtIn.author,
          description: data.description ?? builtIn.description,
          category: data.category ?? builtIn.category,
          content: data.content ?? builtIn.content,
          isBuiltIn: true, // Помечаем как built-in
          userId
        }
      });

      return {
        id: source.id,
        name: source.name,
        author: source.author,
        description: source.description,
        category: source.category,
        content: source.content,
        isBuiltIn: true,
        userId: source.userId,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt
      };
    }
  }

  // Обычный пользовательский источник
  const source = await prisma.trainingSource.update({
    where: { id },
    data: {
      name: data.name,
      author: data.author,
      description: data.description,
      category: data.category,
      content: data.content
    }
  });

  return {
    id: source.id,
    name: source.name,
    author: source.author,
    description: source.description,
    category: source.category,
    content: source.content,
    isBuiltIn: source.isBuiltIn,
    userId: source.userId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

/**
 * Удалить пользовательский источник
 */
export async function deleteSource(id: string, _userId: string): Promise<void> {
  // Нельзя удалять встроенные
  if (id.startsWith('builtin-')) {
    throw new Error('Cannot delete built-in sources');
  }

  await prisma.trainingSource.delete({
    where: { id }
  });
}

// ============================================================================
// ROLES
// ============================================================================

/**
 * Получить все роли (только пользовательские)
 */
export async function getAllRoles(userId: string): Promise<TrainingRole[]> {
  const roles = await prisma.trainingRole.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return roles.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description,
    icon: role.icon,
    sourceIds: JSON.parse(role.sourceIds) as string[],
    isBuiltIn: false,
    userId: role.userId,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  }));
}

/**
 * Получить роль по ID
 */
export async function getRoleById(id: string, userId: string): Promise<TrainingRole | null> {
  const role = await prisma.trainingRole.findFirst({
    where: { id, userId }
  });

  if (!role) return null;

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    icon: role.icon,
    sourceIds: JSON.parse(role.sourceIds) as string[],
    isBuiltIn: false,
    userId: role.userId,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

/**
 * Создать пользовательскую роль
 */
export async function createRole(
  userId: string,
  data: {
    name: string;
    description?: string;
    icon?: string;
    sourceIds: string[];
  }
): Promise<TrainingRole> {
  const role = await prisma.trainingRole.create({
    data: {
      name: data.name,
      description: data.description || null,
      icon: data.icon || 'briefcase',
      sourceIds: JSON.stringify(data.sourceIds),
      isBuiltIn: false,
      userId
    }
  });

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    icon: role.icon,
    sourceIds: JSON.parse(role.sourceIds) as string[],
    isBuiltIn: role.isBuiltIn,
    userId: role.userId,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

/**
 * Обновить пользовательскую роль
 */
export async function updateRole(
  id: string,
  _userId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    sourceIds?: string[];
  }
): Promise<TrainingRole | null> {
  // Нельзя редактировать встроенные
  if (id.startsWith('builtin-')) {
    throw new Error('Cannot edit built-in roles');
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.sourceIds !== undefined) updateData.sourceIds = JSON.stringify(data.sourceIds);

  const role = await prisma.trainingRole.update({
    where: { id },
    data: updateData
  });

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    icon: role.icon,
    sourceIds: JSON.parse(role.sourceIds) as string[],
    isBuiltIn: role.isBuiltIn,
    userId: role.userId,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

/**
 * Удалить пользовательскую роль
 */
export async function deleteRole(id: string, _userId: string): Promise<void> {
  // Нельзя удалять встроенные
  if (id.startsWith('builtin-')) {
    throw new Error('Cannot delete built-in roles');
  }

  await prisma.trainingRole.delete({
    where: { id }
  });
}

// ============================================================================
// KNOWLEDGE COMPILATION
// ============================================================================

/**
 * Скомпилировать знания роли в единый текст для промпта
 */
export async function compileRoleKnowledge(roleId: string, userId: string): Promise<string | null> {
  const role = await getRoleById(roleId, userId);
  if (!role) return null;

  const sourceContents: string[] = [];

  for (const sourceId of role.sourceIds) {
    const source = await getSourceById(sourceId, userId);
    if (source) {
      sourceContents.push(source.content);
    }
  }

  if (sourceContents.length === 0) return null;

  return sourceContents.join('\n\n---\n\n');
}

/**
 * Получить скомпилированные знания для агента по его trainingRoleId
 */
export async function getAgentRoleKnowledge(trainingRoleId: string | null, userId: string): Promise<string | null> {
  if (!trainingRoleId) return null;
  return compileRoleKnowledge(trainingRoleId, userId);
}
