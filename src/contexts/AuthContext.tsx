import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api';
import { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // При загрузке приложения НЕ восстанавливаем сессию - требуем ввод логина/пароля
  useEffect(() => {
    const initAuth = async () => {
      // Очищаем сохраненные данные при загрузке
      authService.logout();
      console.log('🔄 Auth initialized - login required');
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    console.log('🔐 AuthContext.login called');
    setIsLoading(true);
    try {
      console.log('🔐 Calling authService.login...');
      const response = await authService.login(data);
      console.log('✅ authService.login response:', response);
      setUser(response.user);
      console.log('✅ User set in context:', response.user);
    } catch (error) {
      console.error('❌ AuthContext.login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    // НЕ устанавливаем isLoading на уровне контекста!
    // Это вызовет размонтирование компонента Register через PublicRoute
    // Регистрируем пользователя, но НЕ логиним его автоматически
    await authService.register(data);
    // Пользователь должен войти вручную после регистрации
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user: currentUser } = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
