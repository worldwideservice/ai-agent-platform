import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, X, User, Sun, Moon, Monitor, LogOut, AlertCircle, Camera } from 'lucide-react';

export const Header: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  
  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification State - Initialized to empty as requested
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
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

        {/* License Alert Button - Hidden if no issues */}
        {notificationCount > 0 && (
          <div className="hidden md:flex items-center bg-[#B91C1C] text-white px-3 py-1.5 rounded-full text-xs font-medium gap-2 shadow-sm">
             <span className="bg-white text-[#B91C1C] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>
             <span>30.10.2025</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
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
                 <button className="hover:underline dark:text-blue-400">Отметить как прочитанное</button>
                 <button 
                  onClick={() => { setNotifications([]); setNotificationCount(0); }}
                  className="text-red-600 hover:underline dark:text-red-400"
                 >
                   Удалить все
                 </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar p-2">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Нет новых уведомлений</div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group relative transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <button 
                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <X size={14} />
                      </button>
                      <div className="flex gap-3 items-start">
                          <div className="mt-0.5 text-red-500 bg-red-50 dark:bg-red-900/20 p-1.5 rounded-full flex-shrink-0">
                            <AlertCircle size={16} />
                          </div>
                          <div className="pr-6">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{notif.title}</h4>
                            <span className="text-xs text-gray-400 block mb-1.5">{notif.time}</span>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                              {notif.description}
                            </p>
                            <button className="bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold px-3 py-1 rounded shadow-sm transition-colors">
                              {notif.action}
                            </button>
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
                    className="relative w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 overflow-hidden group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                 >
                   {avatarUrl ? (
                      <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                   ) : (
                      <User size={20} />
                   )}
                   {/* Upload Overlay */}
                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                      <Camera size={14} className="text-white opacity-0 group-hover:opacity-100" />
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
                   <div className="text-sm font-semibold text-gray-900 dark:text-white">Admin</div>
                   <div className="text-xs text-gray-500 dark:text-gray-400">admin@gptagent.com</div>
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
              <div className="p-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <LogOut size={16} />
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};