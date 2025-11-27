import apiClient from './apiClient';

export interface AgentDocument {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl: string | null;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
}

/**
 * Получить все документы агента
 */
export async function getAgentDocuments(agentId: string): Promise<AgentDocument[]> {
  const response = await apiClient.get<AgentDocument[]>(`/agents/${agentId}/documents`);
  return response.data;
}

/**
 * Загрузить документ для агента
 */
export async function uploadAgentDocument(agentId: string, file: File): Promise<AgentDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<AgentDocument>(`/agents/${agentId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Обновить документ (включить/выключить)
 */
export async function updateAgentDocument(
  agentId: string,
  documentId: string,
  data: { isEnabled?: boolean; description?: string }
): Promise<AgentDocument> {
  const response = await apiClient.patch<AgentDocument>(`/agents/${agentId}/documents/${documentId}`, data);
  return response.data;
}

/**
 * Удалить документ
 */
export async function deleteAgentDocument(agentId: string, documentId: string): Promise<void> {
  await apiClient.delete(`/agents/${agentId}/documents/${documentId}`);
}

/**
 * Включить/выключить все документы
 */
export async function toggleAllAgentDocuments(agentId: string, isEnabled: boolean): Promise<void> {
  await apiClient.patch(`/agents/${agentId}/documents-toggle-all`, { isEnabled });
}

/**
 * Получить URL для скачивания/просмотра документа
 */
export function getDocumentFileUrl(agentId: string, documentId: string): string {
  return `${apiClient.defaults.baseURL}/agents/${agentId}/documents/file/${documentId}`;
}

/**
 * Получить полный URL миниатюры
 */
export function getThumbnailFullUrl(thumbnailUrl: string | null): string | null {
  if (!thumbnailUrl) return null;
  return `${apiClient.defaults.baseURL}${thumbnailUrl}`;
}

/**
 * Форматировать размер файла
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Получить иконку для типа файла
 */
export function getFileTypeIcon(fileType: string): string {
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    txt: '📃',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
  };
  return icons[fileType.toLowerCase()] || '📁';
}
