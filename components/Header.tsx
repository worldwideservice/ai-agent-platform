import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, X, User, Sun, Moon, Monitor, LogOut, AlertCircle, Camera, Key, Eye, EyeOff, Settings, Trash2, Globe, Clock, CheckCircle, Info, AlertTriangle, Bot, FileText, BookOpen, GraduationCap, Users, Menu } from 'lucide-react';
import { authService } from '../src/services/api/auth.service';
import { profileService } from '../src/services/api/profile.service';
import { notificationsService, Notification } from '../src/services/api/notifications.service';
import { agentService } from '../src/services/api/agent.service';
import { kbService } from '../src/services/api/kb.service';
import { getSources, getRoles, TrainingSource, TrainingRole } from '../src/services/api/training.service';
import { useAuth } from '../src/contexts/AuthContext';
import { useToast } from '../src/contexts/ToastContext';
import { User as UserType, TimezoneOption, AgentResponse, KbArticleResponse, KbCategoryResponse } from '../src/types/api';
import { changeLanguage } from '../src/i18n';

// Search result types
interface SearchResults {
  agents: AgentResponse[];
  articles: KbArticleResponse[];
  categories: KbCategoryResponse[];
  sources: TrainingSource[];
  roles: TrainingRole[];
}

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    agents: [],
    articles: [],
    categories: [],
    sources: [],
    roles: [],
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const languageRef = useRef<HTMLDivElement>(null);

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

  // Global search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ agents: [], articles: [], categories: [], sources: [], roles: [] });
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();

    try {
      // Fetch all data in parallel
      const [agents, articles, categories, sources, roles] = await Promise.all([
        agentService.getAllAgents().catch(() => []),
        kbService.getAllArticles().catch(() => []),
        kbService.getAllCategories().catch(() => []),
        getSources().catch(() => []),
        getRoles().catch(() => []),
      ]);

      // Filter results by search query
      setSearchResults({
        agents: agents.filter(a =>
          a.name.toLowerCase().includes(lowerQuery) ||
          (a.description && a.description.toLowerCase().includes(lowerQuery))
        ).slice(0, 5),
        articles: articles.filter(a =>
          a.title.toLowerCase().includes(lowerQuery) ||
          (a.content && a.content.toLowerCase().includes(lowerQuery))
        ).slice(0, 5),
        categories: categories.filter(c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          (c.description && c.description.toLowerCase().includes(lowerQuery))
        ).slice(0, 5),
        sources: sources.filter(s =>
          s.name.toLowerCase().includes(lowerQuery) ||
          (s.description && s.description.toLowerCase().includes(lowerQuery)) ||
          (s.author && s.author.toLowerCase().includes(lowerQuery))
        ).slice(0, 5),
        roles: roles.filter(r =>
          r.name.toLowerCase().includes(lowerQuery) ||
          (r.description && r.description.toLowerCase().includes(lowerQuery))
        ).slice(0, 5),
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults({ agents: [], articles: [], categories: [], sources: [], roles: [] });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Handle search result click
  const handleSearchResultClick = (type: string, id: string | number) => {
    setIsSearchOpen(false);
    setSearchQuery('');

    switch (type) {
      case 'agent':
        window.location.href = `/agents/${id}`;
        break;
      case 'article':
        window.location.href = `/kb/articles`;
        break;
      case 'category':
        window.location.href = `/kb/categories/${id}`;
        break;
      case 'source':
        window.location.href = `/training/sources`;
        break;
      case 'role':
        window.location.href = `/training/roles`;
        break;
    }
  };

  // Check if has any search results
  const hasSearchResults =
    searchResults.agents.length > 0 ||
    searchResults.articles.length > 0 ||
    searchResults.categories.length > 0 ||
    searchResults.sources.length > 0 ||
    searchResults.roles.length > 0;

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
        // Apply saved language preference
        if (user.language === 'ru' || user.language === 'en') {
          changeLanguage(user.language);
        }
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
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setIsLanguageOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
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

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins} ${t('time.minutesAgo')}`;
    if (diffHours < 24) return `${diffHours} ${t('time.hoursAgo')}`;
    if (diffDays < 7) return `${diffDays} ${t('time.daysAgo')}`;
    return date.toLocaleDateString();
  };

  // Обработать параметры уведомления, переводя специальные ключи
  const processNotificationParams = (params: Record<string, any>) => {
    const result: Record<string, any> = { ...params };
    // Если есть statusKey, переводим его в status
    if (result.statusKey) {
      result.status = t(`notifications.${result.statusKey}`);
      delete result.statusKey;
    }
    // Обработка настроек (stopOnReply, resumeUnit)
    if (result.stopOnReply !== undefined) {
      result.stopOnReply = t(`settings.${result.stopOnReply}`);
    }
    if (result.resumeUnit) {
      result.resumeUnit = t(`settings.${result.resumeUnit}`);
    }
    return result;
  };

  // Проверить, похож ли текст на ключ перевода (например, "agentEditor.notifications.agentSettingsSaved")
  const looksLikeTranslationKey = (text: string) => {
    return text && text.includes('.') && !text.includes(' ') && /^[a-zA-Z_]/.test(text);
  };

  // Получить переведённый заголовок уведомления
  const getNotificationTitle = (notif: Notification): string => {
    const key = notif.titleKey || (looksLikeTranslationKey(notif.title) ? notif.title : null);
    if (key) {
      try {
        const params = notif.params ? JSON.parse(notif.params) : {};
        const processedParams = processNotificationParams(params);
        const translated = t(key, processedParams) as string;
        // Если перевод найден (не равен ключу), возвращаем его
        if (translated !== key) return translated;
      } catch {
        const translated = t(key) as string;
        if (translated !== key) return translated;
      }
    }
    return notif.title;
  };

  // Получить переведённое сообщение уведомления
  const getNotificationMessage = (notif: Notification): string => {
    const key = notif.messageKey || (looksLikeTranslationKey(notif.message) ? notif.message : null);
    if (key) {
      try {
        const params = notif.params ? JSON.parse(notif.params) : {};
        const processedParams = processNotificationParams(params);
        const translated = t(key, processedParams) as string;
        // Если перевод найден (не равен ключу), возвращаем его
        if (translated !== key) return translated;
      } catch {
        const translated = t(key) as string;
        if (translated !== key) return translated;
      }
    }
    return notif.message;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(file);
      setAvatarUrl(profileService.getAvatarUrl(result.avatarUrl));
      showToast('success', t('profile.avatarUploaded'));
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      showToast('error', error.response?.data?.error || t('profile.avatarUploadError'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('password.fillAllFields'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('password.minLengthError'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('password.passwordsMismatch'));
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      closePasswordModal();
      showToast('success', t('password.passwordChanged'));
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || t('password.passwordChangeError'));
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
      // Apply language change immediately
      if (profileLanguage === 'ru' || profileLanguage === 'en') {
        changeLanguage(profileLanguage);
      }
      closeProfileModal();
      const changesText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      showToast('success', `${t('profile.profileSaved')}${changesText}`);
    } catch (error: any) {
      setProfileError(error.response?.data?.error || t('profile.profileSaveError'));
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

  // Quick language change handler
  const handleQuickLanguageChange = async (lang: 'ru' | 'en') => {
    setProfileLanguage(lang);
    changeLanguage(lang);
    setIsLanguageOpen(false);
    // Save to profile
    try {
      await profileService.updateProfile({ language: lang });
      if (userProfile) {
        setUserProfile({ ...userProfile, language: lang });
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError(t('deleteAccount.passwordRequired'));
      return;
    }

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError(t('deleteAccount.confirmRequired'));
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
      setDeleteError(error.response?.data?.error || t('deleteAccount.deleteError'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-40 relative transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-xl font-bold text-gray-900 dark:text-white">GPT Агент</div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Global Search */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder={t('common.search')}
            className="pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-shadow bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults({ agents: [], articles: [], categories: [], sources: [], roles: [] });
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery && (
            <div className="absolute top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
              {isSearching ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  {t('common.loading')}
                </div>
              ) : !hasSearchResults ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {t('search.noResults')}
                </div>
              ) : (
                <div className="py-2">
                  {/* Agents */}
                  {searchResults.agents.length > 0 && (
                    <div className="px-3 py-2">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Bot size={12} />
                        {t('search.agents')}
                      </div>
                      {searchResults.agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => handleSearchResultClick('agent', agent.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <Bot size={16} className="text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{agent.name}</div>
                            {agent.description && (
                              <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {agent.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* KB Articles */}
                  {searchResults.articles.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <FileText size={12} />
                        {t('search.articles')}
                      </div>
                      {searchResults.articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleSearchResultClick('article', article.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <FileText size={16} className="text-purple-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{article.title}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* KB Categories */}
                  {searchResults.categories.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <BookOpen size={12} />
                        {t('search.categories')}
                      </div>
                      {searchResults.categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleSearchResultClick('category', category.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <BookOpen size={16} className="text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{category.name}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500 truncate">{category.description}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Training Sources */}
                  {searchResults.sources.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <GraduationCap size={12} />
                        {t('search.sources')}
                      </div>
                      {searchResults.sources.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => handleSearchResultClick('source', source.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <GraduationCap size={16} className="text-orange-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{source.name}</div>
                            {source.author && (
                              <div className="text-xs text-gray-500 truncate">{source.author}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Training Roles */}
                  {searchResults.roles.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Users size={12} />
                        {t('search.roles')}
                      </div>
                      {searchResults.roles.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => handleSearchResultClick('role', role.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <Users size={16} className="text-pink-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{role.name}</div>
                            {role.description && (
                              <div className="text-xs text-gray-500 truncate">{role.description}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              const willOpen = !isNotificationsOpen;
              setIsNotificationsOpen(willOpen);
              setIsProfileOpen(false);
              setIsLanguageOpen(false);
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
            <div className="absolute top-full mt-3 w-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 flex flex-col max-h-[85vh] right-0">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{t('header.notifications')}</h3>
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
                   {t('header.markAllRead')}
                 </button>
                 <button
                   onClick={handleDeleteAllNotifications}
                   className="text-red-600 hover:underline dark:text-red-400"
                   disabled={notifications.length === 0}
                 >
                   {t('header.clearAll')}
                 </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-2">
                {isLoadingNotifications ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('header.noNotifications')}</div>
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
                                  {getNotificationTitle(notif)}
                                </h4>
                                {!notif.isRead && (
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{formatNotificationTime(notif.createdAt)}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5 line-clamp-2">
                              {getNotificationMessage(notif)}
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

        {/* Language Switcher */}
        <div className="relative" ref={languageRef}>
          <button
            onClick={() => {
              setIsLanguageOpen(!isLanguageOpen);
              setIsNotificationsOpen(false);
              setIsProfileOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isLanguageOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          >
            <Globe size={18} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">
              {profileLanguage}
            </span>
          </button>

          {/* Language Dropdown */}
          {isLanguageOpen && (
            <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => handleQuickLanguageChange('en')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  profileLanguage === 'en'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-base">🇺🇸</span>
                <span>English</span>
                {profileLanguage === 'en' && <span className="ml-auto text-blue-500">✓</span>}
              </button>
              <button
                onClick={() => handleQuickLanguageChange('ru')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  profileLanguage === 'ru'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-base">🇷🇺</span>
                <span>Русский</span>
                {profileLanguage === 'ru' && <span className="ml-auto text-blue-500">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
              setIsLanguageOpen(false);
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
                     {userProfile?.name || t('common.user')}
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
                  {t('header.editProfile')}
                </button>
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Key size={16} />
                  {t('header.changePassword')}
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  onClick={openDeleteModal}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  {t('header.deleteAccount')}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  {t('header.logout')}
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('header.changePassword')}</h2>
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
                  {t('password.currentPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('password.enterCurrentPassword')}
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
                  {t('password.newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('password.minLength')}
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
                  {t('password.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('password.repeatNewPassword')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isChangingPassword ? t('common.saving') : t('common.save')}
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('header.editProfile')}</h2>
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
                  {t('profile.yourName')}
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('profile.yourName')}
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.companyName')}
                </label>
                <input
                  type="text"
                  value={profileCompany}
                  onChange={(e) => setProfileCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('profile.companyName')}
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Clock size={14} className="inline mr-1" />
                  {t('profile.timezone')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isSavingProfile ? t('common.saving') : t('common.save')}
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
                {t('deleteAccount.title')}
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
                  {t('deleteAccount.warning')}
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('deleteAccount.enterPassword')}
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={t('deleteAccount.enterPassword')}
                />
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('deleteAccount.confirmDelete')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isDeletingAccount ? t('common.loading') : t('deleteAccount.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};