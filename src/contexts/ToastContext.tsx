import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from '../../components/Toast';
import { notificationsService } from '../services/api/notifications.service';

interface ToastContextType {
  showToast: (type: Toast['type'], message: string, saveToHistory?: boolean) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
  refreshNotifications: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Маппинг типов toast в заголовки (с переводами)
  const getTypeTitle = (type: string): string => {
    const titles: Record<string, string> = {
      success: t('toast.success'),
      error: t('toast.error'),
      warning: t('toast.warning'),
      info: t('toast.info'),
    };
    return titles[type] || t('toast.notification');
  };

  const showToast = useCallback((type: Toast['type'], message: string, saveToHistory = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);

    // ВАЖНО: По умолчанию НЕ сохраняем в историю, т.к. бэкенд создаёт уведомления
    // после реального выполнения операции. Это гарантирует, что уведомление
    // появится только если действие ДЕЙСТВИТЕЛЬНО выполнено на сервере.
    if (saveToHistory) {
      notificationsService.createNotification({
        type,
        title: getTypeTitle(type),
        message,
        isRead: true, // Уже прочитано, т.к. toast показан
      }).catch(err => {
        // Не показываем ошибку пользователю, просто логируем
        console.error('Failed to save notification:', err);
      });
    }
  }, [t]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Функция для обновления списка уведомлений в Header
  const refreshNotifications = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast, refreshNotifications }}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastContext;
