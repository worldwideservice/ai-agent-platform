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
    } else {
      console.warn('⚠️ No auth token found for request:', config.url);
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
    // Логируем ошибку в консоль для отладки
    console.error('API Error:', {
      url: error.config?.url,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // НЕ очищаем токен автоматически - пусть AuthContext сам решает
    // Это предотвратит случайное разлогинивание при временных ошибках

    return Promise.reject(error);
  }
);

export default apiClient;
