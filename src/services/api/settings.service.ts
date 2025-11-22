import apiClient from './apiClient';

export interface UserSettings {
  id: string;
  stopOnReply: boolean;
  resumeTime: number;
  resumeUnit: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsDto {
  stopOnReply: boolean;
  resumeTime: number;
  resumeUnit: string;
}

/**
 * Получить настройки текущего пользователя
 */
export const getSettings = async (): Promise<UserSettings> => {
  const response = await apiClient.get('/settings');
  return response.data;
};

/**
 * Обновить настройки пользователя
 */
export const updateSettings = async (data: UpdateSettingsDto): Promise<UserSettings> => {
  const response = await apiClient.put('/settings', data);
  return response.data;
};

const settingsService = {
  getSettings,
  updateSettings,
};

export default settingsService;
