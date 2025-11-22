import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Базовая конфигурация API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Создаем экземпляр axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request Interceptor - добавляем JWT токен к каждому запросу
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - обрабатываем ошибки
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Если 401 - токен невалиден, очищаем localStorage
    // НО не делаем этого для запросов на /auth/login и /auth/register
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                           error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // В SPA не нужен hard redirect - React сам покажет страницу входа
      // window.location.href = '/login';
    }

    // Логируем ошибку в консоль для отладки
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

export default apiClient;
