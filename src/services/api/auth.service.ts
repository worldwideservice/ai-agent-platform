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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
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
}

export const authService = new AuthService();
export default authService;
