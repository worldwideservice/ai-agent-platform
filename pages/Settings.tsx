import React, { useState, useEffect } from 'react';
import { settingsService } from '../src/services/api';
import { Toast } from '../components/Toast';
import { Link as LinkIcon } from 'lucide-react';

interface SettingsProps {
  showToast: (type: Toast['type'], message: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  const [stopOnReply, setStopOnReply] = useState(false);
  const [resumeTime, setResumeTime] = useState(30);
  const [resumeUnit, setResumeUnit] = useState('дней');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsService.getSettings();
      setStopOnReply(settings.stopOnReply);
      setResumeTime(settings.resumeTime);
      setResumeUnit(settings.resumeUnit);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      showToast('error', 'Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await settingsService.updateSettings({
        stopOnReply,
        resumeTime,
        resumeUnit,
      });

      showToast('success', 'Настройки успешно сохранены');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast('error', err.response?.data?.message || 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">Настройки аккаунта</h1>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">Загрузка настроек...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
       <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">Настройки аккаунта</h1>

       {/* Settings Section */}
       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 transition-colors">
         <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Управление агентами ИИ</h2>

         {/* Setting Item 1 */}
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 transition-colors">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Правила остановки агентов</h3>
            <div className="flex items-center gap-4">
               <button
                 onClick={() => setStopOnReply(!stopOnReply)}
                 className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${stopOnReply ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
               >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${stopOnReply ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'}`} />
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

       {/* CRM Integration Section */}
       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 mt-8 transition-colors">
         <div className="flex items-center gap-3 mb-6">
           <LinkIcon className="text-gray-500 dark:text-gray-400" size={20} />
           <div>
             <h2 className="text-lg font-medium text-gray-900 dark:text-white">Интеграции CRM</h2>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
               Подключение CRM выполняется отдельно для каждого агента на странице "Интеграции" в редакторе агента
             </p>
           </div>
         </div>

         <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
           <p className="text-sm text-blue-800 dark:text-blue-300">
             <strong>Как подключить CRM:</strong>
           </p>
           <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
             <li>Перейдите на страницу "Агенты"</li>
             <li>Выберите агента и откройте редактор</li>
             <li>Перейдите на вкладку "Интеграции"</li>
             <li>Подключите Kommo CRM и синхронизируйте данные</li>
           </ol>
           <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
             После подключения данные CRM (воронки, этапы, поля сделок и контактов, действия) будут доступны для этого агента.
           </p>
         </div>
       </div>
    </div>
  );
};
