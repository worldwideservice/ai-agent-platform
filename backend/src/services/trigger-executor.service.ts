/**
 * Trigger Action Executor Service
 *
 * Executes trigger actions in Kommo CRM based on agent configuration
 */

import {
  changeLeadStage,
  changeLeadResponsible,
  changeContactResponsible,
  createTask,
  runSalesbot,
  addLeadTags,
  addContactTags,
  createLeadNote,
  createContactNote,
  sendChatMessage,
  sendChatFileMessage,
  sendEmail,
  getLeadContactEmail,
  fetchLeadById,
} from './kommo.service';
import { chatCompletion } from './openrouter.service';
import prisma from '../lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface TriggerActionParams {
  // change_stage
  stageId?: string;
  pipelineId?: string;
  // assign_user
  applyTo?: 'deal' | 'contact' | 'both';
  userId?: string;
  // create_task
  taskDescription?: string;
  taskUserId?: string;
  taskTypeId?: string;
  // run_salesbot
  salesbotId?: string;
  // add_deal_tags, add_contact_tags
  tags?: string[];
  // add_deal_note, add_contact_note
  noteText?: string;
  // send_message
  messageText?: string;
  // send_email (AI generates subject and body)
  emailInstructions?: string;  // Instructions for AI to generate email
  // send_webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: { key: string; value: string }[];
  webhookBodyType?: 'form' | 'json' | 'raw';
  webhookBody?: { key: string; value: string }[] | string;
  // send_kb_article
  articleId?: number;  // ID статьи KB для отправки
  channel?: 'chat' | 'email';  // Канал отправки
  // send_files
  fileUrls?: string[];  // URLs файлов для отправки
}

export interface TriggerAction {
  id: string;
  action: string;
  params?: TriggerActionParams;
}

export interface TriggerContext {
  integrationId: string;
  agentId?: string;
  leadId?: number;
  contactId?: number;
  chatId?: string;
  pipelineId?: number;
  // Email context
  emailFrom?: string;
  emailSubject?: string;
  // AI models
  emailGenerationModel?: string;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  actionType: string;
  message: string;
  data?: any;
  error?: string;
}

// ============================================================================
// Action Executor
// ============================================================================

/**
 * Execute a single trigger action
 */
export async function executeTriggerAction(
  action: TriggerAction,
  context: TriggerContext
): Promise<ActionResult> {
  const { integrationId, agentId, leadId, contactId, chatId, emailGenerationModel } = context;

  console.log(`🎯 Executing action: ${action.action}`, { actionId: action.id, params: action.params });

  try {
    switch (action.action) {
      // ---- Change Stage ----
      case 'change_stage': {
        if (!leadId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required', error: 'Missing leadId' };
        }
        if (!action.params?.stageId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Stage ID required', error: 'Missing stageId' };
        }

        const statusId = parseInt(action.params.stageId);
        const pipelineId = action.params.pipelineId ? parseInt(action.params.pipelineId) : undefined;

        const result = await changeLeadStage(integrationId, leadId, statusId, pipelineId);

        // Автоматическое примечание о смене этапа
        try {
          await createLeadNote(integrationId, leadId, `🤖 Агент изменил этап сделки`);
        } catch (e) {
          console.log('⚠️ Could not add stage change note');
        }

        return { success: true, actionId: action.id, actionType: action.action, message: 'Stage changed successfully', data: result };
      }

      // ---- Assign User ----
      case 'assign_user': {
        if (!action.params?.userId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'User ID required', error: 'Missing userId' };
        }

        const userId = parseInt(action.params.userId);
        const applyTo = action.params.applyTo || 'deal';
        const results: any[] = [];

        if ((applyTo === 'deal' || applyTo === 'both') && leadId) {
          const dealResult = await changeLeadResponsible(integrationId, leadId, userId);
          results.push({ type: 'deal', result: dealResult });
        }

        if ((applyTo === 'contact' || applyTo === 'both') && contactId) {
          const contactResult = await changeContactResponsible(integrationId, contactId, userId);
          results.push({ type: 'contact', result: contactResult });
        }

        return { success: true, actionId: action.id, actionType: action.action, message: 'Responsible user changed', data: results };
      }

      // ---- Stop Agents ----
      case 'stop_agents': {
        if (!agentId || !leadId) {
          console.log(`⏸️ Stop agents requested but missing agentId (${agentId}) or leadId (${leadId})`);
          return { success: false, actionId: action.id, actionType: action.action, message: 'Agent ID and Lead ID required', error: 'Missing agentId or leadId' };
        }

        try {
          // Создаём или обновляем запись о паузе агента для лида
          await prisma.agentPause.upsert({
            where: {
              agentId_leadId: {
                agentId,
                leadId,
              },
            },
            create: {
              agentId,
              integrationId,
              leadId,
              chatId,
              isPaused: true,
              reason: 'Остановлено через триггер',
            },
            update: {
              isPaused: true,
              pausedAt: new Date(),
              reason: 'Остановлено через триггер',
              resumeAt: null,
            },
          });
          console.log(`✅ Agent ${agentId} paused for lead ${leadId} (via trigger)`);
          return { success: true, actionId: action.id, actionType: action.action, message: 'Agents stopped for this chat' };
        } catch (error: any) {
          console.error('Error stopping agents:', error.message);
          return { success: false, actionId: action.id, actionType: action.action, message: 'Failed to stop agents', error: error.message };
        }
      }

      // ---- Create Task ----
      case 'create_task': {
        if (!leadId && !contactId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead or Contact ID required', error: 'Missing entity' };
        }

        const taskData = {
          text: action.params?.taskDescription || 'Задача от AI агента',
          complete_till: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
          entity_id: leadId || contactId!,
          entity_type: (leadId ? 'leads' : 'contacts') as 'leads' | 'contacts' | 'companies',
          responsible_user_id: action.params?.taskUserId ? parseInt(action.params.taskUserId) : undefined,
          task_type_id: action.params?.taskTypeId ? parseInt(action.params.taskTypeId) : undefined,
        };

        const result = await createTask(integrationId, taskData);
        return { success: true, actionId: action.id, actionType: action.action, message: 'Task created', data: result };
      }

      // ---- Run Salesbot ----
      case 'run_salesbot': {
        if (!leadId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required', error: 'Missing leadId' };
        }
        if (!action.params?.salesbotId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Salesbot ID required', error: 'Missing salesbotId' };
        }

        const salesbotId = parseInt(action.params.salesbotId);
        const result = await runSalesbot(integrationId, salesbotId, leadId);
        return { success: true, actionId: action.id, actionType: action.action, message: 'Salesbot started', data: result };
      }

      // ---- Add Deal Tags ----
      case 'add_deal_tags': {
        if (!leadId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required', error: 'Missing leadId' };
        }
        if (!action.params?.tags || action.params.tags.length === 0) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Tags required', error: 'Missing tags' };
        }

        const result = await addLeadTags(integrationId, leadId, action.params.tags);
        return { success: true, actionId: action.id, actionType: action.action, message: `Added ${action.params.tags.length} tags to deal`, data: result };
      }

      // ---- Add Contact Tags ----
      case 'add_contact_tags': {
        if (!contactId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Contact ID required', error: 'Missing contactId' };
        }
        if (!action.params?.tags || action.params.tags.length === 0) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Tags required', error: 'Missing tags' };
        }

        const result = await addContactTags(integrationId, contactId, action.params.tags);
        return { success: true, actionId: action.id, actionType: action.action, message: `Added ${action.params.tags.length} tags to contact`, data: result };
      }

      // ---- Add Deal Note ----
      case 'add_deal_note': {
        if (!leadId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required', error: 'Missing leadId' };
        }
        if (!action.params?.noteText) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Note text required', error: 'Missing noteText' };
        }

        const result = await createLeadNote(integrationId, leadId, action.params.noteText);
        return { success: true, actionId: action.id, actionType: action.action, message: 'Note added to deal', data: result };
      }

      // ---- Add Contact Note ----
      case 'add_contact_note': {
        if (!contactId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Contact ID required', error: 'Missing contactId' };
        }
        if (!action.params?.noteText) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Note text required', error: 'Missing noteText' };
        }

        const result = await createContactNote(integrationId, contactId, action.params.noteText);
        return { success: true, actionId: action.id, actionType: action.action, message: 'Note added to contact', data: result };
      }

      // ---- Send Message ----
      case 'send_message': {
        if (!chatId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Chat ID required', error: 'Missing chatId' };
        }
        if (!action.params?.messageText) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Message text required', error: 'Missing messageText' };
        }

        const result = await sendChatMessage(integrationId, chatId, action.params.messageText);
        return { success: true, actionId: action.id, actionType: action.action, message: 'Message sent', data: result };
      }

      // ---- Send Email (AI-generated) ----
      case 'send_email': {
        if (!leadId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required', error: 'Missing leadId' };
        }
        if (!action.params?.emailInstructions) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Email instructions required', error: 'Missing emailInstructions' };
        }

        // Get contact email from lead
        console.log(`📧 Getting contact email from lead ${leadId}...`);
        const emailTo = await getLeadContactEmail(integrationId, leadId);
        if (!emailTo) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Contact has no email address', error: 'No contact email found' };
        }
        console.log(`✅ Found contact email: ${emailTo}`);

        // Fetch lead details for context
        let leadContext = '';
        try {
          const lead = await fetchLeadById(integrationId, leadId);
          leadContext = `Сделка: "${lead.name}"`;
        } catch (e) {
          console.log('⚠️ Could not fetch lead details for context');
        }

        // Generate email content with AI
        console.log(`🤖 Generating email content with AI...`);
        const aiPrompt = `Ты - помощник для написания деловых писем на русском языке.

Инструкции пользователя: ${action.params.emailInstructions}
${leadContext ? `Контекст: ${leadContext}` : ''}

Сгенерируй профессиональное письмо. Ответь в формате JSON:
{
  "subject": "Тема письма",
  "body": "Текст письма"
}

Важно:
- Пиши кратко и по делу
- Используй деловой стиль
- Не используй HTML, только plain text
- Подпись: "С уважением, World Wide Services"`;

        const aiResponse = await chatCompletion({
          model: emailGenerationModel || 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.7,
          max_tokens: 500,
        });

        const aiContent = aiResponse.choices[0]?.message?.content || '';
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Failed to generate email', error: 'AI response parsing failed' };
        }

        const emailData = JSON.parse(jsonMatch[0]);
        const emailSubject = emailData.subject;
        const emailBody = emailData.body;

        console.log(`✅ AI generated email: "${emailSubject}"`);

        const result = await sendEmail(integrationId, {
          entityId: leadId,
          entityType: 'leads',
          to: emailTo,
          subject: emailSubject,
          text: emailBody,
        });

        // Автоматическое примечание об отправке email
        try {
          await createLeadNote(integrationId, leadId, `🤖 Агент отправил email: "${emailSubject}"`);
        } catch (e) {
          console.log('⚠️ Could not add email note');
        }

        return { success: true, actionId: action.id, actionType: action.action, message: `Email sent to ${emailTo}`, data: result };
      }

      // ---- Send Webhook ----
      case 'send_webhook': {
        if (!action.params?.webhookUrl) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Webhook URL required', error: 'Missing webhookUrl' };
        }

        const method = action.params.webhookMethod || 'POST';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add custom headers
        if (action.params.webhookHeaders) {
          for (const header of action.params.webhookHeaders) {
            if (header.key && header.value) {
              headers[header.key] = header.value;
            }
          }
        }

        // Build body
        let body: string | undefined;
        if (method !== 'GET') {
          if (action.params.webhookBodyType === 'raw' && typeof action.params.webhookBody === 'string') {
            body = action.params.webhookBody;
          } else if (Array.isArray(action.params.webhookBody)) {
            const bodyObj: Record<string, string> = {};
            for (const item of action.params.webhookBody) {
              if (item.key && item.value) {
                bodyObj[item.key] = item.value;
              }
            }
            body = JSON.stringify(bodyObj);
          } else {
            // Default: send context data
            body = JSON.stringify({
              leadId,
              contactId,
              chatId,
              timestamp: new Date().toISOString(),
            });
          }
        }

        const response = await fetch(action.params.webhookUrl, {
          method,
          headers,
          body,
        });

        const responseText = await response.text();
        return {
          success: response.ok,
          actionId: action.id,
          actionType: action.action,
          message: response.ok ? 'Webhook sent successfully' : `Webhook failed: ${response.status}`,
          data: { status: response.status, response: responseText },
        };
      }

      // ---- Send Files ----
      case 'send_files': {
        if (!action.params?.fileUrls || !Array.isArray(action.params.fileUrls) || action.params.fileUrls.length === 0) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'File URLs required', error: 'Missing fileUrls' };
        }
        if (!chatId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Chat ID required for sending files', error: 'Missing chatId' };
        }

        const sentFiles: string[] = [];
        const failedFiles: string[] = [];

        for (const fileUrl of action.params.fileUrls) {
          try {
            const fileName = fileUrl.split('/').pop() || 'file';
            await sendChatFileMessage(integrationId, chatId, fileUrl, fileName, 0, 'application/octet-stream');
            console.log(`✅ File sent to chat: ${fileName}`);
            sentFiles.push(fileName);
          } catch (error: any) {
            console.error(`❌ Error sending file ${fileUrl}:`, error.message);
            failedFiles.push(fileUrl);
          }
        }

        if (failedFiles.length === 0) {
          return { success: true, actionId: action.id, actionType: action.action, message: `Files sent successfully: ${sentFiles.join(', ')}` };
        } else if (sentFiles.length > 0) {
          return { success: true, actionId: action.id, actionType: action.action, message: `Partially sent. Success: ${sentFiles.join(', ')}. Failed: ${failedFiles.length}` };
        } else {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Failed to send all files', error: 'All files failed' };
        }
      }

      // ---- Send KB Article ----
      case 'send_kb_article': {
        if (!action.params?.articleId) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Article ID required', error: 'Missing articleId' };
        }

        const channel = action.params.channel || 'chat';

        // Получаем статью из базы знаний
        console.log(`📚 Fetching KB article ${action.params.articleId}...`);
        const article = await prisma.kbArticle.findUnique({
          where: { id: action.params.articleId },
        });

        if (!article) {
          return { success: false, actionId: action.id, actionType: action.action, message: 'Article not found', error: 'Article not found in KB' };
        }

        console.log(`✅ Found article: "${article.title}"`);

        // Отправляем содержимое статьи
        if (channel === 'chat') {
          if (!chatId) {
            return { success: false, actionId: action.id, actionType: action.action, message: 'Chat ID required for chat channel', error: 'Missing chatId' };
          }

          // Форматируем содержимое для отправки в чат
          const chatMessage = `📄 *${article.title}*\n\n${article.content}`;
          const result = await sendChatMessage(integrationId, chatId, chatMessage);

          // Автоматическое примечание об отправке статьи
          if (leadId) {
            try {
              await createLeadNote(integrationId, leadId, `🤖 Агент отправил: "${article.title}"`);
            } catch (e) {
              console.log('⚠️ Could not add article note');
            }
          }

          return { success: true, actionId: action.id, actionType: action.action, message: `Article "${article.title}" sent to chat`, data: result };
        } else if (channel === 'email') {
          if (!leadId) {
            return { success: false, actionId: action.id, actionType: action.action, message: 'Lead ID required for email', error: 'Missing leadId' };
          }

          // Получаем email контакта
          const emailTo = await getLeadContactEmail(integrationId, leadId);
          if (!emailTo) {
            return { success: false, actionId: action.id, actionType: action.action, message: 'Contact has no email address', error: 'No contact email found' };
          }

          // Отправляем статью по email
          const result = await sendEmail(integrationId, {
            entityId: leadId,
            entityType: 'leads',
            to: emailTo,
            subject: article.title,
            text: article.content,
          });

          // Автоматическое примечание об отправке статьи по email
          try {
            await createLeadNote(integrationId, leadId, `🤖 Агент отправил по email: "${article.title}"`);
          } catch (e) {
            console.log('⚠️ Could not add article email note');
          }

          return { success: true, actionId: action.id, actionType: action.action, message: `Article "${article.title}" sent to ${emailTo}`, data: result };
        }

        return { success: false, actionId: action.id, actionType: action.action, message: `Unknown channel: ${channel}`, error: 'Invalid channel' };
      }

      default:
        return { success: false, actionId: action.id, actionType: action.action, message: `Unknown action type: ${action.action}`, error: 'Unknown action' };
    }
  } catch (error: any) {
    console.error(`❌ Error executing action ${action.action}:`, error);
    return {
      success: false,
      actionId: action.id,
      actionType: action.action,
      message: `Action failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Execute multiple trigger actions in sequence
 */
export async function executeTriggerActions(
  actions: TriggerAction[],
  context: TriggerContext
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeTriggerAction(action, context);
    results.push(result);

    // Log result
    if (result.success) {
      console.log(`✅ Action ${action.action} completed: ${result.message}`);
    } else {
      console.error(`❌ Action ${action.action} failed: ${result.error}`);
    }
  }

  return results;
}
