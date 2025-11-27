import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Bell, X, User, Sun, Moon, Monitor, LogOut, AlertCircle, Camera, Key, Eye, EyeOff, Settings, Trash2, Globe, Clock, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { authService } from '../src/services/api/auth.service';
import { profileService } from '../src/services/api/profile.service';
import { notificationsService, Notification } from '../src/services/api/notifications.service';
import { useAuth } from '../src/contexts/AuthContext';
import { useToast } from '../src/contexts/ToastContext';
import { User as UserType, TimezoneOption } from '../src/types/api';

export const Header: React.FC = () => {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('Europe/Kiev');
  const [profileLanguage, setProfileLanguage] = useState<'ru' | 'en' | 'ua'>('ru');
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load notifications function
  const loadNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const { notifications: notifs, unreadCount } = await notificationsService.getNotifications(50);
      setNotifications(notifs);
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { user } = await profileService.getProfile();
        setUserProfile(user);
        setAvatarUrl(profileService.getAvatarUrl(user.avatarUrl));
        setProfileName(user.name || '');
        setProfileCompany(user.company || '');
        setProfileTimezone(user.timezone || 'Europe/Kiev');
        setProfileLanguage(user.language || 'ru');
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    const loadTimezones = async () => {
      try {
        const { timezones: tz } = await profileService.getTimezones();
        setTimezones(tz);
      } catch (error) {
        console.error('Failed to load timezones:', error);
      }
    };

    loadProfile();
    loadTimezones();
    loadNotifications();
  }, [loadNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 секунд

    return () => clearInterval(pollInterval);
  }, [loadNotifications]);

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Пересчитать непрочитанные
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationsService.deleteAllNotifications();
      setNotifications([]);
      setNotificationCount(0);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  // Получить иконку для типа уведомления
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'info':
        return <Info size={16} className="text-blue-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  // Получить фон иконки для типа уведомления
  const getNotificationIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-700';
    }
  };

  // Форматировать время уведомления
  const formatNotificationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(file);
      setAvatarUrl(profileService.getAvatarUrl(result.avatarUrl));
      showToast('success', 'Аватар успешно загружен');
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      showToast('error', error.response?.data?.error || 'Ошибка при загрузке аватара');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Заполните все поля');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен быть не менее 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      closePasswordModal();
      showToast('success', 'Пароль успешно изменён');
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Ошибка при смене пароля');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  // Profile update handlers
  const openProfileModal = () => {
    if (userProfile) {
      setProfileName(userProfile.name || '');
      setProfileCompany(userProfile.company || '');
      setProfileTimezone(userProfile.timezone || 'Europe/Kiev');
      setProfileLanguage(userProfile.language || 'ru');
    }
    setProfileError('');
    setIsProfileModalOpen(true);
    setIsProfileOpen(false);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileError('');
  };

  const handleProfileSave = async () => {
    setProfileError('');
    setIsSavingProfile(true);

    // Собираем изменения для логирования
    const changes: string[] = [];
    if (userProfile?.name !== profileName) changes.push(`имя: "${profileName}"`);
    if (userProfile?.company !== profileCompany) changes.push(`компания: "${profileCompany}"`);
    if (userProfile?.timezone !== profileTimezone) changes.push(`часовой пояс`);
    if (userProfile?.language !== profileLanguage) changes.push(`язык`);

    try {
      const result = await profileService.updateProfile({
        name: profileName,
        company: profileCompany,
        timezone: profileTimezone,
        language: profileLanguage,
      });
      setUserProfile(result.user);
      closeProfileModal();
      const changesText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      showToast('success', `Профиль сохранён${changesText}`);
    } catch (error: any) {
      setProfileError(error.response?.data?.error || 'Ошибка при сохранении профиля');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Delete account handlers
  const openDeleteModal = () => {
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
    setIsProfileOpen(false);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Введите пароль');
      return;
    }

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Введите DELETE для подтверждения');
      return;
    }

    setIsDeletingAccount(true);

    try {
      await profileService.deleteAccount({
        password: deletePassword,
        confirmation: deleteConfirmation,
      });
      // После удаления аккаунта - выходим
      logout();
    } catch (error: any) {
      setDeleteError(error.response?.data?.error || 'Ошибка при удалении аккаунта');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0 z-40 relative transition-colors">
      <div className="text-xl font-bold text-gray-900 dark:text-white">GPT Агент</div>
      
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative hidden md:block">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           <input 
             type="text" 
             placeholder="Поиск" 
             className="pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-shadow bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
           />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              const willOpen = !isNotificationsOpen;
              setIsNotificationsOpen(willOpen);
              setIsProfileOpen(false);
              // Перезагружаем уведомления при открытии dropdown
              if (willOpen) {
                loadNotifications();
              }
            }}
            className={`relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isNotificationsOpen ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-white dark:border-gray-800 shadow-sm">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-3 w-[480px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Уведомления</h3>
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded">{notificationCount}</span>
                </div>
                <button 
                   onClick={() => setIsNotificationsOpen(false)}
                   className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="px-4 py-2 flex items-center gap-4 text-xs font-medium text-blue-600 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex-shrink-0">
                 <button
                   onClick={handleMarkAllAsRead}
                   className="hover:underline dark:text-blue-400"
                   disabled={notificationCount === 0}
                 >
                   Отметить все как прочитанное
                 </button>
                 <button
                   onClick={handleDeleteAllNotifications}
                   className="text-red-600 hover:underline dark:text-red-400"
                   disabled={notifications.length === 0}
                 >
                   Удалить все
                 </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-2">
                {isLoadingNotifications ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Загрузка...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Нет уведомлений</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`py-2 px-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group relative transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    >
                      <button
                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex gap-2 items-start">
                          <div className={`p-1 rounded-full flex-shrink-0 ${getNotificationIconBg(notif.type)}`}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="pr-5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4 className={`text-sm leading-tight truncate ${!notif.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                  {notif.title}
                                </h4>
                                {!notif.isRead && (
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{formatNotificationTime(notif.createdAt)}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-gray-200 dark:hover:ring-gray-600 transition-all overflow-hidden bg-black text-white"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              "A"
            )}
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* User Info with Upload */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                 <div
                    className={`relative w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 overflow-hidden group cursor-pointer ${isUploadingAvatar ? 'opacity-50' : ''}`}
                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                 >
                   {avatarUrl ? (
                      <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                   ) : (
                      <User size={20} />
                   )}
                   {/* Upload Overlay */}
                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                      {isUploadingAvatar ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={14} className="text-white opacity-0 group-hover:opacity-100" />
                      )}
                   </div>
                 </div>
                 <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                 />
                 <div>
                   <div className="text-sm font-semibold text-gray-900 dark:text-white">
                     {userProfile?.name || 'Пользователь'}
                   </div>
                   <div className="text-xs text-gray-500 dark:text-gray-400">
                     {userProfile?.email || ''}
                   </div>
                 </div>
              </div>

              {/* Theme Switcher */}
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                 <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${
                        theme === 'light'
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Sun size={16} />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Moon size={16} />
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-sm transition-all ${
                        theme === 'system'
                          ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Monitor size={16} />
                    </button>
                 </div>
              </div>

              {/* Menu Items */}
              <div className="p-2 space-y-1">
                <button
                  onClick={openProfileModal}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Settings size={16} />
                  Редактировать профиль
                </button>
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Key size={16} />
                  Сменить пароль
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  onClick={openDeleteModal}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Удалить аккаунт
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Смена пароля</h2>
              <button
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Текущий пароль
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите текущий пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Минимум 6 символов"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Подтвердите новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Повторите новый пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closePasswordModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isChangingPassword ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Редактировать профиль</h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <User size={14} className="inline mr-1" />
                  Имя
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ваше имя"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Компания
                </label>
                <input
                  type="text"
                  value={profileCompany}
                  onChange={(e) => setProfileCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Название компании"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Globe size={14} className="inline mr-1" />
                  Язык интерфейса
                </label>
                <select
                  value={profileLanguage}
                  onChange={(e) => setProfileLanguage(e.target.value as 'ru' | 'en' | 'ua')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                  <option value="ua">Українська</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Clock size={14} className="inline mr-1" />
                  Часовой пояс
                </label>
                <select
                  value={profileTimezone}
                  onChange={(e) => setProfileTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Message */}
              {profileError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSavingProfile ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 size={20} />
                Удаление аккаунта
              </h2>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Внимание!</strong> Это действие необратимо. Все ваши данные, агенты, статьи базы знаний и настройки будут удалены навсегда.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Пароль для подтверждения
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Введите ваш пароль"
                />
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Введите <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">DELETE</span> для подтверждения
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="DELETE"
                />
              </div>

              {/* Error Message */}
              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isDeletingAccount ? 'Удаление...' : 'Удалить аккаунт'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};