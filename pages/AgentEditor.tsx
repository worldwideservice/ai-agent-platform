import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import {
  User, RefreshCw, MessageSquare, Book, Settings, Share2, Zap, Link as LinkIcon, MoreHorizontal,
  ChevronDown, ChevronUp, X, Clock, Puzzle, FilePenLine, Users, Eye, Briefcase, PenSquare,
  GripVertical, Trash2, Plus, Search, LayoutGrid, Edit, ArrowUp, ArrowDown, CheckCircle,
  XCircle, Settings2, Cpu, Languages, SlidersHorizontal, Sparkles, Check, Calendar, List, Minus,
  Database, GitBranch, FileText, Phone, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOCK_PIPELINES, MOCK_CHANNELS, MOCK_KB_CATEGORIES, MOCK_CRM_FIELDS, CRM_ACTIONS, MOCK_USERS, MOCK_SALESBOTS } from '../services/crmData';
import { AgentDealsContacts, AgentDealsContactsRef } from '../components/AgentDealsContacts';
import { AgentBasicSettings } from '../components/AgentBasicSettings';
import { AgentAdvancedSettings, AgentAdvancedSettingsRef } from '../components/AgentAdvancedSettings';
import { Agent, Page } from '../types';
import { AgentBasicSettingsRef } from '../components/AgentBasicSettings';
import { integrationsService, triggersService, chainsService, googleService, agentService, notificationsService } from '../src/services/api';
import { useToast } from '../src/contexts/ToastContext';
import type { KommoSyncStats } from '../src/services/api/integrations.service';
import googleCalendarService, { GoogleCalendarEmployee } from '../src/services/api/google-calendar.service';
import { apiClient } from '../src/services/api/apiClient';
// import Toggle from '../components/Toggle'; // Removed: Defined internally
import { ConfirmationModal } from '../components/ConfirmationModal';
// import Toast, { ToastRef } from '../components/Toast'; // Removed: Not used or incorrect

interface AgentEditorProps {
  agent: Agent | null;
  onCancel: () => void;
  onSave: (agent: Agent) => Promise<void>;
  kbCategories: { id: string; name: string }[];
  onNavigate: (page: Page) => void;
}

type Tab = 'main' | 'deals' | 'triggers' | 'chains' | 'integrations' | 'advanced';
type IntegrationView = 'list' | 'kommo' | 'google_calendar';

// --- Types ---
interface UpdateRule {
  id: string;
  fieldId: string;
  condition: string;
  overwrite: boolean;
}

interface TriggerActionParams {
  // change_stage
  stageId?: string;
  // assign_user
  applyTo?: 'deal' | 'contact' | 'both';
  userId?: string;
  // create_task
  taskDescription?: string;
  taskUserId?: string;
  // run_salesbot
  salesbotId?: string;
  // add_deal_tags, add_contact_tags
  tags?: string[];
  // add_deal_note, add_contact_note
  noteText?: string;
  // send_message
  messageText?: string;
  // send_files
  fileUrls?: string[]; // URLs файлов после загрузки
  // send_email
  templateId?: string;
  emailSource?: 'contact' | 'custom';
  emailInstructions?: string;
  emailAttachments?: string[]; // Вложения для email
  // send_webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: { key: string; value: string }[];
  webhookBodyType?: 'form' | 'json' | 'raw';
  webhookBody?: { key: string; value: string }[] | string;
  webhookPassToAI?: boolean;
  // send_kb_article
  articleId?: number;
  channel?: 'chat' | 'email';
}

interface TriggerAction {
  id: string;
  action: string;
  params?: TriggerActionParams;
}

interface Trigger {
  id: string;
  name: string;
  isActive: boolean;
  condition: string;
  actions: TriggerAction[];
  cancelMessage?: string;
  runLimit?: number;
}

interface ChainAction {
  id: string;
  type: string;
  instruction: string;
  params?: Record<string, any>;
}

interface ChainStep {
  id: string;
  delayValue: number;
  delayUnit: string;
  actions: ChainAction[];
}

interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface Chain {
  id: string;
  name: string;
  isActive: boolean;
  conditionType: 'all' | 'specific';
  conditionStages: string[];
  conditionExclude?: string;
  steps: ChainStep[];
  schedule: WorkingDay[];
  runLimit?: number;
}

// --- UI Components ---
const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DEFAULT_WORKING_HOURS: WorkingDay[] = DAYS_OF_WEEK.map(day => ({ day, enabled: true, start: '08:00', end: '22:00' }));

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05" />
    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
  </svg>
);

// Toggle component - memoized to prevent unnecessary re-renders
const Toggle = memo(({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${checked ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'}`}
    style={{ transition: 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md ring-0 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      style={{ transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    />
  </button>
));

export const AgentEditor: React.FC<AgentEditorProps> = ({ agent, onCancel, onSave, kbCategories, onNavigate }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('agentEditorActiveTab');
    return (saved as Tab) || 'main';
  });
  const basicSettingsRef = useRef<AgentBasicSettingsRef>(null);
  const dealsContactsRef = useRef<AgentDealsContactsRef>(null);
  const advancedSettingsRef = useRef<AgentAdvancedSettingsRef>(null);
  const { showToast } = useToast();

  // --- Loading and Error States ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // --- Modal States ---
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [isSavingChain, setIsSavingChain] = useState(false);
  const [isSavingTrigger, setIsSavingTrigger] = useState(false);

  // --- Integrations State ---
  const [integrationView, setIntegrationView] = useState<IntegrationView>('list');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [kommoActive, setKommoActive] = useState(false);
  const [kommoConnected, setKommoConnected] = useState(false);
  const [googleCalendarActive, setGoogleCalendarActive] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [kommoSyncStats, setKommoSyncStats] = useState<KommoSyncStats | null>(null);
  const [syncDataExpanded, setSyncDataExpanded] = useState(true);

  // Google Calendar Employees State
  const [calendarEmployees, setCalendarEmployees] = useState<GoogleCalendarEmployee[]>([]);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedCrmUser, setSelectedCrmUser] = useState<{ id: string; name: string } | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  // --- Confirmation Modals State ---
  const [showKommoDisconnectModal, setShowKommoDisconnectModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<GoogleCalendarEmployee | null>(null);

  // --- Triggers Data ---
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  // --- KB Articles for Stage Instructions ---
  const [kbArticles, setKbArticles] = useState<Array<{ id: number; title: string; isActive: boolean }>>([]);

  // Parse CRM data from agent (handles double-encoded JSON)
  const parseCrmData = () => {
    if (!agent?.crmData) return null;
    try {
      if (typeof agent.crmData === 'string') {
        let parsed = JSON.parse(agent.crmData);
        // Handle double-encoded JSON (string inside string)
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        return parsed;
      } else if (typeof agent.crmData === 'object') {
        return agent.crmData;
      }
      return null;
    } catch {
      return null;
    }
  };

  const crmData = parseCrmData();
  const availablePipelines = crmData?.pipelines || MOCK_PIPELINES;
  const availableChannels = crmData?.channels || MOCK_CHANNELS;
  // Всегда используем статический список действий - динамические данные (pipelines, users, salesbots) берутся из crmData
  const availableActions = CRM_ACTIONS;

  // Загружаем статьи KB для выбора в инструкциях этапов
  useEffect(() => {
    const fetchKbArticles = async () => {
      try {
        const response = await apiClient.get('/kb/articles');
        if (response.data && Array.isArray(response.data)) {
          setKbArticles(response.data.map((article: any) => ({
            id: article.id,
            title: article.title,
            isActive: article.isActive
          })));
        }
      } catch (error) {
        console.error('Failed to fetch KB articles:', error);
      }
    };

    fetchKbArticles();
  }, []);

  // Сохраняем активную вкладку в localStorage
  React.useEffect(() => {
    localStorage.setItem('agentEditorActiveTab', activeTab);
  }, [activeTab]);

  // Синхронизируем name с agent.name при изменении агента
  useEffect(() => {
    if (agent?.name) {
      setName(agent.name);
    }
  }, [agent?.name]);

  // Загружаем интеграции при монтировании компонента
  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!agent?.id) return;

      setIntegrationsLoading(true);
      try {
        const data = await integrationsService.getIntegrations(agent.id);
        setIntegrations(data);

        // Обновляем состояние для каждой интеграции
        const kommo = data.find((i: any) => i.integrationType === 'kommo');
        const googleCalendar = data.find((i: any) => i.integrationType === 'google_calendar');

        if (kommo) {
          setKommoConnected(kommo.isConnected || false);
          // Автовключаем если подключено но не активно
          if (kommo.isConnected && !kommo.isActive) {
            setKommoActive(true);
            integrationsService.upsertIntegration(agent.id, 'kommo', true, true)
              .catch(err => console.error('Failed to auto-enable Kommo:', err));
          } else {
            setKommoActive(kommo.isActive || false);
          }
        } else {
          setKommoConnected(false);
          setKommoActive(false);
        }

        if (googleCalendar) {
          setGoogleCalendarConnected(googleCalendar.isConnected || false);
          // Автовключаем если подключено но не активно
          if (googleCalendar.isConnected && !googleCalendar.isActive) {
            setGoogleCalendarActive(true);
            integrationsService.upsertIntegration(agent.id, 'google_calendar', true, true)
              .catch(err => console.error('Failed to auto-enable Google Calendar:', err));
          } else {
            setGoogleCalendarActive(googleCalendar.isActive || false);
          }
        } else {
          setGoogleCalendarConnected(false);
          setGoogleCalendarActive(false);
        }
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
        // В случае ошибки устанавливаем все как неподключенное
        setKommoConnected(false);
        setKommoActive(false);
        setGoogleCalendarConnected(false);
        setGoogleCalendarActive(false);
      } finally {
        setIntegrationsLoading(false);
      }
    };

    fetchIntegrations();
  }, [agent?.id]);

  // Загружаем статистику Kommo при подключении
  useEffect(() => {
    const fetchKommoStats = async () => {
      if (!agent?.id || !kommoConnected) {
        setKommoSyncStats(null);
        return;
      }

      try {
        const stats = await integrationsService.getKommoSyncStats(agent.id);
        setKommoSyncStats(stats);
      } catch (error) {
        console.error('Failed to fetch Kommo stats:', error);
      }
    };

    fetchKommoStats();
  }, [agent?.id, kommoConnected]);

  // Загружаем сотрудников Google Calendar при монтировании компонента
  useEffect(() => {
    const fetchCalendarEmployees = async () => {
      if (!agent?.id) return;

      try {
        const employees = await googleCalendarService.getEmployees(agent.id);
        setCalendarEmployees(employees);
        // Считаем интеграцию подключенной, если есть хотя бы один connected сотрудник
        const hasConnected = employees.some(e => e.status === 'connected');
        if (hasConnected) {
          setGoogleCalendarConnected(true);
          setGoogleCalendarActive(true);
          // Сохраняем в БД и обновляем интеграции
          try {
            await integrationsService.upsertIntegration(agent.id, 'google_calendar', true, true);
            await refreshIntegrations();
          } catch (err) {
            console.error('Failed to auto-enable Google Calendar:', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch calendar employees:', error);
      }
    };

    fetchCalendarEmployees();
  }, [agent?.id]);

  // Загружаем триггеры при монтировании компонента
  useEffect(() => {
    const fetchTriggers = async () => {
      if (!agent?.id) return;

      try {
        const data = await triggersService.getTriggers(agent.id);
        // Map backend format to frontend format
        const formattedTriggers: Trigger[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          isActive: t.isActive,
          condition: t.condition,
          actions: t.actions.map((a: any) => ({
            id: a.id,
            action: a.action,
            params: a.params || {},
          })),
          cancelMessage: t.cancelMessage,
          runLimit: t.runLimit,
        }));
        setTriggers(formattedTriggers);
      } catch (error) {
        console.error('Failed to fetch triggers:', error);
        // На случай ошибки просто оставляем пустой массив
      }
    };

    fetchTriggers();
  }, [agent?.id]);

  // Загружаем цепочки при монтировании компонента
  useEffect(() => {
    const fetchChains = async () => {
      if (!agent?.id) return;

      try {
        const data = await chainsService.getChains(agent.id);
        // Map backend format to frontend format
        const formattedChains: Chain[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          isActive: c.isActive,
          conditionType: c.conditionType || 'all',
          conditionStages: c.conditions?.map((cond: any) => cond.stageId) || [],
          conditionExclude: c.conditionExclude || '',
          steps: c.steps?.map((s: any) => ({
            id: s.id,
            delayValue: s.delayValue,
            delayUnit: s.delayUnit,
            actions: s.actions?.map((a: any) => ({
              id: a.id,
              type: a.actionType,
              instruction: a.instruction,
              params: a.params || {},
            })) || [],
          })) || [],
          schedule: c.schedules?.map((sch: any) => ({
            day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][sch.dayOfWeek] || 'Пн',
            enabled: true,
            start: sch.startTime || '09:00',
            end: sch.endTime || '22:00',
          })) || DEFAULT_WORKING_HOURS,
          runLimit: c.runLimit || 0,
        }));
        setChains(formattedChains);
      } catch (error) {
        console.error('Failed to fetch chains:', error);
      }
    };

    fetchChains();
  }, [agent?.id]);

  // Функция для обновления списка интеграций
  const refreshIntegrations = async () => {
    if (!agent?.id) return;

    try {
      const data = await integrationsService.getIntegrations(agent.id);
      setIntegrations(data);

      // Обновляем состояние для каждой интеграции
      const kommo = data.find((i: any) => i.integrationType === 'kommo');
      const googleCalendar = data.find((i: any) => i.integrationType === 'google_calendar');

      if (kommo) {
        setKommoConnected(kommo.isConnected || false);
        setKommoActive(kommo.isActive || false);
      }

      if (googleCalendar) {
        setGoogleCalendarConnected(googleCalendar.isConnected || false);
        setGoogleCalendarActive(googleCalendar.isActive || false);
      }
    } catch (error) {
      console.error('Failed to refresh integrations:', error);
    }
  };

  // --- Kommo Disconnect Handler ---
  const handleKommoDisconnect = async () => {
    if (!agent) return;

    try {
      setKommoConnected(false);
      setKommoActive(false);
      setKommoSyncStats(null);
      await integrationsService.upsertIntegration(agent.id, 'kommo', false, false);
      await refreshIntegrations();
    } catch (error) {
      console.error('Failed to disconnect Kommo:', error);
    } finally {
      setShowKommoDisconnectModal(false);
    }
  };

  // --- Delete Calendar Employee Handler ---
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete || !agent) return;

    try {
      await googleCalendarService.deleteEmployee(employeeToDelete.id);
      const newEmployees = calendarEmployees.filter(e => e.id !== employeeToDelete.id);
      setCalendarEmployees(newEmployees);

      // Если удалён последний connected сотрудник - автовыключаем интеграцию
      const hasConnected = newEmployees.some(e => e.status === 'connected');
      if (!hasConnected && googleCalendarActive) {
        setGoogleCalendarActive(false);
        setGoogleCalendarConnected(false);
        integrationsService.upsertIntegration(agent.id, 'google_calendar', false, false)
          .catch(err => console.error('Failed to disable Google Calendar:', err));
      }
    } catch (error) {
      console.error('Failed to delete employee:', error);
    } finally {
      setEmployeeToDelete(null);
    }
  };

  // --- Save Handler ---
  const handleSave = async () => {
    console.log('=== handleSave called ===');
    console.log('Agent:', agent);

    if (!agent) {
      console.error('Agent is not defined! Cannot save.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');

      // Get data from basic settings
      const basicData = basicSettingsRef.current?.getData() || {};
      console.log('Basic data:', basicData);

      // Get data from deals & contacts settings
      const dealsContactsData = dealsContactsRef.current?.getData() || {};
      console.log('Deals/Contacts data:', dealsContactsData);

      // Get data from advanced settings
      const advancedData = advancedSettingsRef.current?.getData() || {};
      console.log('Advanced data:', advancedData);

      // Parse existing crmData and merge with new deals/contacts settings (handles double-encoded JSON)
      let crmData = {};
      try {
        // crmData может быть уже объектом (после парсинга на backend) или строкой
        if (typeof agent.crmData === 'string') {
          let parsed = JSON.parse(agent.crmData);
          // Handle double-encoded JSON (string inside string)
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          crmData = parsed;
        } else if (agent.crmData && typeof agent.crmData === 'object') {
          crmData = agent.crmData;
        }
      } catch (e) {
        console.error('Failed to parse crmData:', e);
      }

      const updatedCrmData = {
        ...crmData,
        ...dealsContactsData
      };

      // Merge with existing agent data
      // НЕ делаем JSON.stringify здесь - backend сделает это сам!
      const updatedAgent: Agent = {
        ...agent,
        ...basicData,
        model: advancedData?.model || agent.model,  // Сохраняем выбранную модель
        crmData: updatedCrmData  // Отправляем объект, не строку!
      };

      console.log('Updated agent:', updatedAgent);
      console.log('Calling onSave...');
      await onSave(updatedAgent);
      console.log('onSave completed successfully');

      // Сохраняем расширенные настройки отдельно
      if (advancedData?.advancedSettings) {
        try {
          await agentService.updateAdvancedSettings(agent.id, advancedData.advancedSettings);
          console.log('Advanced settings saved successfully');
        } catch (advancedError) {
          console.error('Failed to save advanced settings:', advancedError);
        }
      }

      // Показываем toast об успешном сохранении с названием агента
      showToast('success', t('agentEditor.notifications.settingsSavedFor', { name: updatedAgent.name }));

      // Создаём уведомление
      try {
        await notificationsService.createNotification({
          type: 'success',
          titleKey: 'agentEditor.notifications.agentSettingsSaved',
          messageKey: 'agentEditor.notifications.agentSettingsUpdated',
          params: { name: updatedAgent.name },
        });
      } catch (e) { /* ignore */ }

      // Commit pending document changes (uploads and deletes)
      if (basicSettingsRef.current?.hasPendingDocumentChanges?.()) {
        console.log('Committing pending document changes...');
        try {
          await basicSettingsRef.current.commitDocumentChanges(agent.id);
          console.log('Document changes committed successfully');
        } catch (docError: any) {
          console.error('Error committing document changes:', docError);
          // Don't fail the entire save, just show a warning
          setSaveError(docError.message || t('agentEditor.notifications.someDocsError'));
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('agentEditor.notifications.saveError');
      setSaveError(errorMessage);
      showToast('error', errorMessage);
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Integration Handlers ---
  const handleKommoActiveChange = async (isActive: boolean) => {
    if (!agent) return;

    try {
      setKommoActive(isActive);
      await integrationsService.upsertIntegration(
        agent.id,
        'kommo',
        isActive,
        kommoConnected
      );

      // Обновляем массив интеграций после успешного создания
      await refreshIntegrations();

      // Создаём уведомление
      const status = isActive ? t('agentEditor.integrations.enabled') : t('agentEditor.integrations.disabled');
      try {
        await notificationsService.createNotification({
          type: 'info',
          title: t('agentEditor.notifications.kommoIntegration'),
          message: t('agentEditor.notifications.kommoIntegrationStatus', { status, name: agent.name }),
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Failed to update Kommo integration:', error);
      // Откатываем изменение в случае ошибки
      setKommoActive(!isActive);
      showToast('error', t('agentEditor.integrations.updateError'));
    }
  };

  const handleGoogleCalendarActiveChange = async (isActive: boolean) => {
    if (!agent) return;

    try {
      setGoogleCalendarActive(isActive);
      await integrationsService.upsertIntegration(
        agent.id,
        'google_calendar',
        isActive,
        googleCalendarConnected
      );

      // Обновляем массив интеграций после успешного создания
      await refreshIntegrations();

      // Создаём уведомление
      const status = isActive ? t('agentEditor.integrations.enabled') : t('agentEditor.integrations.disabled');
      try {
        await notificationsService.createNotification({
          type: 'info',
          title: t('agentEditor.notifications.googleCalendarIntegration'),
          message: t('agentEditor.notifications.googleCalendarIntegrationStatus', { status, name: agent.name }),
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Failed to update Google Calendar integration:', error);
      // Откатываем изменение в случае ошибки
      setGoogleCalendarActive(!isActive);
      showToast('error', t('agentEditor.integrations.updateError'));
    }
  };

  // --- CRM Sync Handler ---
  const handleSyncCRM = async () => {
    if (!agent) return;

    try {
      setIsSaving(true);

      // Найти интеграцию Kommo
      const kommoIntegration = integrations.find((i: any) => i.integrationType === 'kommo');

      if (!kommoIntegration) {
        showToast('error', t('agentEditor.integrations.integrationNotFound'));
        return;
      }

      // Используем новый endpoint для синхронизации Kommo
      const result = await integrationsService.syncKommo(agent.id, kommoIntegration.id);
      setKommoConnected(true);

      console.log('CRM синхронизирована:', result);

      showToast('success', `${t('agentEditor.integrations.syncSuccess')} (${t('agentEditor.integrations.syncPipelines')} ${result.stats.pipelines}, ${t('agentEditor.integrations.syncUsers')} ${result.stats.users})`);

      // Reload page to update agent with new crmData
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to sync CRM:', error);
      const errorMessage = error.response?.data?.message || error.message || t('agentEditor.integrations.unknownError');
      showToast('error', `${t('agentEditor.integrations.syncError')}: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Cancel Handler ---
  const handleCancel = () => {
    localStorage.removeItem('agentEditorActiveTab');
    onCancel();
  };

  // --- Chains Data ---
  const [chains, setChains] = useState<Chain[]>([]);
  const [editingChainId, setEditingChainId] = useState<string | null>(null);
  const [deleteChainId, setDeleteChainId] = useState<string | null>(null);
  const [deleteTriggerIndex, setDeleteTriggerIndex] = useState<string | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());

  // --- Chain Modal Form State ---
  const [chainName, setChainName] = useState('');
  const [chainActive, setChainActive] = useState(true);

  // Chain Modal Accordions
  const [isChainConditionsOpen, setIsChainConditionsOpen] = useState(true);
  const [isChainStepsOpen, setIsChainStepsOpen] = useState(true);
  const [isChainScheduleOpen, setIsChainScheduleOpen] = useState(true);
  const [isChainSettingsOpen, setIsChainSettingsOpen] = useState(true);

  // Chain Conditions
  const [chainAllStages, setChainAllStages] = useState(false);
  const [chainStages, setChainStages] = useState<string[]>([]);
  const [chainExcludeCondition, setChainExcludeCondition] = useState('');

  // Chain Steps
  const [chainSteps, setChainSteps] = useState<ChainStep[]>([]);

  // Working Hours & Limits
  const [chainSchedule, setChainSchedule] = useState<WorkingDay[]>(DEFAULT_WORKING_HOURS);
  const [chainRunLimit, setChainRunLimit] = useState(0);

  // --- General State ---
  const [name, setName] = useState(agent?.name || 'АИ ассистент');
  const [isActive, setIsActive] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState(
    `ОТВЕЧАЙ ТОЛЬКО НА АНГЛИЙСКОМ ЯЗЫКЕ - ВСЕГДА !!`
  );

  // Pipelines State
  const [activePipelines, setActivePipelines] = useState<Record<string, boolean>>({ 'sales_funnel_1': true });
  const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({ 'sales_funnel_1': true });
  const [pipelineStages, setPipelineStages] = useState<Record<string, string[]>>({
    'sales_funnel_1': ['new_lead', 'qualification', 'social_media']
  });

  // Channels & KB State
  const [channelsAll, setChannelsAll] = useState(false);
  const [kbAllCategories, setKbAllCategories] = useState(false);
  const [kbCreateTask, setKbCreateTask] = useState(false);
  const [kbNoAnswerMessage, setKbNoAnswerMessage] = useState('Ответ на этот вопрос предоставит ваш персональный immigration advisor, когда свяжется с вами напрямую.');

  // Deals Tab State
  const [readDealFields, setReadDealFields] = useState<string[]>(['stage_id']);
  const [readContactFields, setReadContactFields] = useState<string[]>(['f_name']);
  const [isDealAccessOpen, setIsDealAccessOpen] = useState(true);
  const [isContactAccessOpen, setIsContactAccessOpen] = useState(true);
  const [isDealRulesOpen, setIsDealRulesOpen] = useState(true);
  const [isContactRulesOpen, setIsContactRulesOpen] = useState(true);
  const [dealUpdateRules, setDealUpdateRules] = useState<UpdateRule[]>([{ id: '1', fieldId: '', condition: '', overwrite: false }]);
  const [contactUpdateRules, setContactUpdateRules] = useState<UpdateRule[]>([{ id: '1', fieldId: '', condition: '', overwrite: true }]);

  // --- Helpers ---
  const toggleSelection = (id: string, currentList: string[], setter: (l: string[]) => void) => {
    if (currentList.includes(id)) setter(currentList.filter(item => item !== id));
    else setter([...currentList, id]);
  };

  const getStageName = (pipelineId: string, stageId: string) => {
    const pipe = availablePipelines.find(p => p.id === pipelineId);
    return pipe?.stages.find(s => s.id === stageId)?.name || stageId;
  };

  const getFieldName = (fieldId: string) => {
    return MOCK_CRM_FIELDS.find(f => f.id === fieldId)?.label || fieldId;
  };

  // Chain Helpers
  const addChainStep = () => {
    setChainSteps(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      delayValue: 20,
      delayUnit: 'Минуты',
      actions: [{ id: Math.random().toString(36).substr(2, 9), type: 'generate_message', instruction: '' }]
    }]);
  };

  const removeChainStep = (stepId: string) => {
    setChainSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const addChainAction = (stepId: string) => {
    setChainSteps(prev => prev.map(s => {
      if (s.id === stepId) {
        return { ...s, actions: [...s.actions, { id: Math.random().toString(36).substr(2, 9), type: 'generate_message', instruction: '' }] };
      }
      return s;
    }));
  };

  const removeChainAction = (stepId: string, actionId: string) => {
    setChainSteps(prev => prev.map(s => {
      if (s.id === stepId) {
        return { ...s, actions: s.actions.filter(a => a.id !== actionId) };
      }
      return s;
    }));
  };

  const updateChainActionParams = (stepId: string, actionId: string, params: Record<string, any>) => {
    setChainSteps(prev => prev.map(step =>
      step.id === stepId
        ? {
            ...step,
            actions: step.actions.map(action =>
              action.id === actionId
                ? { ...action, params: { ...action.params, ...params } }
                : action
            )
          }
        : step
    ));
  };

  const toggleWorkingDay = (day: string) => {
    setChainSchedule(prev => prev.map(d => d.day === day ? { ...d, enabled: !d.enabled } : d));
  };

  const toggleChainStatus = async (id: string) => {
    if (!agent?.id) return;
    const chain = chains.find(c => c.id === id);
    if (!chain) return;

    const wasActive = chain.isActive;

    // Optimistic update - сначала UI, потом сервер
    setChains(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));

    try {
      await chainsService.toggleChain(agent.id, id);
      // Создаём уведомление
      const status = wasActive ? t('agentEditor.integrations.disabled') : t('agentEditor.integrations.enabled');
      try {
        await notificationsService.createNotification({
          type: 'info',
          title: t('agentEditor.notifications.chainStatusTitle'),
          message: t('agentEditor.notifications.chainStatusMessage', { name: chain.name, status }),
        });
      } catch (e) { /* ignore */ }
    } catch (error) {
      // Revert on error
      setChains(prev => prev.map(c => c.id === id ? { ...c, isActive: wasActive } : c));
      console.error('Failed to toggle chain:', error);
      showToast('error', t('agentEditor.chains.toggleError'));
    }
  };

  const handleCreateChain = () => {
    setEditingChainId(null);
    setChainName('');
    setChainActive(true);
    setChainAllStages(false);
    setChainStages([]);
    setChainExcludeCondition('');
    setChainSteps([{
      id: Math.random().toString(36).substr(2, 9),
      delayValue: 20,
      delayUnit: 'Минуты',
      actions: [{ id: Math.random().toString(36).substr(2, 9), type: 'generate_message', instruction: '' }]
    }]);
    setChainSchedule(DEFAULT_WORKING_HOURS);
    setChainRunLimit(0);
    setIsChainModalOpen(true);
  };

  const handleEditChain = (chain: Chain) => {
    setEditingChainId(chain.id);
    setChainName(chain.name);
    setChainActive(chain.isActive);
    setChainAllStages(chain.conditionType === 'all');
    setChainStages(chain.conditionStages || []);
    setChainExcludeCondition(chain.conditionExclude || '');
    setChainSteps(chain.steps);
    setChainSchedule(chain.schedule);
    setChainRunLimit(chain.runLimit || 0);
    setIsChainModalOpen(true);
  };

  const handleSaveChain = async () => {
    if (!agent?.id || isSavingChain) return;
    setIsSavingChain(true);

    // Маппинг frontend -> backend
    const backendData = {
      name: chainName,
      isActive: chainActive,
      conditionType: (chainAllStages ? 'all' : 'specific') as 'all' | 'specific',
      conditionStages: chainStages,
      conditionExclude: chainExcludeCondition,
      steps: chainSteps.map(s => ({
        delayValue: s.delayValue,
        delayUnit: s.delayUnit,
        actions: s.actions.map(a => ({
          actionType: a.type,
          instruction: a.instruction,
          params: a.params || {},
        })),
      })),
      schedule: chainSchedule,
      runLimit: chainRunLimit,
    };

    try {
      if (editingChainId) {
        await chainsService.updateChain(agent.id, editingChainId, backendData);
      } else {
        await chainsService.createChain(agent.id, backendData);
      }

      // Перезагружаем список цепочек
      const data = await chainsService.getChains(agent.id);
      const formattedChains: Chain[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        conditionType: c.conditionType || 'all',
        conditionStages: c.conditions?.map((cond: any) => cond.stageId) || [],
        conditionExclude: c.conditionExclude || '',
        steps: c.steps?.map((s: any) => ({
          id: s.id,
          delayValue: s.delayValue,
          delayUnit: s.delayUnit,
          actions: s.actions?.map((a: any) => ({
            id: a.id,
            type: a.actionType,
            instruction: a.instruction,
            params: a.params || {},
          })) || [],
        })) || [],
        schedule: c.schedules?.map((sch: any) => ({
          day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][sch.dayOfWeek] || 'Пн',
          enabled: true,
          start: sch.startTime || '09:00',
          end: sch.endTime || '22:00',
        })) || DEFAULT_WORKING_HOURS,
        runLimit: c.runLimit || 0,
      }));
      setChains(formattedChains);
      setIsChainModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save chain:', error);
      const errorMessage = error.response?.data?.message || error.message || t('agentEditor.chains.saveError');
      showToast('error', errorMessage);
    } finally {
      setIsSavingChain(false);
    }
  };

  const handleDeleteChain = async (id: string) => {
    if (!agent?.id) return;

    try {
      await chainsService.deleteChain(agent.id, id);
      setChains(prev => prev.filter(c => c.id !== id));
      setDeleteChainId(null);
    } catch (error) {
      console.error('Failed to delete chain:', error);
      showToast('error', t('agentEditor.chains.deleteError'));
    }
  };

  // --- Trigger Modal Form State ---
  const [triggerName, setTriggerName] = useState('');
  const [triggerActive, setTriggerActive] = useState(true);
  const [triggerCondition, setTriggerCondition] = useState('');
  const [triggerActions, setTriggerActions] = useState<TriggerAction[]>([{ id: '1', action: '', params: {} }]);
  const [triggerCancelMessage, setTriggerCancelMessage] = useState('');
  const [triggerRunLimit, setTriggerRunLimit] = useState(0);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [triggerLimit, setTriggerLimit] = useState(0);
  const [newTagInput, setNewTagInput] = useState<{ [key: string]: string }>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: { name: string; size: number }[] }>({});

  const addTriggerAction = () => setTriggerActions(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), action: '', params: {} }]);
  const removeTriggerAction = (id: string) => setTriggerActions(prev => prev.filter(a => a.id !== id));
  const updateTriggerAction = (id: string, val: string) => setTriggerActions(prev => prev.map(a => a.id === id ? { ...a, action: val, params: {} } : a));
  const updateTriggerActionParams = (id: string, params: Partial<TriggerActionParams>) => {
    setTriggerActions(prev => prev.map(a => a.id === id ? { ...a, params: { ...a.params, ...params } } : a));
  };
  const moveTriggerAction = (index: number, direction: 'up' | 'down') => {
    setTriggerActions(prev => {
      const newActions = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newActions.length) return prev;
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      return newActions;
    });
  };
  const toggleTriggerStatus = async (id: string) => {
    if (!agent?.id) return;
    const trigger = triggers.find(t => t.id === id);
    const wasActive = trigger?.isActive;

    // Оптимистичное обновление UI
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));

    try {
      await triggersService.toggleTrigger(agent.id, id);
      // Создаём уведомление
      if (trigger) {
        const status = wasActive ? t('agentEditor.integrations.disabled') : t('agentEditor.integrations.enabled');
        try {
          await notificationsService.createNotification({
            type: 'info',
            title: t('agentEditor.notifications.triggerStatusTitle'),
            message: t('agentEditor.notifications.triggerStatusMessage', { name: trigger.name, status }),
          });
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
      // Откатываем изменения при ошибке
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
    }
  };

  const handleCreateTrigger = () => {
    setEditingTriggerId(null);
    setTriggerName('');
    setTriggerActive(true);
    setTriggerCondition('');
    setTriggerActions([{ id: '1', action: '', params: {} }]);
    setTriggerCancelMessage('');
    setTriggerRunLimit(0);
    setNewTagInput({});
    setSelectedFiles({});
    setIsTriggerModalOpen(true);
  };

  const handleEditTrigger = (trigger: Trigger) => {
    setEditingTriggerId(trigger.id);
    setTriggerName(trigger.name);
    setTriggerActive(trigger.isActive);
    setTriggerCondition(trigger.condition);
    // Ensure backwards compatibility with old trigger format
    setTriggerActions(trigger.actions.map(a => ({
      ...a,
      params: a.params || {}
    })));
    setTriggerCancelMessage(trigger.cancelMessage || '');
    setTriggerRunLimit(trigger.runLimit || 0);
    setNewTagInput({});
    setSelectedFiles({});
    setIsTriggerModalOpen(true);
  };

  const handleDeleteTrigger = async (id: string) => {
    if (!agent?.id) return;

    try {
      await triggersService.deleteTrigger(agent.id, id);
      setTriggers(prev => prev.filter(t => t.id !== id));
      setDeleteTriggerIndex(null);
    } catch (error) {
      console.error('Failed to delete trigger:', error);
      showToast('error', t('agentEditor.triggers.deleteError'));
    }
  };

  const handleSaveTrigger = async () => {
    if (!agent?.id || isSavingTrigger) return;

    // Валидация обязательных полей
    if (!triggerName.trim()) {
      showToast('error', t('agentEditor.triggers.validation.nameRequired'));
      return;
    }
    if (!triggerCondition.trim()) {
      showToast('error', t('agentEditor.triggers.validation.conditionRequired'));
      return;
    }
    // Проверяем что есть хотя бы одно действие с выбранным типом
    const validActions = triggerActions.filter(a => a.action && a.action.trim() !== '');
    if (validActions.length === 0) {
      showToast('error', t('agentEditor.triggers.validation.actionRequired'));
      return;
    }

    // Валидация обязательных параметров для каждого действия
    for (const action of validActions) {
      switch (action.action) {
        case 'change_stage':
          if (!action.params?.stageId) {
            showToast('error', t('agentEditor.triggers.validation.stageRequired'));
            return;
          }
          break;
        case 'assign_user':
          if (!action.params?.userId) {
            showToast('error', t('agentEditor.triggers.validation.userRequired'));
            return;
          }
          break;
        case 'create_task':
          if (!action.params?.taskDescription?.trim()) {
            showToast('error', t('agentEditor.triggers.validation.taskRequired'));
            return;
          }
          break;
        case 'run_salesbot':
          if (!action.params?.salesbotId) {
            showToast('error', t('agentEditor.triggers.validation.salesbotRequired'));
            return;
          }
          break;
        case 'add_deal_tags':
        case 'add_contact_tags':
          if (!action.params?.tags || action.params.tags.length === 0) {
            showToast('error', t('agentEditor.triggers.validation.tagsRequired'));
            return;
          }
          break;
        case 'add_deal_note':
        case 'add_contact_note':
          if (!action.params?.noteText?.trim()) {
            showToast('error', t('agentEditor.triggers.validation.noteRequired'));
            return;
          }
          break;
        case 'send_message':
          if (!action.params?.messageText?.trim()) {
            showToast('error', t('agentEditor.triggers.validation.messageRequired'));
            return;
          }
          break;
        case 'send_email':
          if (!action.params?.emailInstructions?.trim()) {
            showToast('error', t('agentEditor.triggers.validation.emailRequired'));
            return;
          }
          break;
        case 'send_files':
          if (!action.params?.fileUrls || action.params.fileUrls.length === 0) {
            showToast('error', t('agentEditor.triggers.validation.filesRequired'));
            return;
          }
          break;
        case 'send_webhook':
          if (!action.params?.webhookUrl?.trim()) {
            showToast('error', t('agentEditor.triggers.validation.webhookRequired'));
            return;
          }
          break;
        case 'send_kb_article':
          if (!action.params?.articleId) {
            showToast('error', t('agentEditor.triggers.validation.articleRequired'));
            return;
          }
          break;
      }
    }

    const triggerRequest = {
      name: triggerName.trim(),
      isActive: triggerActive,
      condition: triggerCondition.trim(),
      actions: validActions.map(a => ({
        action: a.action,
        params: a.params,
      })),
      cancelMessage: triggerCancelMessage || undefined,
      runLimit: triggerRunLimit || undefined,
    };

    setIsSavingTrigger(true);
    try {
      if (editingTriggerId) {
        // Обновляем существующий триггер
        const updated = await triggersService.updateTrigger(agent.id, editingTriggerId, triggerRequest);
        const formattedTrigger: Trigger = {
          id: updated.id,
          name: updated.name,
          isActive: updated.isActive,
          condition: updated.condition,
          actions: updated.actions.map((a: any) => ({
            id: a.id,
            action: a.action,
            params: a.params || {},
          })),
          cancelMessage: updated.cancelMessage,
          runLimit: updated.runLimit,
        };
        setTriggers(prev => prev.map(t => t.id === editingTriggerId ? formattedTrigger : t));
      } else {
        // Создаем новый триггер
        const created = await triggersService.createTrigger(agent.id, triggerRequest);
        const formattedTrigger: Trigger = {
          id: created.id,
          name: created.name,
          isActive: created.isActive,
          condition: created.condition,
          actions: created.actions.map((a: any) => ({
            id: a.id,
            action: a.action,
            params: a.params || {},
          })),
          cancelMessage: created.cancelMessage,
          runLimit: created.runLimit,
        };
        setTriggers(prev => [...prev, formattedTrigger]);
      }
      setIsTriggerModalOpen(false);
    } catch (error) {
      console.error('Failed to save trigger:', error);
      showToast('error', t('agentEditor.triggers.saveError'));
    } finally {
      setIsSavingTrigger(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        // При клике на вкладку "Интеграции" возвращаемся к списку интеграций
        if (id === 'integrations') {
          setIntegrationView('list');
        }
      }}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === id
        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
        }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  // Breadcrumbs
  const renderBreadcrumbs = () => {
    if (activeTab === 'integrations' && integrationView !== 'list') {
      const integrationName = integrationView === 'kommo' ? 'Kommo' : 'Google Calendar';
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>{t('agentEditor.breadcrumb.aiAgents')}</span>
          <span>/</span>
          <span>{name}</span>
          <span>/</span>
          <span>{t('agentEditor.breadcrumb.integrations')}</span>
          <span>/</span>
          <span>{integrationName}</span>
        </div>
      );
    }

    if (activeTab === 'advanced') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>{t('agentEditor.breadcrumb.aiAgents')}</span>
          <span>/</span>
          <span>{name}</span>
          <span>/</span>
          <span>{t('agentEditor.breadcrumb.editing')}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
        <span>{t('agentEditor.breadcrumb.aiAgents')}</span>
        <span>/</span>
        <span>{name}</span>
        <span>/</span>
        <span>{
          activeTab === 'main' ? t('agentEditor.tabs.main') :
            activeTab === 'deals' ? t('agentEditor.tabs.deals') :
              activeTab === 'triggers' ? t('agentEditor.tabs.triggers') :
                activeTab === 'chains' ? t('agentEditor.tabs.chains') :
                  activeTab === 'integrations' ? t('agentEditor.tabs.integrations') :
                    activeTab === 'advanced' ? t('agentEditor.tabs.advanced') : t('agentEditor.breadcrumb.editing')
        }</span>
      </div>
    );
  };

  const renderPageTitle = () => {
    if (activeTab === 'integrations' && integrationView !== 'list') {
      return integrationView === 'kommo' ? 'Kommo' : 'Google Calendar';
    }

    return activeTab === 'chains' ? t('agentEditor.chains.title') :
      activeTab === 'triggers' ? t('agentEditor.triggers.title') :
        activeTab === 'deals' ? t('agentEditor.tabs.deals') :
          activeTab === 'integrations' ? t('agentEditor.integrations.title') :
            activeTab === 'advanced' ? t('agentEditor.tabs.advanced') : `${t('agentEditor.breadcrumb.editing')} ${name}`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {renderBreadcrumbs()}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {renderPageTitle()}
          </h1>
        </div>
        {activeTab === 'main' && (
          <button className="bg-[#DC2626] hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            {t('common.delete')}
          </button>
        )}
      </div>

      {/* Tabs Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
        {/* Tabs - Modern glassmorphism style */}
        <div className="flex justify-center p-2">
          <div className="inline-flex items-center gap-1 p-1.5 bg-gray-100/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl">
            <TabButton id="main" label={t('agentEditor.tabs.main')} icon={Settings} />
            <TabButton id="deals" label={t('agentEditor.tabs.deals')} icon={Users} />
            <TabButton id="triggers" label={t('agentEditor.tabs.triggers')} icon={Zap} />
            <TabButton id="chains" label={t('agentEditor.tabs.chains')} icon={Clock} />
            <TabButton id="integrations" label={t('agentEditor.tabs.integrations')} icon={Puzzle} />
            <TabButton id="advanced" label={t('agentEditor.tabs.advanced')} icon={FilePenLine} />
          </div>
        </div>

        {/* Tab Content: Advanced */}
        {activeTab === 'advanced' && (
          <>
            <AgentAdvancedSettings ref={advancedSettingsRef} agent={agent} />

            {/* Footer Actions (Advanced) */}
            <div className="flex items-center gap-4 p-6 pt-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-3 rounded-md text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <button
                onClick={handleCancel}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </>
        )}

        {/* Old Advanced tab content removed - now in AgentAdvancedSettings component */}
        {/* ... (Previous Tab Contents: Integrations, Chains, etc.) ... */}
        {activeTab === 'integrations' && (
          <div className="p-6 space-y-6">
            {/* List View */}
            {integrationView === 'list' && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder={t('common.search')}
                      className="pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Table */}
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('agentEditor.integrations.integration')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('agentEditor.integrations.installed')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">{t('agentEditor.integrations.active')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Google Calendar Row */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Google Calendar</td>
                      <td className="px-6 py-4">
                        {googleCalendarConnected ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <Minus size={20} className="text-gray-300 dark:text-gray-600" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {googleCalendarActive ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <XCircle size={20} className="text-gray-300 dark:text-gray-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setIntegrationView('google_calendar')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center justify-end gap-1 text-sm font-medium"
                        >
                          <Settings size={16} /> {t('agentEditor.integrations.settings')}
                        </button>
                      </td>
                    </tr>
                    {/* Kommo Row */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Kommo</td>
                      <td className="px-6 py-4">
                        {kommoConnected ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <Minus size={20} className="text-gray-300 dark:text-gray-600" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {kommoActive ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <XCircle size={20} className="text-gray-300 dark:text-gray-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setIntegrationView('kommo')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center justify-end gap-1 text-sm font-medium"
                        >
                          <Settings size={16} /> {t('agentEditor.integrations.settings')}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Kommo Settings View */}
            {integrationView === 'kommo' && (
              <>
                {!kommoConnected ? (
                  /* Sekция "Не подключено" - современный дизайн */
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <LinkIcon size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.integrations.kommoTitle')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.integrations.kommoDescription')}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('agentEditor.integrations.howToGetToken')}</h4>
                      <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                          <span>{t('agentEditor.integrations.step1')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                          <span>{t('agentEditor.integrations.step2')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                          <span>{t('agentEditor.integrations.step3')}</span>
                        </li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="kommoTokenInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('agentEditor.integrations.longTermToken')}
                        </label>
                        <textarea
                          id="kommoTokenInput"
                          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-300 resize-none"
                          rows={3}
                          placeholder={t('agentEditor.integrations.pasteTokenHere')}
                        />
                      </div>

                      <button
                        onClick={async () => {
                          if (!agent) {
                            showToast('error', t('agentEditor.integrations.errorAgentNotLoaded'));
                            return;
                          }

                          const tokenInput = document.getElementById('kommoTokenInput') as HTMLTextAreaElement;
                          const token = tokenInput?.value.trim();

                          if (!token) {
                            showToast('error', t('agentEditor.integrations.pasteTokenError'));
                            return;
                          }

                          setIsSaving(true);
                          try {
                            let kommoIntegration = integrations.find((i: any) => i.integrationType === 'kommo');

                            if (!kommoIntegration) {
                              kommoIntegration = await integrationsService.upsertIntegration(
                                agent.id,
                                'kommo',
                                true,
                                false
                              );
                              await refreshIntegrations();
                            }

                            await integrationsService.connectKommoWithToken(kommoIntegration.id, token);

                            // Auto-enable toggle
                            setKommoConnected(true);
                            setKommoActive(true);
                            await integrationsService.upsertIntegration(agent.id, 'kommo', true, true);
                            await refreshIntegrations();

                            tokenInput.value = '';
                            showToast('success', t('agentEditor.integrations.kommoConnected'));
                          } catch (error: any) {
                            console.error('Failed to connect with token:', error);
                            showToast('error', `${t('agentEditor.integrations.error')} ${error.response?.data?.message || error.message}`);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] disabled:bg-[#0078D4]/50 text-white rounded-md px-6 py-2.5 transition-colors font-medium text-sm shadow-sm"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            {t('agentEditor.integrations.connecting')}
                          </>
                        ) : (
                          <>
                            <LinkIcon size={18} />
                            {t('agentEditor.integrations.connectKommo')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Секция "Подключено" - минималистичный стиль */
                  <div className="space-y-4">
                    {/* Status Card */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <CheckCircle size={22} className="text-green-500" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('agentEditor.integrations.kommoConnectedTitle')}</h3>
                            <p className="text-sm text-green-600 dark:text-green-400">{t('agentEditor.integrations.integrationActive')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowKommoDisconnectModal(true)}
                          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          {t('agentEditor.integrations.disconnect')}
                        </button>
                      </div>
                    </div>

                    {/* Synced Data Accordion */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setSyncDataExpanded(!syncDataExpanded)}
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <Database size={20} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t('agentEditor.integrations.syncedData')}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {(kommoSyncStats?.pipelines || 0) + (kommoSyncStats?.stages || 0) + (kommoSyncStats?.users || 0) + (kommoSyncStats?.dealFields || 0) + (kommoSyncStats?.contactFields || 0) + (kommoSyncStats?.channels || 0)} {t('agentEditor.integrations.totalItems')}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          size={20}
                          className={`text-gray-400 transition-transform duration-200 ${syncDataExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <div className={`transition-all duration-200 ease-in-out ${syncDataExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="px-5 pb-5">
                          {/* Stats List */}
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl divide-y divide-gray-200 dark:divide-gray-600 overflow-hidden">
                            {/* Pipelines */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <Briefcase size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.salesPipelines')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.pipelines || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>

                            {/* Stages */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <GitBranch size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.pipelineStages')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.stages || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>

                            {/* Users */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <Users size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.crmUsers')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.users || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>

                            {/* Deal Fields */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <FileText size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.dealFields')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.dealFields || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>

                            {/* Contact Fields */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <User size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.contactFields')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.contactFields || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>

                            {/* Channels */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                  <Phone size={18} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.integrations.communicationChannels')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{kommoSyncStats?.channels || 0}</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                              </div>
                            </button>
                          </div>

                          {/* Last Sync Info */}
                          {kommoSyncStats?.lastSync && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={14} />
                              <span>{t('agentEditor.integrations.lastSync')} {new Date(kommoSyncStats.lastSync).toLocaleString()}</span>
                            </div>
                          )}

                          {/* Sync Button */}
                          <button
                            onClick={async () => {
                              if (!agent) return;
                              setIsSaving(true);
                              try {
                                await integrationsService.syncKommo(agent.id, '');
                                const stats = await integrationsService.getKommoSyncStats(agent.id);
                                setKommoSyncStats(stats);
                                showToast('success', t('agentEditor.integrations.syncCompleted'));
                              } catch (error: any) {
                                console.error('Failed to sync:', error);
                                showToast('error', `${t('agentEditor.integrations.syncErrorMessage')} ${error.message}`);
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                            disabled={isSaving}
                            className="mt-4 inline-flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] disabled:bg-[#0078D4]/50 text-white rounded-lg px-5 py-2.5 transition-colors font-medium text-sm"
                          >
                            <RefreshCw size={16} className={isSaving ? 'animate-spin' : ''} />
                            {isSaving ? t('agentEditor.integrations.syncing') : t('agentEditor.integrations.sync')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* General Settings Card */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                          <Settings2 size={20} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('agentEditor.integrations.generalSettings')}</h3>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.integrations.integrationActiveToggle')}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('agentEditor.integrations.integrationActiveDesc')}</p>
                          </div>
                          <Toggle checked={kommoActive} onChange={handleKommoActiveChange} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <button
                    className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    onClick={() => setIntegrationView('list')}
                  >
                    {t('agentEditor.integrations.saveChanges')}
                  </button>
                  <button
                    onClick={() => setIntegrationView('list')}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}

            {/* Google Calendar Settings View */}
            {integrationView === 'google_calendar' && (
              <>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.integrations.connectedEmployees')}</h3>
                    <div className="flex items-center gap-3">
                      <Toggle checked={googleCalendarActive} onChange={handleGoogleCalendarActiveChange} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {googleCalendarActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                  </div>

                  {/* Employees List */}
                  <div className="space-y-3 mb-6">
                    {calendarEmployees.length === 0 ? (
                      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <Calendar className="mx-auto mb-3 text-gray-400" size={32} />
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('agentEditor.integrations.noEmployees')}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{t('agentEditor.integrations.noEmployeesHint')}</p>
                      </div>
                    ) : (
                      calendarEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-750"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              employee.status === 'connected'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-amber-100 dark:bg-amber-900/30'
                            }`}>
                              <User size={20} className={
                                employee.status === 'connected'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              } />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{employee.crmUserName}</p>
                              {employee.status === 'connected' ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{employee.googleEmail}</p>
                              ) : (
                                <p className="text-xs text-amber-600 dark:text-amber-400">{t('agentEditor.integrations.awaitingAuthorization')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {employee.status === 'connected' ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                {t('agentEditor.integrations.connected')}
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  // Regenerate invite and show URL
                                  setSelectedCrmUser({ id: employee.crmUserId, name: employee.crmUserName });
                                  googleCalendarService.createInvite(agent!.id, employee.crmUserId, employee.crmUserName)
                                    .then(response => {
                                      setInviteUrl(response.inviteUrl);
                                    })
                                    .catch(err => console.error('Failed to regenerate invite:', err));
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                              >
                                {t('agentEditor.integrations.getLink')}
                              </button>
                            )}
                            <button
                              onClick={() => setEmployeeToDelete(employee)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Employee Button */}
                  <button
                    onClick={() => setIsAddEmployeeModalOpen(true)}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    <Plus size={18} />
                    {t('agentEditor.integrations.addEmployee')}
                  </button>
                </div>

                {/* Invite URL Display */}
                {inviteUrl && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      {t('agentEditor.integrations.authLinkFor', { name: selectedCrmUser?.name })}
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteUrl);
                          showToast('success', t('agentEditor.integrations.linkCopied'));
                        }}
                        className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium shadow-sm transition-colors"
                      >
                        {t('agentEditor.integrations.copy')}
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                      {t('agentEditor.integrations.sendLinkToEmployee')}
                    </p>
                    <button
                      onClick={() => {
                        setInviteUrl(null);
                        setSelectedCrmUser(null);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <button
                    className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    onClick={() => setIntegrationView('list')}
                  >
                    {t('agentEditor.integrations.done')}
                  </button>
                  <button
                    onClick={() => setIntegrationView('list')}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    {t('agentEditor.integrations.back')}
                  </button>
                </div>

                {/* Add Employee Modal */}
                {isAddEmployeeModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
                      setIsAddEmployeeModalOpen(false);
                      setSelectedCrmUser(null);
                      setInviteUrl(null);
                    }} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('agentEditor.integrations.addEmployee')}</h3>
                        <button
                          onClick={() => {
                            setIsAddEmployeeModalOpen(false);
                            setSelectedCrmUser(null);
                            setInviteUrl(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('agentEditor.integrations.selectCrmEmployee')}
                        </label>
                        <select
                          value={selectedCrmUser?.id || ''}
                          onChange={(e) => {
                            const users = crmData?.users || MOCK_USERS;
                            const user = users.find((u: any) => u.id === e.target.value);
                            if (user) {
                              setSelectedCrmUser({ id: user.id, name: user.name });
                            }
                          }}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">{t('agentEditor.integrations.selectEmployee')}</option>
                          {(crmData?.users || MOCK_USERS).map((user: any) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>

                        {selectedCrmUser && !inviteUrl && (
                          <button
                            onClick={async () => {
                              if (!agent?.id || !selectedCrmUser) return;
                              setIsCreatingInvite(true);
                              try {
                                const response = await googleCalendarService.createInvite(
                                  agent.id,
                                  selectedCrmUser.id,
                                  selectedCrmUser.name
                                );
                                setInviteUrl(response.inviteUrl);
                                // Refresh employees list
                                const employees = await googleCalendarService.getEmployees(agent.id);
                                setCalendarEmployees(employees);
                              } catch (error: any) {
                                showToast('error', error.response?.data?.message || t('agentEditor.integrations.inviteCreationError'));
                              } finally {
                                setIsCreatingInvite(false);
                              }
                            }}
                            disabled={isCreatingInvite}
                            className="mt-4 w-full bg-[#0078D4] hover:bg-[#006cbd] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            {isCreatingInvite ? t('agentEditor.integrations.creatingInvite') : t('agentEditor.integrations.createInviteLink')}
                          </button>
                        )}

                        {inviteUrl && (
                          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">{t('agentEditor.integrations.linkCreated')}</p>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                readOnly
                                value={inviteUrl}
                                className="flex-1 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-600 rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteUrl);
                                  showToast('success', t('agentEditor.integrations.linkCopied'));
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                              >
                                {t('agentEditor.integrations.copy')}
                              </button>
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-400">
                              {t('agentEditor.integrations.sendLinkTo', { name: selectedCrmUser?.name })}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            setIsAddEmployeeModalOpen(false);
                            setSelectedCrmUser(null);
                            setInviteUrl(null);
                          }}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {t('common.close')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Main Content based on Tab (Main, Deals, Triggers covered above) */}
        {/* ... (Previous tab content remains, Chains tab rendered above) ... */}

        {/* Content for Main/Deals/Triggers preserved by React state rendering but code structure implies they are peers */}
        {activeTab === 'main' && (
          <div className="p-6">
            <AgentBasicSettings
              ref={basicSettingsRef}
              agent={agent}
              onCancel={handleCancel}
              crmConnected={kommoConnected}
              kbCategories={kbCategories}
              kbArticles={kbArticles}
              onNavigateToKbArticles={() => onNavigate('kb-articles')}
              onSyncCRM={handleSyncCRM}
            />

            {/* Footer Actions */}
            <div className="flex items-center gap-4 pt-4 mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-3 rounded-md text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <button
                onClick={handleCancel}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="p-6">
            <AgentDealsContacts
              ref={dealsContactsRef}
              agent={agent}
              onCancel={onCancel}
              onSave={handleSave}
              crmConnected={kommoConnected}
              onSyncCRM={handleSyncCRM}
            />
          </div>
        )}

        {activeTab === 'triggers' && (
          // ... (Triggers tab content code - reused from previous turn)
          <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 flex items-center justify-between">
              <div><h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('agentEditor.triggers.title')}</h2><p className="text-sm text-gray-500">{t('agentEditor.triggers.subtitle')}</p></div>
              <button onClick={handleCreateTrigger} className="bg-[#0078D4] text-white px-4 py-2 rounded-md text-sm font-medium">{t('common.create')}</button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
              {triggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.triggers.empty')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.triggers.emptyHint')}</p>
                </div>
              ) : (
                <table className="w-full"><thead className="bg-gray-50 dark:bg-gray-750"><tr><th className="w-12 p-4"><input type="checkbox" checked={triggers.length > 0 && selectedTriggers.size === triggers.length} onChange={(e) => { if (e.target.checked) { setSelectedTriggers(new Set(triggers.map(t => t.id))); } else { setSelectedTriggers(new Set()); } }} className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('common.name')}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('common.active')}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('agentEditor.chains.actions')}</th><th className="px-4 py-3 text-right"></th></tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {triggers.map(trigger => (
                      <tr key={trigger.id} onClick={() => handleEditTrigger(trigger)} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${selectedTriggers.has(trigger.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedTriggers.has(trigger.id)} onChange={(e) => { const newSelected = new Set(selectedTriggers); if (e.target.checked) { newSelected.add(trigger.id); } else { newSelected.delete(trigger.id); } setSelectedTriggers(newSelected); }} className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{trigger.name}</td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}><Toggle checked={trigger.isActive} onChange={() => toggleTriggerStatus(trigger.id)} /></td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{trigger.actions?.length || 0}</td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                            <button onClick={() => handleEditTrigger(trigger)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title={t('common.edit')}>
                              <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleteTriggerIndex(trigger.id)} className="hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* Pagination */}
              {triggers.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6"><div className="text-sm text-gray-700 dark:text-gray-300">{t('agentEditor.chains.showingFromTo', { count: triggers.length, total: triggers.length })}</div></div>
              )}
            </div>
            {/* Trigger Modal */}
            {isTriggerModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsTriggerModalOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-colors animate-fadeIn">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingTriggerId ? t('agentEditor.triggers.editTrigger') : t('agentEditor.triggers.createTrigger')}</h2>
                    <button onClick={() => setIsTriggerModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Название */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('common.name')}<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={triggerName}
                        onChange={(e) => setTriggerName(e.target.value)}
                        placeholder={t('agentEditor.triggers.namePlaceholder')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Активно */}
                    <div className="flex items-center gap-3">
                      <Toggle checked={triggerActive} onChange={setTriggerActive} />
                      <span className="text-sm text-gray-900 dark:text-white">{t('common.active')}</span>
                    </div>

                    {/* Условие */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.triggers.condition')}<span className="text-red-500">*</span></label>
                      <textarea
                        value={triggerCondition}
                        onChange={(e) => setTriggerCondition(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 min-h-[80px]"
                        placeholder={t('agentEditor.triggers.conditionPlaceholder')}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggers.conditionHint')}</p>
                    </div>

                    {/* Действия */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.chains.actions')}<span className="text-red-500">*</span></label>
                      <div className="space-y-4">
                        {triggerActions.map((action, index) => {
                          const actionName = action.action ? t(`agentEditor.actions.${action.action}`) : '';
                          return (
                          <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {triggerActions.length > 1 && (
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      onClick={() => moveTriggerAction(index, 'up')}
                                      disabled={index === 0}
                                      className={`p-0.5 rounded ${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                      type="button"
                                      title={t('agentEditor.triggers.moveUp')}
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button
                                      onClick={() => moveTriggerAction(index, 'down')}
                                      disabled={index === triggerActions.length - 1}
                                      className={`p-0.5 rounded ${index === triggerActions.length - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                      type="button"
                                      title={t('agentEditor.triggers.moveDown')}
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                  </div>
                                )}
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">#{index + 1}</span>
                                {action.action && <span className="text-sm font-medium text-gray-900 dark:text-white">{actionName}</span>}
                              </div>
                              {triggerActions.length > 1 && (
                                <button
                                  onClick={() => setTriggerActions(triggerActions.filter((_, i) => i !== index))}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  type="button"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.selectAction')}<span className="text-red-500">*</span></label>
                                <select
                                  value={action.action}
                                  onChange={(e) => updateTriggerAction(action.id, e.target.value)}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                >
                                  <option value="">{t('agentEditor.triggers.selectOption')}</option>
                                  {availableActions.map((actionOption: any) => (
                                    <option key={actionOption.id} value={actionOption.id}>
                                      {t(`agentEditor.actions.${actionOption.id}`)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Dynamic fields based on action type */}
                              {action.action === 'change_stage' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.dealStage')}<span className="text-red-500">*</span></label>
                                  <select
                                    value={action.params?.stageId || ''}
                                    onChange={(e) => updateTriggerActionParams(action.id, { stageId: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                  >
                                    <option value="">{t('agentEditor.triggers.selectStage')}</option>
                                    {availablePipelines.map((pipeline: any) => (
                                      <optgroup key={pipeline.id} label={pipeline.name}>
                                        {pipeline.stages.map((stage: any) => (
                                          <option key={stage.id} value={stage.id}>{pipeline.name} - {stage.name}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {action.action === 'assign_user' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.applyTo')}<span className="text-red-500">*</span></label>
                                    <select
                                      value={action.params?.applyTo || 'deal'}
                                      onChange={(e) => updateTriggerActionParams(action.id, { applyTo: e.target.value as 'deal' | 'contact' | 'both' })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                    >
                                      <option value="deal">{t('agentEditor.triggers.deal')}</option>
                                      <option value="contact">{t('agentEditor.triggers.contact')}</option>
                                      <option value="both">{t('agentEditor.triggers.dealAndContact')}</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggers.applyToHint')}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.responsibleUser')}<span className="text-red-500">*</span></label>
                                    <select
                                      value={action.params?.userId || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { userId: e.target.value })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                    >
                                      <option value="">{t('agentEditor.triggers.selectResponsible')}</option>
                                      {(crmData?.users || MOCK_USERS).map((user: any) => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              )}

                              {action.action === 'create_task' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.taskDescription')}<span className="text-red-500">*</span></label>
                                    <input
                                      type="text"
                                      value={action.params?.taskDescription || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { taskDescription: e.target.value })}
                                      placeholder={t('agentEditor.triggers.taskPlaceholder')}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggers.responsibleUser')}</label>
                                    <select
                                      value={action.params?.taskUserId || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { taskUserId: e.target.value })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                    >
                                      <option value="">{t('agentEditor.triggers.selectResponsible')}</option>
                                      {(crmData?.users || MOCK_USERS).map((user: any) => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                      ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggers.taskUserHint')}</p>
                                  </div>
                                </>
                              )}

                              {action.action === 'run_salesbot' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">Salesbot<span className="text-red-500">*</span></label>
                                  <select
                                    value={action.params?.salesbotId || ''}
                                    onChange={(e) => updateTriggerActionParams(action.id, { salesbotId: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                  >
                                    <option value="">{t('agentEditor.triggers.selectSalesbot')}</option>
                                    {(crmData?.salesbots?.length ? crmData.salesbots : MOCK_SALESBOTS).map((bot: any) => (
                                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {(action.action === 'add_deal_tags' || action.action === 'add_contact_tags') && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">
                                    {action.action === 'add_deal_tags' ? t('agentEditor.triggers.dealTags') : t('agentEditor.triggers.contactTags')}<span className="text-red-500">*</span>
                                  </label>
                                  <div className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700">
                                    <input
                                      type="text"
                                      value={newTagInput[action.id] || ''}
                                      onChange={(e) => setNewTagInput(prev => ({ ...prev, [action.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newTagInput[action.id]?.trim()) {
                                          e.preventDefault();
                                          const currentTags = action.params?.tags || [];
                                          if (!currentTags.includes(newTagInput[action.id].trim())) {
                                            updateTriggerActionParams(action.id, { tags: [...currentTags, newTagInput[action.id].trim()] });
                                          }
                                          setNewTagInput(prev => ({ ...prev, [action.id]: '' }));
                                        }
                                      }}
                                      placeholder={t('agentEditor.triggers.newTag')}
                                      className="w-full text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                    />
                                    {(action.params?.tags || []).length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {(action.params?.tags || []).map((tag, tagIndex) => (
                                          <span key={tagIndex} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                            {tag}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newTags = (action.params?.tags || []).filter((_, i) => i !== tagIndex);
                                                updateTriggerActionParams(action.id, { tags: newTags });
                                              }}
                                              className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                                            >
                                              <X size={12} />
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {(action.action === 'add_deal_note' || action.action === 'add_contact_note') && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.noteText')}<span className="text-red-500">*</span></label>
                                  <textarea
                                    value={action.params?.noteText || ''}
                                    onChange={(e) => updateTriggerActionParams(action.id, { noteText: e.target.value })}
                                    placeholder={t('agentEditor.triggers.notePlaceholder')}
                                    rows={3}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                  />
                                </div>
                              )}

                              {action.action === 'send_message' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.messageText')}<span className="text-red-500">*</span></label>
                                  <textarea
                                    value={action.params?.messageText || ''}
                                    onChange={(e) => updateTriggerActionParams(action.id, { messageText: e.target.value })}
                                    placeholder={t('agentEditor.triggers.messagePlaceholder')}
                                    rows={3}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                  />
                                </div>
                              )}

                              {action.action === 'send_email' && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.emailInstructions')}<span className="text-red-500">*</span></label>
                                    <textarea
                                      value={action.params?.emailInstructions || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { emailInstructions: e.target.value })}
                                      placeholder={t('agentEditor.triggerForm.emailPlaceholder')}
                                      rows={3}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.emailHint')}</p>
                                  </div>

                                  {/* Вложения для email */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.attachments')}</label>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                                      <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        id={`email-attachment-${action.id}`}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const files = e.target.files;
                                          if (files && files.length > 0) {
                                            const fileArray = Array.from(files) as File[];
                                            const fileInfos = fileArray.map((f: File) => ({ name: f.name, size: f.size }));
                                            setSelectedFiles((prev: { [key: string]: { name: string; size: number }[] }) => ({
                                              ...prev,
                                              [`email-${action.id}`]: [...(prev[`email-${action.id}`] || []), ...fileInfos]
                                            }));
                                            const currentAttachments = action.params?.emailAttachments || [];
                                            const newAttachments = fileArray.map((f: File) => f.name);
                                            updateTriggerActionParams(action.id, { emailAttachments: [...currentAttachments, ...newAttachments] });
                                          }
                                          e.target.value = '';
                                        }}
                                      />
                                      <label htmlFor={`email-attachment-${action.id}`} className="cursor-pointer">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {t('agentEditor.triggerForm.dragOrSelect')} <span className="text-blue-600 dark:text-blue-400 hover:underline">{t('agentEditor.triggerForm.select')}</span>
                                        </p>
                                      </label>
                                    </div>

                                    {/* Список вложений */}
                                    {(selectedFiles[`email-${action.id}`]?.length > 0 || (action.params?.emailAttachments?.length || 0) > 0) && (
                                      <div className="mt-2 space-y-2">
                                        {(selectedFiles[`email-${action.id}`] || action.params?.emailAttachments?.map((name: string) => ({ name, size: 0 })) || []).map((file: { name: string; size: number }, fileIndex: number) => (
                                          <div key={fileIndex} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{file.name}</span>
                                              {file.size > 0 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedFiles((prev: { [key: string]: { name: string; size: number }[] }) => ({
                                                  ...prev,
                                                  [`email-${action.id}`]: (prev[`email-${action.id}`] || []).filter((_: { name: string; size: number }, i: number) => i !== fileIndex)
                                                }));
                                                const newAttachments = (action.params?.emailAttachments || []).filter((_: string, i: number) => i !== fileIndex);
                                                updateTriggerActionParams(action.id, { emailAttachments: newAttachments });
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.attachmentsHint')}</p>
                                  </div>
                                </div>
                              )}

                              {action.action === 'send_files' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.filesToSend')}<span className="text-red-500">*</span></label>
                                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
                                    <input
                                      type="file"
                                      multiple
                                      className="hidden"
                                      id={`file-upload-${action.id}`}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                          const fileArray = Array.from(files) as File[];
                                          const fileInfos = fileArray.map((f: File) => ({ name: f.name, size: f.size }));
                                          setSelectedFiles((prev: { [key: string]: { name: string; size: number }[] }) => ({
                                            ...prev,
                                            [action.id]: [...(prev[action.id] || []), ...fileInfos]
                                          }));
                                          // Сохраняем имена файлов в params
                                          const currentUrls = action.params?.fileUrls || [];
                                          const newUrls = fileArray.map((f: File) => f.name);
                                          updateTriggerActionParams(action.id, { fileUrls: [...currentUrls, ...newUrls] });
                                        }
                                        e.target.value = ''; // Reset input
                                      }}
                                    />
                                    <label htmlFor={`file-upload-${action.id}`} className="cursor-pointer">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('agentEditor.triggerForm.dragOrSelect')} <span className="text-blue-600 dark:text-blue-400 hover:underline">{t('agentEditor.triggerForm.select')}</span>
                                      </p>
                                    </label>
                                  </div>

                                  {/* Список выбранных файлов */}
                                  {(selectedFiles[action.id]?.length > 0 || (action.params?.fileUrls?.length || 0) > 0) && (
                                    <div className="mt-3 space-y-2">
                                      {(selectedFiles[action.id] || action.params?.fileUrls?.map((url: string) => ({ name: url, size: 0 })) || []).map((file: { name: string; size: number }, fileIndex: number) => (
                                        <div key={fileIndex} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{file.name}</span>
                                            {file.size > 0 && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedFiles((prev: { [key: string]: { name: string; size: number }[] }) => ({
                                                ...prev,
                                                [action.id]: (prev[action.id] || []).filter((_: { name: string; size: number }, i: number) => i !== fileIndex)
                                              }));
                                              const newUrls = (action.params?.fileUrls || []).filter((_: string, i: number) => i !== fileIndex);
                                              updateTriggerActionParams(action.id, { fileUrls: newUrls });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.filesHint')}</p>
                                </div>
                              )}

                              {action.action === 'send_webhook' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.webhookUrl')}<span className="text-red-500">*</span></label>
                                    <input
                                      type="url"
                                      value={action.params?.webhookUrl || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { webhookUrl: e.target.value })}
                                      placeholder="https://example.com/webhook"
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.webhookUrlHint')}</p>
                                  </div>
                                  <div className="flex gap-4">
                                    <div className="w-1/3">
                                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.httpMethod')}<span className="text-red-500">*</span></label>
                                      <select
                                        value={action.params?.webhookMethod || 'POST'}
                                        onChange={(e) => updateTriggerActionParams(action.id, { webhookMethod: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                                      >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                      </select>
                                    </div>
                                    <div className="w-2/3">
                                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.requestBody')}</label>
                                      <div className="flex gap-1">
                                        {['form', 'json', 'raw'].map((type) => (
                                          <button
                                            key={type}
                                            type="button"
                                            onClick={() => updateTriggerActionParams(action.id, { webhookBodyType: type as 'form' | 'json' | 'raw' })}
                                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${(action.params?.webhookBodyType || 'form') === type
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                          >
                                            {type === 'form' ? 'Form' : type === 'json' ? 'JSON' : 'Raw'}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.headers')}</label>
                                    <div className="space-y-2">
                                      {(action.params?.webhookHeaders || [{ key: '', value: '' }]).map((header, hIndex) => (
                                        <div key={hIndex} className="flex gap-2">
                                          <input
                                            type="text"
                                            value={header.key}
                                            onChange={(e) => {
                                              const headers = [...(action.params?.webhookHeaders || [{ key: '', value: '' }])];
                                              headers[hIndex] = { ...headers[hIndex], key: e.target.value };
                                              updateTriggerActionParams(action.id, { webhookHeaders: headers });
                                            }}
                                            placeholder="Header"
                                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                          />
                                          <input
                                            type="text"
                                            value={header.value}
                                            onChange={(e) => {
                                              const headers = [...(action.params?.webhookHeaders || [{ key: '', value: '' }])];
                                              headers[hIndex] = { ...headers[hIndex], value: e.target.value };
                                              updateTriggerActionParams(action.id, { webhookHeaders: headers });
                                            }}
                                            placeholder="Value"
                                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const headers = (action.params?.webhookHeaders || []).filter((_, i) => i !== hIndex);
                                              updateTriggerActionParams(action.id, { webhookHeaders: headers.length ? headers : [{ key: '', value: '' }] });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-2"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const headers = [...(action.params?.webhookHeaders || []), { key: '', value: '' }];
                                          updateTriggerActionParams(action.id, { webhookHeaders: headers });
                                        }}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        {t('agentEditor.triggers.addRow')}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.triggerForm.requestBody')}</label>
                                    {(action.params?.webhookBodyType || 'form') === 'raw' ? (
                                      <textarea
                                        value={typeof action.params?.webhookBody === 'string' ? action.params.webhookBody : ''}
                                        onChange={(e) => updateTriggerActionParams(action.id, { webhookBody: e.target.value })}
                                        placeholder="Raw body content"
                                        rows={3}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none font-mono"
                                      />
                                    ) : (
                                      <div className="space-y-2">
                                        {(Array.isArray(action.params?.webhookBody) ? action.params.webhookBody : [{ key: '', value: '' }]).map((item: any, bIndex: number) => (
                                          <div key={bIndex} className="flex gap-2">
                                            <input
                                              type="text"
                                              value={item.key}
                                              onChange={(e) => {
                                                const body = Array.isArray(action.params?.webhookBody) ? [...action.params.webhookBody] : [{ key: '', value: '' }];
                                                body[bIndex] = { ...body[bIndex], key: e.target.value };
                                                updateTriggerActionParams(action.id, { webhookBody: body });
                                              }}
                                              placeholder={t('agentEditor.triggerForm.keyPlaceholder')}
                                              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                            />
                                            <input
                                              type="text"
                                              value={item.value}
                                              onChange={(e) => {
                                                const body = Array.isArray(action.params?.webhookBody) ? [...action.params.webhookBody] : [{ key: '', value: '' }];
                                                body[bIndex] = { ...body[bIndex], value: e.target.value };
                                                updateTriggerActionParams(action.id, { webhookBody: body });
                                              }}
                                              placeholder={t('agentEditor.triggerForm.valuePlaceholder')}
                                              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const body = Array.isArray(action.params?.webhookBody) ? action.params.webhookBody.filter((_: any, i: number) => i !== bIndex) : [];
                                                updateTriggerActionParams(action.id, { webhookBody: body.length ? body : [{ key: '', value: '' }] });
                                              }}
                                              className="text-red-500 hover:text-red-700 p-2"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const body = Array.isArray(action.params?.webhookBody) ? [...action.params.webhookBody, { key: '', value: '' }] : [{ key: '', value: '' }];
                                            updateTriggerActionParams(action.id, { webhookBody: body });
                                          }}
                                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          {t('agentEditor.triggers.addRow')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Toggle checked={action.params?.webhookPassToAI || false} onChange={(val) => updateTriggerActionParams(action.id, { webhookPassToAI: val })} />
                                    <div>
                                      <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.triggerForm.passToAI')}</span>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.passToAIHint')}</p>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Send KB Article params */}
                              {action.action === 'send_kb_article' && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('agentEditor.triggerForm.kbArticle')}</label>
                                    <select
                                      value={action.params?.articleId || ''}
                                      onChange={(e) => updateTriggerActionParams(action.id, { articleId: e.target.value ? parseInt(e.target.value) : undefined })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                      <option value="">{t('agentEditor.triggers.selectArticle')}</option>
                                      {kbArticles.filter(a => a.isActive).map(article => (
                                        <option key={article.id} value={article.id}>{article.title}</option>
                                      ))}
                                    </select>
                                    {kbArticles.length === 0 && (
                                      <p className="mt-1 text-xs text-gray-400">{t('agentEditor.triggerForm.createArticlesHint')}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('agentEditor.triggerForm.sendChannel')}</label>
                                    <select
                                      value={action.params?.channel || 'chat'}
                                      onChange={(e) => updateTriggerActionParams(action.id, { channel: e.target.value as 'chat' | 'email' })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                      <option value="chat">{t('agentEditor.triggerForm.inChat')}</option>
                                      <option value="email">{t('agentEditor.triggerForm.byEmail')}</option>
                                    </select>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('agentEditor.triggerForm.articleWillBeSent')}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )})}
                      </div>
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setTriggerActions([...triggerActions, { id: Math.random().toString(), action: '', params: {} }])}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                          type="button"
                        >
                          {t('agentEditor.triggers.addAction')}
                        </button>
                      </div>
                    </div>

                    {/* Ответное сообщение */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.triggerForm.responseMessage')}</label>
                      <input
                        type="text"
                        value={triggerCancelMessage}
                        onChange={(e) => setTriggerCancelMessage(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder={t('agentEditor.triggerForm.responseMessagePlaceholder')}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.responseMessageHint')}</p>
                    </div>

                    {/* Лимит запусков в чате */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.triggerForm.runLimit')}</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={triggerRunLimit}
                          onChange={(e) => setTriggerRunLimit(parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.times')}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.triggerForm.runLimitHint')}</p>
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
                    <button onClick={handleSaveTrigger} disabled={isSavingTrigger} className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSavingTrigger && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {editingTriggerId ? t('common.save') : t('common.create')}
                    </button>
                    <button onClick={() => {
                      handleSaveTrigger();
                      // Reset form for creating another
                      setTriggerName('');
                      setTriggerCondition('');
                      setTriggerActions([{ id: '1', action: '', params: {} }]);
                      setTriggerCancelMessage('');
                      setTriggerRunLimit(0);
                      setNewTagInput({});
                      setSelectedFiles({});
                    }} disabled={isSavingTrigger} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('agentEditor.triggers.createAndAnother')}
                    </button>
                    <button onClick={() => setIsTriggerModalOpen(false)} disabled={isSavingTrigger} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chains' && (
          // ... (Chains tab content code - reused from previous turn)
          <div className="p-6 space-y-6">
            {/* ... (Chains implementation) ... */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 flex items-center justify-between transition-colors">
              <div>
                <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('agentEditor.chains.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.chains.subtitle')}</p>
              </div>
              <button onClick={handleCreateChain} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors">{t('common.create')}</button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
              {chains.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.chains.empty')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.chains.emptyHint')}</p>
                </div>
              ) : (
                <table className="w-full"><thead className="bg-gray-50 dark:bg-gray-750"><tr><th className="w-12 p-4"><input type="checkbox" checked={chains.length > 0 && selectedChains.size === chains.length} onChange={(e) => { if (e.target.checked) { setSelectedChains(new Set(chains.map(c => c.id))); } else { setSelectedChains(new Set()); } }} className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('common.name')}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('common.active')}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">{t('agentEditor.chains.steps')}</th><th className="px-4 py-3 text-right"></th></tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {chains.map(chain => (
                      <tr key={chain.id} onClick={() => handleEditChain(chain)} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${selectedChains.has(chain.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedChains.has(chain.id)} onChange={(e) => { const newSelected = new Set(selectedChains); if (e.target.checked) { newSelected.add(chain.id); } else { newSelected.delete(chain.id); } setSelectedChains(newSelected); }} className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{chain.name}</td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}><Toggle checked={chain.isActive} onChange={() => toggleChainStatus(chain.id)} /></td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{chain.steps.length}</td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-3 text-gray-500 dark:text-gray-400">
                            <button onClick={() => handleEditChain(chain)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title={t('common.edit')}>
                              <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleteChainId(chain.id)} className="hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('common.delete')}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* Pagination Mock */}
              {chains.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6"><div className="text-sm text-gray-700 dark:text-gray-300">{t('agentEditor.chains.showingFromTo', { count: chains.length, total: chains.length })}</div></div>
              )}
            </div>
            {/* Chain Modal */}
            {isChainModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsChainModalOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col transition-colors animate-fadeIn">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingChainId ? t('agentEditor.chains.editChain') : t('agentEditor.chains.createChain')}</h2>
                    <button onClick={() => setIsChainModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">{t('common.name')}<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={chainName}
                        onChange={(e) => setChainName(e.target.value)}
                        placeholder={t('agentEditor.chains.namePlaceholder')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-3">
                      <Toggle checked={chainActive} onChange={setChainActive} />
                      <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.chainForm.active')}</span>
                    </div>

                    {/* Conditions Accordion */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsChainConditionsOpen(!isChainConditionsOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Settings size={18} className="text-gray-400 dark:text-gray-500" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.chainForm.conditions')}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('agentEditor.chainForm.conditionsHint')}</div>
                          </div>
                        </div>
                        {isChainConditionsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainConditionsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-5 bg-white dark:bg-gray-800">
                          <div className="flex items-center gap-3">
                            <Toggle checked={chainAllStages} onChange={setChainAllStages} />
                            <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.chainForm.anyStage')}</span>
                          </div>

                          {!chainAllStages && (
                            <div>
                              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.chainForm.dealStages')}<span className="text-red-500">*</span></label>
                              <div className="relative">
                                <select
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                  value={chainStages[0] || ''}
                                  onChange={(e) => setChainStages([e.target.value])}
                                >
                                  <option value="">{t('agentEditor.chainForm.selectStages')}</option>
                                  {availablePipelines.map((pipeline: any) => (
                                    <optgroup key={pipeline.id} label={pipeline.name}>
                                      {pipeline.stages.map((stage: any) => (
                                        <option key={stage.id} value={stage.id}>{pipeline.name} - {stage.name}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.chainForm.stageNotAllowedHint')}</p>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.chainForm.skipWhen')}</label>
                            <textarea
                              value={chainExcludeCondition}
                              onChange={(e) => setChainExcludeCondition(e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                              placeholder={t('agentEditor.chainForm.skipWhenPlaceholder')}
                            />
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.chainForm.skipWhenHint')}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Steps Accordion */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsChainStepsOpen(!isChainStepsOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <List size={18} className="text-gray-400 dark:text-gray-500" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.chainForm.steps')}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('agentEditor.chainForm.stepsHint')}</div>
                          </div>
                        </div>
                        {isChainStepsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainStepsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                          {chainSteps.map((step, stepIndex) => (
                            <div key={step.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                              {/* Step Header */}
                              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-3">
                                  <div className="text-gray-300 cursor-move">
                                    <ArrowUp size={14} className="mb-0.5" />
                                    <ArrowDown size={14} />
                                  </div>
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                      {stepIndex + 1}
                                    </div>
                                    {t('agentEditor.chainForm.step')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => removeChainStep(step.id)} className="text-red-500 hover:text-red-700 p-1">
                                    <Trash2 size={16} />
                                  </button>
                                  <ChevronUp size={16} className="text-gray-400" />
                                </div>
                              </div>

                              <div className="p-4 space-y-4">
                                {/* Time Delay */}
                                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-3 border border-gray-100 dark:border-gray-700">
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.chainForm.waitTime')}</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      value={step.delayValue}
                                      onChange={(e) => {
                                        const newSteps = [...chainSteps];
                                        newSteps[stepIndex].delayValue = parseInt(e.target.value) || 0;
                                        setChainSteps(newSteps);
                                      }}
                                      className="w-20 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <div className="relative flex-1">
                                      <select
                                        value={step.delayUnit}
                                        onChange={(e) => {
                                          const newSteps = [...chainSteps];
                                          newSteps[stepIndex].delayUnit = e.target.value;
                                          setChainSteps(newSteps);
                                        }}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                      >
                                        <option value="Минуты">{t('agentEditor.chains.minutes')}</option>
                                        <option value="Часы">{t('agentEditor.chains.hours')}</option>
                                        <option value="Дни">{t('agentEditor.chains.days')}</option>
                                      </select>
                                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                  </div>
                                </div>

                                {/* Actions List */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.chainForm.actions')}<span className="text-red-500">*</span></label>
                                  <div className="space-y-3">
                                    {step.actions.map((action, actionIndex) => (
                                      <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 relative group">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <div className="text-gray-300 cursor-move">
                                              <ArrowUp size={12} className="mb-0.5" />
                                              <ArrowDown size={12} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                              {action.type === 'generate_message' ? t('agentEditor.chainForm.generateMessage') : t('agentEditor.chainForm.action')}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => removeChainAction(step.id, action.id)}
                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>

                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.selectActionRequired')}<span className="text-red-500">*</span></label>
                                            <div className="relative">
                                              <select
                                                value={action.type}
                                                onChange={(e) => {
                                                  const newSteps = [...chainSteps];
                                                  newSteps[stepIndex].actions[actionIndex].type = e.target.value;
                                                  setChainSteps(newSteps);
                                                }}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                              >
                                                <option value="">{t('agentEditor.chainForm.selectActionRequired')}</option>
                                                {availableActions.map((actionOption: any) => (
                                                  <option key={actionOption.id} value={actionOption.id}>
                                                    {t(`agentEditor.actions.${actionOption.id}`)}
                                                  </option>
                                                ))}
                                              </select>
                                              <X size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400" />
                                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                          </div>

                                          {/* Dynamic fields based on action type */}
                                          {action.type === 'change_stage' && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.triggers.dealStage')}<span className="text-red-500">*</span></label>
                                              <select
                                                value={action.params?.stageId || ''}
                                                onChange={(e) => updateChainActionParams(step.id, action.id, { stageId: e.target.value })}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                              >
                                                <option value="">{t('agentEditor.triggers.selectStage')}</option>
                                                {availablePipelines.map((pipeline: any) => (
                                                  <optgroup key={pipeline.id} label={pipeline.name}>
                                                    {pipeline.stages.map((stage: any) => (
                                                      <option key={stage.id} value={stage.id}>{pipeline.name} - {stage.name}</option>
                                                    ))}
                                                  </optgroup>
                                                ))}
                                              </select>
                                            </div>
                                          )}

                                          {action.type === 'assign_user' && (
                                            <>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.applyTo')}<span className="text-red-500">*</span></label>
                                                <select
                                                  value={action.params?.applyTo || 'deal'}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { applyTo: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="deal">{t('agentEditor.triggers.deal')}</option>
                                                  <option value="contact">{t('agentEditor.triggers.contact')}</option>
                                                  <option value="both">{t('agentEditor.triggers.dealAndContact')}</option>
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.responsible')}<span className="text-red-500">*</span></label>
                                                <select
                                                  value={action.params?.userId || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { userId: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="">{t('agentEditor.chainForm.selectUser')}</option>
                                                  {(crmData?.users || MOCK_USERS).map((user: any) => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </>
                                          )}

                                          {action.type === 'create_task' && (
                                            <>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.taskDescription')}<span className="text-red-500">*</span></label>
                                                <input
                                                  type="text"
                                                  value={action.params?.taskDescription || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { taskDescription: e.target.value })}
                                                  placeholder={t('agentEditor.triggers.taskPlaceholder')}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.responsible')}</label>
                                                <select
                                                  value={action.params?.taskUserId || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { taskUserId: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="">{t('agentEditor.chainForm.dealResponsible')}</option>
                                                  {(crmData?.users || MOCK_USERS).map((user: any) => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </>
                                          )}

                                          {action.type === 'run_salesbot' && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Salesbot<span className="text-red-500">*</span></label>
                                              <select
                                                value={action.params?.salesbotId || ''}
                                                onChange={(e) => updateChainActionParams(step.id, action.id, { salesbotId: e.target.value })}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                              >
                                                <option value="">{t('agentEditor.triggers.selectSalesbot')}</option>
                                                {(crmData?.salesbots?.length ? crmData.salesbots : MOCK_SALESBOTS).map((bot: any) => (
                                                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          )}

                                          {(action.type === 'add_deal_tags' || action.type === 'add_contact_tags') && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                {action.type === 'add_deal_tags' ? t('agentEditor.chainForm.dealTags') : t('agentEditor.chainForm.contactTags')}<span className="text-red-500">*</span>
                                              </label>
                                              <div className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700">
                                                <input
                                                  type="text"
                                                  value={newTagInput[`chain-${action.id}`] || ''}
                                                  onChange={(e) => setNewTagInput(prev => ({ ...prev, [`chain-${action.id}`]: e.target.value }))}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newTagInput[`chain-${action.id}`]?.trim()) {
                                                      e.preventDefault();
                                                      const currentTags = action.params?.tags || [];
                                                      if (!currentTags.includes(newTagInput[`chain-${action.id}`].trim())) {
                                                        updateChainActionParams(step.id, action.id, { tags: [...currentTags, newTagInput[`chain-${action.id}`].trim()] });
                                                      }
                                                      setNewTagInput(prev => ({ ...prev, [`chain-${action.id}`]: '' }));
                                                    }
                                                  }}
                                                  placeholder={t('agentEditor.chainForm.newTagPlaceholder')}
                                                  className="w-full text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                                />
                                                {(action.params?.tags || []).length > 0 && (
                                                  <div className="flex flex-wrap gap-2 mt-2">
                                                    {(action.params?.tags || []).map((tag: string, tagIndex: number) => (
                                                      <span key={tagIndex} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                                        {tag}
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            const newTags = (action.params?.tags || []).filter((_: string, i: number) => i !== tagIndex);
                                                            updateChainActionParams(step.id, action.id, { tags: newTags });
                                                          }}
                                                          className="text-blue-600 dark:text-blue-300 hover:text-blue-800"
                                                        >
                                                          <X size={12} />
                                                        </button>
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {(action.type === 'add_deal_note' || action.type === 'add_contact_note') && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.noteText')}<span className="text-red-500">*</span></label>
                                              <textarea
                                                value={action.params?.noteText || ''}
                                                onChange={(e) => updateChainActionParams(step.id, action.id, { noteText: e.target.value })}
                                                placeholder={t('agentEditor.triggers.notePlaceholder')}
                                                rows={2}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none"
                                              />
                                            </div>
                                          )}

                                          {action.type === 'send_message' && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.messageText')}<span className="text-red-500">*</span></label>
                                              <textarea
                                                value={action.params?.messageText || ''}
                                                onChange={(e) => updateChainActionParams(step.id, action.id, { messageText: e.target.value })}
                                                placeholder={t('agentEditor.triggers.messagePlaceholder')}
                                                rows={3}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none"
                                              />
                                            </div>
                                          )}

                                          {action.type === 'send_email' && (
                                            <div>
                                              <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.emailInstructions')}<span className="text-red-500">*</span></label>
                                              <textarea
                                                value={action.params?.emailInstructions || ''}
                                                onChange={(e) => updateChainActionParams(step.id, action.id, { emailInstructions: e.target.value })}
                                                placeholder={t('agentEditor.chainForm.emailPlaceholder')}
                                                rows={3}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none"
                                              />
                                              <p className="mt-1 text-[10px] text-gray-400">{t('agentEditor.chainForm.emailHint')}</p>
                                            </div>
                                          )}

                                          {action.type === 'send_webhook' && (
                                            <>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">URL<span className="text-red-500">*</span></label>
                                                <input
                                                  type="text"
                                                  value={action.params?.webhookUrl || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { webhookUrl: e.target.value })}
                                                  placeholder="https://example.com/webhook"
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.method')}</label>
                                                <select
                                                  value={action.params?.webhookMethod || 'POST'}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { webhookMethod: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="POST">POST</option>
                                                  <option value="GET">GET</option>
                                                  <option value="PUT">PUT</option>
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Body (JSON)</label>
                                                <textarea
                                                  value={action.params?.webhookBody || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { webhookBody: e.target.value })}
                                                  placeholder='{"key": "value"}'
                                                  rows={2}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none font-mono"
                                                />
                                              </div>
                                            </>
                                          )}

                                          {action.type === 'send_kb_article' && (
                                            <>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.article')}<span className="text-red-500">*</span></label>
                                                <select
                                                  value={action.params?.articleId || ''}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { articleId: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="">{t('agentEditor.triggers.selectArticle')}</option>
                                                  {kbArticles.filter(a => a.isActive).map(article => (
                                                    <option key={article.id} value={article.id}>{article.title}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.sendChannel')}<span className="text-red-500">*</span></label>
                                                <select
                                                  value={action.params?.channel || 'chat'}
                                                  onChange={(e) => updateChainActionParams(step.id, action.id, { channel: e.target.value })}
                                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"
                                                >
                                                  <option value="chat">{t('agentEditor.chainForm.inChat')}</option>
                                                  <option value="email">{t('agentEditor.triggers.byEmail')}</option>
                                                </select>
                                              </div>
                                            </>
                                          )}

                                          <div>
                                            <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">{t('agentEditor.chainForm.instruction')}<span className="text-red-500">*</span></label>
                                            <textarea
                                              value={action.instruction}
                                              onChange={(e) => {
                                                const newSteps = [...chainSteps];
                                                newSteps[stepIndex].actions[actionIndex].instruction = e.target.value;
                                                setChainSteps(newSteps);
                                              }}
                                              rows={3}
                                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                              placeholder={t('agentEditor.chainForm.instructionPlaceholder')}
                                            />
                                            <p className="mt-1 text-[10px] text-gray-400">{t('agentEditor.chainForm.instructionHint')}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-3 flex justify-center">
                                    <button
                                      onClick={() => addChainAction(step.id)}
                                      className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                    >
                                      {t('agentEditor.triggers.addAction')}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-center pt-2">
                            <button
                              onClick={addChainStep}
                              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                              {t('agentEditor.chainForm.addStep')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Schedule Accordion */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsChainScheduleOpen(!isChainScheduleOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-gray-400 dark:text-gray-500" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.chainForm.workingHoursTitle')}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('agentEditor.chainForm.workingHoursHint')}</div>
                          </div>
                        </div>
                        {isChainScheduleOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainScheduleOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-gray-800">
                          {chainSchedule.map((day) => (
                            <div key={day.day} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-3 w-40">
                                <Toggle checked={day.enabled} onChange={() => toggleWorkingDay(day.day)} />
                                <span className={`text-sm ${day.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{day.day}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <input
                                  type="time"
                                  value={day.start}
                                  disabled={!day.enabled}
                                  onChange={(e) => {
                                    const newSchedule = chainSchedule.map(d => d.day === day.day ? { ...d, start: e.target.value } : d);
                                    setChainSchedule(newSchedule);
                                  }}
                                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="time"
                                  value={day.end}
                                  disabled={!day.enabled}
                                  onChange={(e) => {
                                    const newSchedule = chainSchedule.map(d => d.day === day.day ? { ...d, end: e.target.value } : d);
                                    setChainSchedule(newSchedule);
                                  }}
                                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Settings Accordion */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsChainSettingsOpen(!isChainSettingsOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Settings2 size={18} className="text-gray-400 dark:text-gray-500" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.chainForm.additionalSettings')}</div>
                          </div>
                        </div>
                        {isChainSettingsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainSettingsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-gray-800">
                          <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">{t('agentEditor.chainForm.runLimit')}</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={chainRunLimit}
                                onChange={(e) => setChainRunLimit(parseInt(e.target.value) || 0)}
                                min="0"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('agentEditor.chainForm.times')}</span>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.chainForm.runLimitHint')}</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
                    <button onClick={handleSaveChain} disabled={isSavingChain} className="flex items-center gap-2 bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSavingChain && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {editingChainId ? t('common.save') : t('common.create')}
                    </button>
                    <button onClick={() => setIsChainModalOpen(false)} disabled={isSavingChain} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* End Tabs Container */}

      {/* Delete Chain Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteChainId}
        title={t('agentEditor.chains.deleteTitle')}
        message={t('agentEditor.chains.confirmDelete')}
        onConfirm={() => deleteChainId && handleDeleteChain(deleteChainId)}
        onCancel={() => setDeleteChainId(null)}
      />

      {/* Delete Trigger Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTriggerIndex}
        title={t('agentEditor.triggers.deleteTitle')}
        message={t('agentEditor.triggers.confirmDelete')}
        onConfirm={() => deleteTriggerIndex && handleDeleteTrigger(deleteTriggerIndex)}
        onCancel={() => setDeleteTriggerIndex(null)}
      />

      {/* Kommo Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={showKommoDisconnectModal}
        title={t('agentEditor.integrations.disconnectKommoTitle', 'Отключить Kommo')}
        message={t('agentEditor.integrations.disconnectKommoMessage', 'Вы уверены, что хотите отключить интеграцию с Kommo?')}
        onConfirm={handleKommoDisconnect}
        onCancel={() => setShowKommoDisconnectModal(false)}
      />

      {/* Delete Employee Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!employeeToDelete}
        title={t('agentEditor.integrations.deleteEmployeeTitle', 'Удалить сотрудника')}
        message={t('agentEditor.integrations.deleteEmployeeMessage', `Вы уверены, что хотите удалить сотрудника ${employeeToDelete?.crmUserName}?`)}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
};

export default AgentEditor;