import React, { useState, useEffect } from 'react';
import { settingsService } from '../src/services/api';

export const Settings: React.FC = () => {
  const [stopOnReply, setStopOnReply] = useState(false);
  const [resumeTime, setResumeTime] = useState(30);
  const [resumeUnit, setResumeUnit] = useState('дней');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await settingsService.getSettings();
      setStopOnReply(settings.stopOnReply);
      setResumeTime(settings.resumeTime);
      setResumeUnit(settings.resumeUnit);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError('Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await settingsService.updateSettings({
        stopOnReply,
        resumeTime,
        resumeUnit,
      });

      setSuccessMessage('Настройки успешно сохранены');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.message || 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">Настройки аккаунта</h1>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">Загрузка настроек...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
       <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">Настройки аккаунта</h1>

       {/* Error Message */}
       {error && (
         <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
           {error}
         </div>
       )}

       {/* Success Message */}
       {successMessage && (
         <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
           {successMessage}
         </div>
       )}

       {/* Settings Section */}
       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 transition-colors">
         <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Управление агентами ИИ</h2>

         {/* Setting Item 1 */}
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 transition-colors">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Правила остановки агентов</h3>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setStopOnReply(!stopOnReply)}
                 className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${stopOnReply ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
               >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${stopOnReply ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
               <span className="text-sm text-gray-700 dark:text-gray-300">Останавливать агентов ИИ в чате, когда отвечает сотрудник</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-14">
              Если включено, агенты ИИ перестанут отвечать в этом чате, как только отправит сообщение сотрудник.
            </p>
         </div>

         {/* Setting Item 2 */}
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Правила автоматического возобновления</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Агенты ИИ автоматически возобновят ответы на новые сообщения клиентов по истечении выбранного времени.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Возобновить через <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  value={resumeTime}
                  onChange={(e) => setResumeTime(parseInt(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Единица времени</label>
                <select 
                  value={resumeUnit}
                  onChange={(e) => setResumeUnit(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                   <option value="дней">дней</option>
                   <option value="часов">часов</option>
                   <option value="минут">минут</option>
                </select>
              </div>
            </div>
         </div>
       </div>

       <div className="mt-6">
         <button
           onClick={handleSave}
           disabled={isSaving}
           className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
         >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
         </button>
       </div>
    </div>
  );
};