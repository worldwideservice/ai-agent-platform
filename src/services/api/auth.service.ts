import apiClient from './apiClient';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '../../types/api';

class AuthService {
  /**
   * Регистрация нового пользователя
   * После регистрации пользователь НЕ логинится автоматически
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Очищаем данные предыдущего пользователя перед регистрацией
    const currentUser = this.getUser();
    if (currentUser) {
      console.log('🔄 Clearing localStorage before registration');
      this.logout();
    }

    const response = await apiClient.post<AuthResponse>('/auth/register', data);

    // НЕ сохраняем токен - пользователь должен войти вручную
    // Это стандартный UX flow для безопасности

    return response.data;
  }

  /**
   * Вход в систему
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 authService.login - sending request to API');

    // Проверяем, не логинится ли другой пользователь
    const currentUser = this.getUser();
    const isNewUser = !currentUser || currentUser.email !== data.email;

    if (isNewUser && currentUser) {
      console.log('🔄 Different user detected, clearing localStorage');
      this.logout(); // Очищаем данные предыдущего пользователя
    }

    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    console.log('✅ API response received:', response.data);

    // Сохраняем токен и пользователя в localStorage
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('✅ Token and user saved to localStorage');
    }

    return response.data;
  }

  /**
   * Выход из системы
   */
  logout(): void {
    // Сохраняем список ключей, которые НЕ нужно удалять (например, настройки темы)
    const keysToKeep: string[] = [];

    // Очищаем весь localStorage, кроме исключений
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Получить текущего пользователя
   */
  async getCurrentUser(): Promise<{ user: User }> {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data;
  }

  /**
   * Проверить, авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Получить токен из localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Получить пользователя из localStorage
   */
  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Смена пароля текущего пользователя
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }
}

export const authService = new AuthService();
export default authService;
