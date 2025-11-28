import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsService, notificationsService } from '../src/services/api';
import { Toast } from '../components/Toast';

interface SettingsProps {
  showToast: (type: Toast['type'], message: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  const { t } = useTranslation();
  const [stopOnReply, setStopOnReply] = useState(false);
  const [resumeTime, setResumeTime] = useState(30);
  const [resumeUnit, setResumeUnit] = useState('days');
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
      showToast('error', t('settings.loadError'));
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

      const stopText = stopOnReply ? t('settings.on') : t('settings.off');
      const unitText = t(`settings.${resumeUnit}`);
      showToast('success', `${t('settings.settingsSaved')} (${t('settings.pauseOnReply')}: ${stopText}, ${t('settings.resumeIn')}: ${resumeTime} ${unitText})`);

      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'settings.settingsSaved',
          messageKey: 'settings.settingsSavedMessage',
          params: {
            stopOnReply: stopOnReply ? 'on' : 'off',
            resumeTime,
            resumeUnit
          },
        });
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast('error', err.response?.data?.message || t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">{t('settings.title')}</h1>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">{t('settings.loadingSettings')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
       <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-4">{t('settings.title')}</h1>

       {/* Settings Section */}
       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 transition-colors">
         <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{t('settings.agentManagement')}</h2>

         {/* Setting Item 1 */}
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 transition-colors">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">{t('settings.stopRules')}</h3>
            <div className="flex items-center gap-4">
               <button
                 onClick={() => setStopOnReply(!stopOnReply)}
                 className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${stopOnReply ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
               >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${stopOnReply ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'}`} />
               </button>
               <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.stopOnReply')}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-14">
              {t('settings.stopOnReplyDesc')}
            </p>
         </div>

         {/* Setting Item 2 */}
         <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">{t('settings.resumeRules')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('settings.resumeRulesDesc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.resumeAfter')} <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={resumeTime}
                  onChange={(e) => setResumeTime(parseInt(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.timeUnit')}</label>
                <select
                  value={resumeUnit}
                  onChange={(e) => setResumeUnit(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                   <option value="days">{t('settings.days')}</option>
                   <option value="hours">{t('settings.hours')}</option>
                   <option value="minutes">{t('settings.minutes')}</option>
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
            {isSaving ? t('common.saving') : t('settings.saveChanges')}
         </button>
       </div>

    </div>
  );
};
