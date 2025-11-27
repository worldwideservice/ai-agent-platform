import apiClient from './apiClient';
import {
  User,
  ProfileUpdateRequest,
  ProfileResponse,
  EmailUpdateRequest,
  AvatarUploadResponse,
  TimezoneOption,
  DeleteAccountRequest,
} from '../../types/api';

class ProfileService {
  /**
   * Получить профиль текущего пользователя
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>('/profile');
    return response.data;
  }

  /**
   * Обновить профиль (имя, компания, timezone, язык)
   */
  async updateProfile(data: ProfileUpdateRequest): Promise<{ success: boolean; message: string; user: User }> {
    const response = await apiClient.put<{ success: boolean; message: string; user: User }>('/profile', data);
    return response.data;
  }

  /**
   * Сменить email (требует пароль)
   */
  async updateEmail(data: EmailUpdateRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put<{ success: boolean; message: string }>('/profile/email', data);
    return response.data;
  }

  /**
   * Загрузить аватар
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<AvatarUploadResponse>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Удалить аватар
   */
  async deleteAvatar(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>('/profile/avatar');
    return response.data;
  }

  /**
   * Получить URL аватара
   */
  getAvatarUrl(avatarPath: string | null | undefined): string | null {
    if (!avatarPath) return null;
    // Если путь уже полный URL - возвращаем как есть
    if (avatarPath.startsWith('http')) return avatarPath;
    // Иначе добавляем базовый URL API
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}${avatarPath}`;
  }

  /**
   * Получить список часовых поясов
   */
  async getTimezones(): Promise<{ timezones: TimezoneOption[] }> {
    const response = await apiClient.get<{ timezones: TimezoneOption[] }>('/profile/timezones');
    return response.data;
  }

  /**
   * Удалить аккаунт (требует пароль и подтверждение)
   */
  async deleteAccount(data: DeleteAccountRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>('/profile/account', {
      data,
    });
    return response.data;
  }
}

export const profileService = new ProfileService();
export default profileService;
