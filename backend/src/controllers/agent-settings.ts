import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import realPrisma from '../lib/prisma';

/**
 * GET /api/agents/:agentId/advanced-settings
 * Получить расширенные настройки агента
 */
export const getAdvancedSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ищем настройки
    let settings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await realPrisma.agentAdvancedSettings.create({
        data: {
          agentId,
          model: 'OpenAI GPT-4.1',
          autoDetectLanguage: false,
          responseLanguage: '',
          scheduleEnabled: false,
          responseDelaySeconds: 45,
          // Memory & Context defaults
          memoryEnabled: true,
          graphEnabled: true,
          contextWindow: 20,
          semanticSearchEnabled: true,
          // Internal AI Models defaults
          factExtractionModel: 'openai/gpt-4o-mini',
          triggerEvaluationModel: 'openai/gpt-4o-mini',
          chainMessageModel: 'openai/gpt-4o-mini',
          emailGenerationModel: 'openai/gpt-4o-mini',
          instructionParsingModel: 'openai/gpt-4o-mini',
          kbAnalysisModel: 'anthropic/claude-3.5-sonnet',
        },
      });
    }

    return res.json(settings);
  } catch (error: any) {
    console.error('Error fetching advanced settings:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/agents/:agentId/advanced-settings
 * Обновить расширенные настройки агента
 */
export const updateAdvancedSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { agentId } = req.params;
    const {
      model,
      autoDetectLanguage,
      responseLanguage,
      scheduleEnabled,
      scheduleData,
      responseDelaySeconds,
      // Memory & Context Settings
      memoryEnabled,
      graphEnabled,
      contextWindow,
      semanticSearchEnabled,
      // Internal AI Models Settings
      factExtractionModel,
      triggerEvaluationModel,
      chainMessageModel,
      emailGenerationModel,
      instructionParsingModel,
      kbAnalysisModel,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Проверяем что агент принадлежит пользователю
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ищем существующие настройки
    const existingSettings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    let settings;

    if (existingSettings) {
      // Обновляем существующие
      settings = await realPrisma.agentAdvancedSettings.update({
        where: { agentId },
        data: {
          model: model ?? existingSettings.model,
          autoDetectLanguage: autoDetectLanguage ?? existingSettings.autoDetectLanguage,
          responseLanguage: responseLanguage ?? existingSettings.responseLanguage,
          scheduleEnabled: scheduleEnabled ?? existingSettings.scheduleEnabled,
          scheduleData: scheduleData !== undefined ? JSON.stringify(scheduleData) : existingSettings.scheduleData,
          responseDelaySeconds: responseDelaySeconds ?? existingSettings.responseDelaySeconds,
          // Memory & Context Settings
          memoryEnabled: memoryEnabled ?? existingSettings.memoryEnabled,
          graphEnabled: graphEnabled ?? existingSettings.graphEnabled,
          contextWindow: contextWindow ?? existingSettings.contextWindow,
          semanticSearchEnabled: semanticSearchEnabled ?? existingSettings.semanticSearchEnabled,
          // Internal AI Models Settings
          factExtractionModel: factExtractionModel ?? existingSettings.factExtractionModel,
          triggerEvaluationModel: triggerEvaluationModel ?? existingSettings.triggerEvaluationModel,
          chainMessageModel: chainMessageModel ?? existingSettings.chainMessageModel,
          emailGenerationModel: emailGenerationModel ?? existingSettings.emailGenerationModel,
          instructionParsingModel: instructionParsingModel ?? existingSettings.instructionParsingModel,
          kbAnalysisModel: kbAnalysisModel ?? existingSettings.kbAnalysisModel,
        },
      });
    } else {
      // Создаем новые
      settings = await realPrisma.agentAdvancedSettings.create({
        data: {
          agentId,
          model: model ?? 'OpenAI GPT-4.1',
          autoDetectLanguage: autoDetectLanguage ?? false,
          responseLanguage: responseLanguage ?? '',
          scheduleEnabled: scheduleEnabled ?? false,
          scheduleData: scheduleData ? JSON.stringify(scheduleData) : null,
          responseDelaySeconds: responseDelaySeconds ?? 45,
          // Memory & Context Settings
          memoryEnabled: memoryEnabled ?? true,
          graphEnabled: graphEnabled ?? true,
          contextWindow: contextWindow ?? 20,
          semanticSearchEnabled: semanticSearchEnabled ?? true,
          // Internal AI Models Settings
          factExtractionModel: factExtractionModel ?? 'openai/gpt-4o-mini',
          triggerEvaluationModel: triggerEvaluationModel ?? 'openai/gpt-4o-mini',
          chainMessageModel: chainMessageModel ?? 'openai/gpt-4o-mini',
          emailGenerationModel: emailGenerationModel ?? 'openai/gpt-4o-mini',
          instructionParsingModel: instructionParsingModel ?? 'openai/gpt-4o-mini',
          kbAnalysisModel: kbAnalysisModel ?? 'anthropic/claude-3.5-sonnet',
        },
      });
    }

    return res.json(settings);
  } catch (error: any) {
    console.error('Error updating advanced settings:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
