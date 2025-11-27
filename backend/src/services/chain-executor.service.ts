/**
 * Chain Executor Service
 * Сервис для выполнения цепочек автоматизации
 */

import { prisma } from '../config/database';
import realPrisma from '../lib/prisma';
import { sendChatMessage, sendEmail, getLeadContactEmail } from './kommo.service';
import { chatCompletion, ChatMessage } from './openrouter.service';

// Типы для расписания
interface ChainScheduleDay {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

// Маппинг дней недели: JS dayOfWeek (0=воскресенье) -> номер в БД (0=понедельник)
const JS_TO_DB_DAY: Record<number, number> = {
  0: 6, // Воскресенье
  1: 0, // Понедельник
  2: 1, // Вторник
  3: 2, // Среда
  4: 3, // Четверг
  5: 4, // Пятница
  6: 5, // Суббота
};

/**
 * Проверяет, работает ли цепочка в текущее время по расписанию
 */
function isChainWorkingNow(schedules: ChainScheduleDay[]): boolean {
  if (!schedules || schedules.length === 0) return true;

  // Получаем киевское время
  const now = new Date();
  const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));

  const jsDayOfWeek = kyivTime.getDay(); // 0-6 (воскресенье-суббота)
  const dbDayOfWeek = JS_TO_DB_DAY[jsDayOfWeek]; // конвертируем в формат БД

  // Форматируем время как HH:MM
  const hours = kyivTime.getHours().toString().padStart(2, '0');
  const minutes = kyivTime.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  // Ищем текущий день в расписании
  const todaySchedule = schedules.find(s => s.dayOfWeek === dbDayOfWeek);

  if (!todaySchedule) {
    console.log(`⏰ Chain schedule: Day ${dbDayOfWeek} not found, allowing`);
    return true;
  }

  if (!todaySchedule.enabled) {
    console.log(`⏰ Chain schedule: Day ${dbDayOfWeek} is disabled`);
    return false;
  }

  const isWithinHours = currentTimeStr >= todaySchedule.startTime && currentTimeStr <= todaySchedule.endTime;

  if (!isWithinHours) {
    console.log(`⏰ Chain schedule: Time ${currentTimeStr} is outside ${todaySchedule.startTime}-${todaySchedule.endTime}`);
    return false;
  }

  console.log(`⏰ Chain schedule: OK (day ${dbDayOfWeek}, time ${currentTimeStr})`);
  return true;
}

/**
 * Проверяет, подходит ли сделка под условия цепочки
 */
function matchesChainConditions(
  chain: any,
  stageId: string
): boolean {
  // Если conditionType = 'all', то подходят все этапы
  if (chain.conditionType === 'all') {
    return true;
  }

  // Если conditionType = 'specific', проверяем что этап в списке
  if (chain.conditionType === 'specific' && chain.conditions) {
    const stageIds = chain.conditions.map((c: any) => c.stageId);
    return stageIds.includes(stageId);
  }

  return false;
}

/**
 * Выполняет действие шага цепочки
 */
async function executeStepAction(
  action: any,
  context: {
    integrationId: string;
    leadId: number;
    chatId?: string;
    agentId: string;
    chainMessageModel?: string;
  }
): Promise<void> {
  const { integrationId, leadId, chatId, agentId, chainMessageModel } = context;

  console.log(`🔧 Executing action: ${action.actionType}`);

  switch (action.actionType) {
    case 'ai_message':
      // Генерируем AI сообщение по инструкции
      if (action.instruction && chatId) {
        try {
          const messages: ChatMessage[] = [
            {
              role: 'system',
              content: `Ты AI ассистент. Напиши сообщение клиенту согласно инструкции. Отвечай кратко и по делу.`,
            },
            {
              role: 'user',
              content: `Инструкция: ${action.instruction}`,
            },
          ];

          const result = await chatCompletion({
            model: chainMessageModel || 'openai/gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 500,
          });

          const response = result.choices[0]?.message?.content;
          if (response) {
            await sendChatMessage(integrationId, chatId, response);
            console.log(`✅ AI message sent to chat`);
          }
        } catch (error) {
          console.error('Error sending AI message:', error);
        }
      }
      break;

    case 'send_message':
      // Отправляем статичное сообщение
      if (action.params?.messageText && chatId) {
        try {
          await sendChatMessage(integrationId, chatId, action.params.messageText);
          console.log(`✅ Message sent to chat`);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
      break;

    case 'send_email':
      // Отправляем email
      if (action.params?.emailSubject && action.params?.emailBody) {
        try {
          const emailTo = await getLeadContactEmail(integrationId, leadId);
          if (emailTo) {
            await sendEmail(integrationId, {
              entityId: leadId,
              entityType: 'leads',
              to: emailTo,
              subject: action.params.emailSubject,
              text: action.params.emailBody,
            });
            console.log(`✅ Email sent to ${emailTo}`);
          }
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }
      break;

    case 'change_stage':
      // Смена этапа сделки - требует интеграции с Kommo API
      console.log(`⚠️ Change stage action not implemented yet`);
      break;

    case 'add_task':
      // Создание задачи - требует интеграции с Kommo API
      console.log(`⚠️ Add task action not implemented yet`);
      break;

    default:
      console.log(`⚠️ Unknown action type: ${action.actionType}`);
  }
}

/**
 * Запускает выполнение цепочки для сделки
 */
export async function executeChainForLead(
  chainId: string,
  context: {
    integrationId: string;
    leadId: number;
    stageId: string;
    chatId?: string;
    agentId: string;
  }
): Promise<void> {
  const { integrationId, leadId, stageId, agentId } = context;

  console.log(`\n🔗 [ChainExecutor] Starting chain ${chainId} for lead ${leadId}`);

  try {
    // Получаем расширенные настройки агента для модели AI-сообщений
    const advancedSettings = await realPrisma.agentAdvancedSettings.findUnique({
      where: { agentId },
    });
    const chainMessageModel = advancedSettings?.chainMessageModel || 'openai/gpt-4o-mini';

    // Получаем цепочку со всеми данными
    const chain = await prisma.chain.findUnique({
      where: { id: chainId },
      include: {
        steps: {
          include: {
            actions: {
              orderBy: { actionOrder: 'asc' },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
        schedules: true,
      },
    });

    if (!chain) {
      console.error(`❌ Chain ${chainId} not found`);
      return;
    }

    if (!chain.isActive) {
      console.log(`⚠️ Chain ${chainId} is not active, skipping`);
      return;
    }

    // Проверяем расписание
    if (!isChainWorkingNow(chain.schedules as ChainScheduleDay[])) {
      console.log(`⏰ Chain ${chainId} is outside working hours, skipping`);
      return;
    }

    // Проверяем лимит запусков
    if (chain.runLimit && chain.runLimit > 0) {
      const runCount = await realPrisma.chainRun.count({
        where: {
          chainId,
          leadId,
        },
      });

      if (runCount >= chain.runLimit) {
        console.log(`⚠️ Chain ${chainId} has reached run limit (${runCount}/${chain.runLimit}), skipping`);
        return;
      }
    }

    // Проверяем, нет ли уже активного запуска этой цепочки для лида
    const existingRun = await realPrisma.chainRun.findFirst({
      where: {
        chainId,
        leadId,
        status: 'running',
      },
    });

    if (existingRun) {
      console.log(`⚠️ Chain ${chainId} already running for lead ${leadId}, skipping`);
      return;
    }

    // Записываем запуск цепочки
    const chainRun = await realPrisma.chainRun.create({
      data: {
        chainId,
        integrationId,
        leadId,
        stageId,
        chatId: context.chatId,
        status: 'running',
      },
    });

    // Выполняем шаги по порядку
    for (const step of chain.steps) {
      console.log(`📍 Step ${step.stepOrder}: delay ${step.delayValue} ${step.delayUnit}`);

      // Вычисляем задержку в миллисекундах
      let delayMs = 0;
      switch (step.delayUnit) {
        case 'seconds':
          delayMs = step.delayValue * 1000;
          break;
        case 'minutes':
          delayMs = step.delayValue * 60 * 1000;
          break;
        case 'hours':
          delayMs = step.delayValue * 60 * 60 * 1000;
          break;
        case 'days':
          delayMs = step.delayValue * 24 * 60 * 60 * 1000;
          break;
      }

      // Для больших задержек (> 1 минуты) планируем отложенное выполнение
      if (delayMs > 60000) {
        // Сохраняем в очередь отложенных действий
        await realPrisma.scheduledChainStep.create({
          data: {
            chainRunId: chainRun.id,
            stepId: step.id,
            stepOrder: step.stepOrder,
            executeAt: new Date(Date.now() + delayMs),
            status: 'pending',
            context: JSON.stringify(context),
          },
        });
        console.log(`⏳ Step ${step.stepOrder} scheduled for ${new Date(Date.now() + delayMs).toISOString()}`);
        continue; // Следующие шаги тоже будут отложены
      }

      // Для маленьких задержек - ждем inline
      if (delayMs > 0) {
        console.log(`⏳ Waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Выполняем все действия шага
      for (const action of step.actions) {
        await executeStepAction(action, { ...context, chainMessageModel });
      }
    }

    // Обновляем статус запуска
    await realPrisma.chainRun.update({
      where: { id: chainRun.id },
      data: { status: 'completed' },
    });

    console.log(`✅ Chain ${chainId} completed for lead ${leadId}`);
  } catch (error: any) {
    console.error(`❌ [ChainExecutor] Error:`, error.message);
  }
}

/**
 * Проверяет и запускает цепочки для сделки на определенном этапе
 */
export async function checkAndExecuteChains(
  agentId: string,
  integrationId: string,
  leadId: number,
  stageId: string,
  chatId?: string
): Promise<void> {
  console.log(`\n🔍 [ChainExecutor] Checking chains for agent ${agentId}, stage ${stageId}`);

  try {
    // Получаем все активные цепочки агента
    const chains = await prisma.chain.findMany({
      where: {
        agentId,
        isActive: true,
      },
      include: {
        conditions: true,
        schedules: true,
      },
    });

    console.log(`📋 Found ${chains.length} active chains`);

    for (const chain of chains) {
      // Проверяем условия
      if (!matchesChainConditions(chain, stageId)) {
        console.log(`⏭️ Chain "${chain.name}" doesn't match stage ${stageId}`);
        continue;
      }

      // Проверяем расписание
      if (!isChainWorkingNow(chain.schedules as ChainScheduleDay[])) {
        console.log(`⏰ Chain "${chain.name}" is outside schedule`);
        continue;
      }

      console.log(`✅ Chain "${chain.name}" matches! Executing...`);

      // Запускаем цепочку асинхронно (не блокируем основной поток)
      executeChainForLead(chain.id, {
        integrationId,
        leadId,
        stageId,
        chatId,
        agentId,
      }).catch(err => console.error(`Chain execution error:`, err));
    }
  } catch (error: any) {
    console.error(`❌ [ChainExecutor] Error checking chains:`, error.message);
  }
}

/**
 * Обрабатывает отложенные шаги цепочек
 * Должен вызываться периодически (cron) для выполнения запланированных действий
 */
export async function processScheduledChainSteps(): Promise<void> {
  console.log(`\n⏰ [ChainExecutor] Processing scheduled chain steps...`);

  try {
    // Получаем шаги, которые пора выполнить
    const pendingSteps = await realPrisma.scheduledChainStep.findMany({
      where: {
        status: 'pending',
        executeAt: { lte: new Date() },
      },
      include: {
        chainRun: true,
      },
      orderBy: { executeAt: 'asc' },
      take: 50, // Лимит для безопасности
    });

    if (pendingSteps.length === 0) {
      console.log(`⏰ No scheduled steps to execute`);
      return;
    }

    console.log(`⏰ Found ${pendingSteps.length} scheduled step(s) to execute`);

    for (const scheduledStep of pendingSteps) {
      // Проверяем что ChainRun еще активен
      if (scheduledStep.chainRun.status !== 'running') {
        console.log(`⏭️ Chain run ${scheduledStep.chainRunId} is no longer running, skipping step`);
        await realPrisma.scheduledChainStep.update({
          where: { id: scheduledStep.id },
          data: { status: 'cancelled' },
        });
        continue;
      }

      try {
        // Парсим контекст
        const context = scheduledStep.context ? JSON.parse(scheduledStep.context) : {};

        // Получаем расширенные настройки агента для модели AI-сообщений
        const advancedSettings = context.agentId
          ? await realPrisma.agentAdvancedSettings.findUnique({ where: { agentId: context.agentId } })
          : null;
        const chainMessageModel = advancedSettings?.chainMessageModel || 'openai/gpt-4o-mini';

        // Получаем шаг из базы
        const step = await prisma.chainStep.findUnique({
          where: { id: scheduledStep.stepId },
          include: {
            actions: {
              orderBy: { actionOrder: 'asc' },
            },
          },
        });

        if (!step) {
          console.error(`❌ Step ${scheduledStep.stepId} not found`);
          await realPrisma.scheduledChainStep.update({
            where: { id: scheduledStep.id },
            data: { status: 'failed', error: 'Step not found' },
          });
          continue;
        }

        // Проверяем расписание цепочки
        const chain = await prisma.chain.findUnique({
          where: { id: scheduledStep.chainRun.chainId },
          include: { schedules: true },
        });

        if (chain && !isChainWorkingNow(chain.schedules as ChainScheduleDay[])) {
          console.log(`⏰ Chain "${chain.name}" is outside working hours, rescheduling step`);
          // Переносим на следующее рабочее время (+ 1 час)
          await realPrisma.scheduledChainStep.update({
            where: { id: scheduledStep.id },
            data: {
              executeAt: new Date(Date.now() + 60 * 60 * 1000),
            },
          });
          continue;
        }

        console.log(`▶️ Executing scheduled step ${scheduledStep.stepOrder} for chain run ${scheduledStep.chainRunId}`);

        // Выполняем все действия шага
        for (const action of step.actions) {
          await executeStepAction(action, { ...context, chainMessageModel });
        }

        // Обновляем статус
        await realPrisma.scheduledChainStep.update({
          where: { id: scheduledStep.id },
          data: {
            status: 'executed',
            executedAt: new Date(),
          },
        });

        // Обновляем currentStep в chainRun
        await realPrisma.chainRun.update({
          where: { id: scheduledStep.chainRunId },
          data: { currentStep: scheduledStep.stepOrder },
        });

        console.log(`✅ Scheduled step ${scheduledStep.stepOrder} executed successfully`);

        // Проверяем есть ли следующие шаги
        const remainingSteps = await realPrisma.scheduledChainStep.count({
          where: {
            chainRunId: scheduledStep.chainRunId,
            status: 'pending',
          },
        });

        if (remainingSteps === 0) {
          // Все шаги выполнены - завершаем chain run
          await realPrisma.chainRun.update({
            where: { id: scheduledStep.chainRunId },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });
          console.log(`🏁 Chain run ${scheduledStep.chainRunId} completed`);
        }
      } catch (error: any) {
        console.error(`❌ Error executing scheduled step:`, error.message);
        await realPrisma.scheduledChainStep.update({
          where: { id: scheduledStep.id },
          data: {
            status: 'failed',
            error: error.message,
          },
        });
      }
    }

    console.log(`⏰ Scheduled steps processing complete`);
  } catch (error: any) {
    console.error(`❌ [ChainExecutor] Error processing scheduled steps:`, error.message);
  }
}

/**
 * Отменяет все активные цепочки для лида
 * Вызывается при смене этапа или других условиях отмены
 */
export async function cancelChainsForLead(
  leadId: number,
  reason: string = 'Stage changed'
): Promise<void> {
  console.log(`🚫 [ChainExecutor] Cancelling chains for lead ${leadId}: ${reason}`);

  try {
    // Находим все активные chain runs для лида
    const activeRuns = await realPrisma.chainRun.findMany({
      where: {
        leadId,
        status: 'running',
      },
    });

    if (activeRuns.length === 0) {
      console.log(`🚫 No active chains to cancel for lead ${leadId}`);
      return;
    }

    // Отменяем каждый run
    for (const run of activeRuns) {
      // Отменяем все pending шаги
      await realPrisma.scheduledChainStep.updateMany({
        where: {
          chainRunId: run.id,
          status: 'pending',
        },
        data: { status: 'cancelled' },
      });

      // Обновляем статус run
      await realPrisma.chainRun.update({
        where: { id: run.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      console.log(`🚫 Chain run ${run.id} cancelled: ${reason}`);
    }
  } catch (error: any) {
    console.error(`❌ Error cancelling chains:`, error.message);
  }
}

export default {
  executeChainForLead,
  checkAndExecuteChains,
  processScheduledChainSteps,
  cancelChainsForLead,
  isChainWorkingNow,
};
