/**
 * Training Controller
 * API для управления источниками знаний и ролями
 */

import { Response } from 'express';
import { AuthRequest } from '../types';
import * as trainingService from '../services/training.service';

// ============================================================================
// SOURCES
// ============================================================================

/**
 * GET /api/training/sources
 * Получить все источники знаний
 */
export async function getSources(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sources = await trainingService.getAllSources(userId);
    res.json(sources);
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ error: 'Failed to get sources' });
  }
}

/**
 * GET /api/training/sources/:id
 * Получить источник по ID
 */
export async function getSourceById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const source = await trainingService.getSourceById(id, userId);

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(source);
  } catch (error) {
    console.error('Error getting source:', error);
    res.status(500).json({ error: 'Failed to get source' });
  }
}

/**
 * POST /api/training/sources
 * Создать новый источник знаний
 */
export async function createSource(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, author, description, category, content } = req.body;

    if (!name || !category || !content) {
      return res.status(400).json({ error: 'Name, category and content are required' });
    }

    const source = await trainingService.createSource(userId, {
      name,
      author,
      description,
      category,
      content
    });

    res.status(201).json(source);
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({ error: 'Failed to create source' });
  }
}

/**
 * PUT /api/training/sources/:id
 * Обновить источник знаний
 */
export async function updateSource(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name, author, description, category, content } = req.body;

    const source = await trainingService.updateSource(id, userId, {
      name,
      author,
      description,
      category,
      content
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(source);
  } catch (error: any) {
    if (error.message === 'Cannot edit built-in sources') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error updating source:', error);
    res.status(500).json({ error: 'Failed to update source' });
  }
}

/**
 * DELETE /api/training/sources/:id
 * Удалить источник знаний
 */
export async function deleteSource(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await trainingService.deleteSource(id, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Cannot delete built-in sources') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
}

// ============================================================================
// ROLES
// ============================================================================

/**
 * GET /api/training/roles
 * Получить все роли
 */
export async function getRoles(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roles = await trainingService.getAllRoles(userId);
    res.json(roles);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
}

/**
 * GET /api/training/roles/:id
 * Получить роль по ID
 */
export async function getRoleById(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const role = await trainingService.getRoleById(id, userId);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Error getting role:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
}

/**
 * POST /api/training/roles
 * Создать новую роль
 */
export async function createRole(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, icon, sourceIds } = req.body;

    if (!name || !sourceIds || !Array.isArray(sourceIds)) {
      return res.status(400).json({ error: 'Name and sourceIds array are required' });
    }

    const role = await trainingService.createRole(userId, {
      name,
      description,
      icon,
      sourceIds
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
}

/**
 * PUT /api/training/roles/:id
 * Обновить роль
 */
export async function updateRole(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name, description, icon, sourceIds } = req.body;

    const role = await trainingService.updateRole(id, userId, {
      name,
      description,
      icon,
      sourceIds
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error: any) {
    if (error.message === 'Cannot edit built-in roles') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

/**
 * DELETE /api/training/roles/:id
 * Удалить роль
 */
export async function deleteRole(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await trainingService.deleteRole(id, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Cannot delete built-in roles') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
}

/**
 * GET /api/training/roles/:id/knowledge
 * Получить скомпилированные знания роли
 */
export async function getRoleKnowledge(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const knowledge = await trainingService.compileRoleKnowledge(id, userId);

    if (knowledge === null) {
      return res.status(404).json({ error: 'Role not found or no sources' });
    }

    res.json({ knowledge });
  } catch (error) {
    console.error('Error getting role knowledge:', error);
    res.status(500).json({ error: 'Failed to get role knowledge' });
  }
}
