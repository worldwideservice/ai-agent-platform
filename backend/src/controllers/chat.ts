import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma, pool } from '../config/database';
import { chatCompletion, ChatMessage } from '../services/openrouter.service';
import { getInstructionsForCurrentStage, buildEnhancedSystemPrompt } from '../services/pipeline.service';
import { getRelevantKnowledge, buildKnowledgeContext } from '../services/knowledge-base.service';
import { evaluateTriggerConditions, TriggerCondition } from '../services/ai-trigger.service';
import { executeTriggerActions } from '../services/trigger-executor.service';
import { getAgentRoleKnowledge } from '../services/training.service';
import { systemNotifications } from '../services/system-notifications.service';
import { canUseResponse, checkAndResetMonthlyLimits } from '../services/plan-limits.service';

/**
 * POST /api/chat/message
 * Отправить сообщение агенту и получить ответ
 */
export const sendChatMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { agentId, message, history, pipelineId, stageId } = req.body;

    // Валидация
    if (!agentId || !message) {
      return res.status(400).json({ message: 'Agent ID and message are required' });
    }

    // Получаем агента
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Проверяем что агент принадлежит пользователю
    if (agent.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Проверяем и сбрасываем месячные лимиты если нужно
    await checkAndResetMonthlyLimits(userId);

    // Проверяем лимит ответов ДО генерации
    const responseLimit = await canUseResponse(userId);
    if (!responseLimit.allowed) {
      return res.status(403).json({
        error: 'Plan limit reached',
        message: responseLimit.message || 'Достигнут лимит ответов для вашего тарифа',
        current: responseLimit.current,
        limit: responseLimit.limit,
      });
    }

    // Получаем расширенные настройки агента
    const advancedSettings = await prisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });

    // Получаем контекстно-зависимые инструкции для текущего этапа (если они есть)
    const stageInstructions = getInstructionsForCurrentStage(
      agent.pipelineSettings,
      pipelineId || null,
      stageId || null
    );

    // Получаем релевантные статьи из базы знаний (если БЗ настроена)
    let knowledgeContext: string | null = null;
    if (agent.kbSettings) {
      try {
        const knowledgeArticles = await getRelevantKnowledge(
          pool,
          userId,
          agent.kbSettings,
          message,
          3 // Максимум 3 релевантные статьи
        );
        knowledgeContext = buildKnowledgeContext(knowledgeArticles);

        if (knowledgeContext) {
          console.log(`📚 Using ${knowledgeArticles.length} knowledge base articles for context`);
        }
      } catch (error: any) {
        console.error('Error fetching knowledge base:', error);
        // Уведомляем пользователя об ошибке базы знаний
        await systemNotifications.knowledgeBaseError(userId, agent.name, error.message || 'Неизвестная ошибка');
        // Продолжаем без БЗ если произошла ошибка
      }
    }

    // Получаем знания из роли (методологии продаж, техники)
    let roleKnowledge: string | null = null;
    if (agent.trainingRoleId) {
      try {
        roleKnowledge = await getAgentRoleKnowledge(agent.trainingRoleId, userId);
        if (roleKnowledge) {
          console.log(`📖 Using role knowledge (${roleKnowledge.length} chars)`);
        }
      } catch (error) {
        console.error('Error fetching role knowledge:', error);
      }
    }

    // Формируем расширенный системный промпт с контекстом текущего этапа и базой знаний
    const systemPrompt = buildEnhancedSystemPrompt(
      roleKnowledge,
      agent.systemInstructions,
      stageInstructions,
      knowledgeContext
    );

    // Логируем для дебага
    if (stageInstructions) {
      console.log(`🎯 Using context-aware instructions | Process: ${pipelineId} | Stage: ${stageId}`);
    }

    // Конвертируем историю из формата фронтенда в формат OpenRouter
    const messages: ChatMessage[] = [
      // Системное сообщение с инструкциями (базовые + инструкции этапа)
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Добавляем историю сообщений
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text || msg.content || '',
        });
      }
    }

    // Добавляем текущее сообщение пользователя
    messages.push({
      role: 'user',
      content: message,
    });

    // Используем модель из advanced settings если есть, иначе из agent
    const modelToUse = advancedSettings?.model || agent.model;

    // Отправляем запрос в OpenRouter
    const result = await chatCompletion({
      model: modelToUse,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Извлекаем ответ
    const response = result.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';

    // Логируем в ChatLog
    await prisma.chatLog.create({
      data: {
        agentId: agent.id,
        message,
        response,
        model: modelToUse,
        userId,
      },
    });

    // Обновляем счетчик использованных ответов и проверяем лимиты
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        responsesUsed: {
          increment: 1,
        },
      },
      select: {
        responsesUsed: true,
        responsesLimit: true,
      },
    });

    // Проверяем лимиты и отправляем уведомления
    if (updatedUser.responsesLimit > 0) {
      const percentage = Math.round((updatedUser.responsesUsed / updatedUser.responsesLimit) * 100);

      if (updatedUser.responsesUsed >= updatedUser.responsesLimit) {
        // Лимит исчерпан
        await systemNotifications.messageLimitExceeded(userId, updatedUser.responsesLimit);
      } else if (percentage >= 90 && percentage < 100) {
        // 90% использовано - критическое предупреждение
        await systemNotifications.messageLimitWarning(userId, updatedUser.responsesUsed, updatedUser.responsesLimit);
      } else if (percentage >= 80 && percentage < 90) {
        // 80% использовано - первое предупреждение (только если это ровно 80%)
        const prev = updatedUser.responsesUsed - 1;
        const prevPercentage = Math.round((prev / updatedUser.responsesLimit) * 100);
        if (prevPercentage < 80) {
          await systemNotifications.messageLimitWarning(userId, updatedUser.responsesUsed, updatedUser.responsesLimit);
        }
      }
    }

    // Оцениваем AI триггеры на основе сообщения пользователя
    let triggeredActions: string[] = [];
    try {
      console.log(`🔍 Looking for triggers for agent: ${agent.id}`);

      const triggers = await prisma.trigger.findMany({
        where: {
          agentId: agent.id,
          isActive: true,
        },
        include: {
          actions: {
            orderBy: { order: 'asc' },
          },
        },
      });

      console.log(`📋 Found ${triggers.length} active triggers`);

      if (triggers.length > 0) {
        // Формируем условия для AI оценки
        const triggerConditions: TriggerCondition[] = triggers.map(t => ({
          id: t.id,
          name: t.name,
          condition: t.condition,
        }));

        // Контекст предыдущих сообщений
        const conversationContext = history?.map((msg: any) =>
          `${msg.role === 'user' ? 'Клиент' : 'Агент'}: ${msg.text || msg.content}`
        ) || [];

        // Оцениваем триггеры через AI
        const evaluationResults = await evaluateTriggerConditions(
          message,
          conversationContext,
          triggerConditions,
          advancedSettings?.triggerEvaluationModel || 'openai/gpt-4o-mini'
        );

        console.log('🎯 Trigger evaluation results:', evaluationResults);

        // Выполняем действия для сработавших триггеров
        for (const result of evaluationResults) {
          if (result.matched) {
            console.log(`✅ Trigger matched: ${result.triggerName} (confidence: ${result.confidence})`);
            triggeredActions.push(result.triggerName);

            const trigger = triggers.find(t => t.id === result.triggerId);
            if (trigger) {
              // Парсим параметры действий
              const actionsWithParams = trigger.actions.map((a: any) => ({
                id: a.id,
                action: a.action,
                params: a.params ? JSON.parse(a.params) : {},
                order: a.order,
              }));

              // Выполняем действия триггера (без реального CRM для внутреннего чата)
              console.log(`🚀 Would execute ${actionsWithParams.length} actions for trigger: ${trigger.name}`);
              // TODO: для интеграции с реальным CRM передать integration и leadId
              // await executeTriggerActions(integration, actionsWithParams, { leadId, contactId });
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error evaluating triggers:', error);
      // Не прерываем ответ пользователю, просто логируем ошибку
    }

    return res.json({
      response,
      message: 'Message sent successfully',
      triggeredActions: triggeredActions.length > 0 ? triggeredActions : undefined,
    });
  } catch (error: any) {
    console.error('Error sending chat message:', error);

    // Уведомляем пользователя об ошибке AI модели
    if (userId) {
      const agentName = req.body.agentId ? 'Агент' : 'Неизвестный агент';
      await systemNotifications.aiModelError(userId, agentName, error.message || 'Не удалось обработать запрос');
    }

    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};
