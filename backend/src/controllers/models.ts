import { Request, Response } from 'express';
import { fetchModels } from '../services/openrouter.service';

/**
 * GET /api/models
 * Get all available LLM models from OpenRouter
 */
export const getModels = async (_req: Request, res: Response) => {
  try {
    const models = await fetchModels();

    // Sort models by popularity/provider
    const sortedModels = models.sort((a, b) => {
      // Prioritize popular providers
      const providerOrder = ['openai', 'anthropic', 'google', 'meta', 'mistral'];
      const aProvider = a.id.split('/')[0];
      const bProvider = b.id.split('/')[0];

      const aIndex = providerOrder.indexOf(aProvider);
      const bIndex = providerOrder.indexOf(bProvider);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return a.name.localeCompare(b.name);
    });

    return res.json({
      success: true,
      count: sortedModels.length,
      models: sortedModels,
    });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch models',
    });
  }
};
