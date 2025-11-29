/**
 * Document Delivery Service
 * Парсинг команд отправки документов из ответа агента
 * и подготовка документов для отправки клиенту
 */

import prisma from '../lib/prisma';
import { generatePublicDocumentUrl } from '../controllers/agent-documents';

export interface DocumentCommand {
  documentId: string;
  deliveryMethod: 'chat' | 'email';
}

export interface AttachedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface ParsedResponse {
  cleanText: string;
  documentCommands: DocumentCommand[];
}

/**
 * Парсит ответ агента и извлекает команды отправки документов
 * Формат команды: [SEND_DOC:ID:method]
 * Пример: [SEND_DOC:abc123:chat] или [SEND_DOC:abc123:email]
 */
export function parseDocumentCommands(response: string): ParsedResponse {
  const commands: DocumentCommand[] = [];

  // Регулярка для поиска команд [SEND_DOC:ID:method]
  const commandRegex = /\[SEND_DOC:([a-zA-Z0-9-]+):(chat|email)\]/gi;

  let match;
  while ((match = commandRegex.exec(response)) !== null) {
    commands.push({
      documentId: match[1],
      deliveryMethod: match[2] as 'chat' | 'email',
    });
  }

  // Убираем команды из текста
  const cleanText = response
    .replace(commandRegex, '')
    .replace(/\n{3,}/g, '\n\n') // Убираем лишние переносы строк
    .trim();

  return { cleanText, documentCommands: commands };
}

/**
 * Получает информацию о документах для прикрепления к ответу
 */
export async function getDocumentsForAttachment(
  documentIds: string[],
  agentId: string,
  baseUrl: string = process.env.BASE_URL || 'http://localhost:3001'
): Promise<AttachedDocument[]> {
  if (documentIds.length === 0) return [];

  // Получаем документы из БД
  const documents = await prisma.agentDocument.findMany({
    where: {
      id: { in: documentIds },
      agentId, // Проверяем что документы принадлежат этому агенту
      isEnabled: true,
    },
  });

  // Формируем результат с URL для скачивания
  return documents.map(doc => ({
    id: doc.id,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    downloadUrl: generatePublicDocumentUrl(doc.id, baseUrl),
    thumbnailUrl: doc.thumbnailKey
      ? `${baseUrl}/api/agents/${agentId}/documents/thumbnail/${doc.thumbnailKey}`
      : undefined,
  }));
}

/**
 * Обрабатывает ответ агента - парсит команды и получает документы
 */
export async function processAgentResponse(
  response: string,
  agentId: string,
  baseUrl?: string
): Promise<{
  cleanResponse: string;
  attachedDocuments: AttachedDocument[];
  emailDocuments: AttachedDocument[];
}> {
  // Парсим команды
  const { cleanText, documentCommands } = parseDocumentCommands(response);

  if (documentCommands.length === 0) {
    return {
      cleanResponse: response,
      attachedDocuments: [],
      emailDocuments: [],
    };
  }

  // Разделяем по методу доставки
  const chatDocIds = documentCommands
    .filter(c => c.deliveryMethod === 'chat')
    .map(c => c.documentId);

  const emailDocIds = documentCommands
    .filter(c => c.deliveryMethod === 'email')
    .map(c => c.documentId);

  // Получаем документы
  const [attachedDocuments, emailDocuments] = await Promise.all([
    getDocumentsForAttachment(chatDocIds, agentId, baseUrl),
    getDocumentsForAttachment(emailDocIds, agentId, baseUrl),
  ]);

  console.log(`📎 Parsed ${documentCommands.length} document commands: ${attachedDocuments.length} for chat, ${emailDocuments.length} for email`);

  return {
    cleanResponse: cleanText,
    attachedDocuments,
    emailDocuments,
  };
}

/**
 * Форматирует размер файла в читаемый вид
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
