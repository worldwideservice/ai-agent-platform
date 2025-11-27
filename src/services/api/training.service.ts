/**
 * Training Service - Frontend API
 * Управление источниками знаний и ролями
 */

import apiClient from './apiClient';

// Types
export interface TrainingSource {
  id: string;
  name: string;
  author: string | null;
  description: string | null;
  category: 'sales' | 'negotiations' | 'psychology' | 'methodology' | 'custom';
  content: string;
  isBuiltIn: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRole {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  sourceIds: string[];
  isBuiltIn: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSourceData {
  name: string;
  author?: string;
  description?: string;
  category: string;
  content: string;
}

export interface UpdateSourceData {
  name?: string;
  author?: string;
  description?: string;
  category?: string;
  content?: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  icon?: string;
  sourceIds: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  icon?: string;
  sourceIds?: string[];
}

// ============================================================================
// SOURCES API
// ============================================================================

/**
 * Получить все источники знаний
 */
export async function getSources(): Promise<TrainingSource[]> {
  const response = await apiClient.get<TrainingSource[]>('/training/sources');
  return response.data;
}

/**
 * Получить источник по ID
 */
export async function getSourceById(id: string): Promise<TrainingSource> {
  const response = await apiClient.get<TrainingSource>(`/training/sources/${id}`);
  return response.data;
}

/**
 * Создать новый источник
 */
export async function createSource(data: CreateSourceData): Promise<TrainingSource> {
  const response = await apiClient.post<TrainingSource>('/training/sources', data);
  return response.data;
}

/**
 * Обновить источник
 */
export async function updateSource(id: string, data: UpdateSourceData): Promise<TrainingSource> {
  const response = await apiClient.put<TrainingSource>(`/training/sources/${id}`, data);
  return response.data;
}

/**
 * Удалить источник
 */
export async function deleteSource(id: string): Promise<void> {
  await apiClient.delete(`/training/sources/${id}`);
}

// ============================================================================
// ROLES API
// ============================================================================

/**
 * Получить все роли
 */
export async function getRoles(): Promise<TrainingRole[]> {
  const response = await apiClient.get<TrainingRole[]>('/training/roles');
  return response.data;
}

/**
 * Получить роль по ID
 */
export async function getRoleById(id: string): Promise<TrainingRole> {
  const response = await apiClient.get<TrainingRole>(`/training/roles/${id}`);
  return response.data;
}

/**
 * Получить скомпилированные знания роли
 */
export async function getRoleKnowledge(id: string): Promise<string> {
  const response = await apiClient.get<{ knowledge: string }>(`/training/roles/${id}/knowledge`);
  return response.data.knowledge;
}

/**
 * Создать новую роль
 */
export async function createRole(data: CreateRoleData): Promise<TrainingRole> {
  const response = await apiClient.post<TrainingRole>('/training/roles', data);
  return response.data;
}

/**
 * Обновить роль
 */
export async function updateRole(id: string, data: UpdateRoleData): Promise<TrainingRole> {
  const response = await apiClient.put<TrainingRole>(`/training/roles/${id}`, data);
  return response.data;
}

/**
 * Удалить роль
 */
export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/training/roles/${id}`);
}

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

export const SOURCE_CATEGORIES = [
  { value: 'sales', label: 'Продажи', color: 'blue' },
  { value: 'negotiations', label: 'Переговоры', color: 'purple' },
  { value: 'psychology', label: 'Психология', color: 'pink' },
  { value: 'methodology', label: 'Методология', color: 'green' },
  { value: 'custom', label: 'Другое', color: 'gray' }
] as const;

export function getCategoryLabel(category: string): string {
  const found = SOURCE_CATEGORIES.find(c => c.value === category);
  return found?.label || category;
}

export function getCategoryColor(category: string): string {
  const found = SOURCE_CATEGORIES.find(c => c.value === category);
  return found?.color || 'gray';
}

// ============================================================================
// ROLE ICONS
// ============================================================================

export const ROLE_ICONS = [
  'briefcase',
  'headphones',
  'message-circle',
  'user',
  'users',
  'target',
  'star',
  'award',
  'trending-up',
  'zap'
] as const;
