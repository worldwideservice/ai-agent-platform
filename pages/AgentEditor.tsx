import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  User, RefreshCw, MessageSquare, Book, Settings, Share2, Zap, Link as LinkIcon, MoreHorizontal,
  ChevronDown, ChevronUp, X, Clock, Puzzle, FilePenLine, Users, Eye, Briefcase, PenSquare,
  GripVertical, Trash2, Plus, Search, LayoutGrid, Edit, ArrowUp, ArrowDown, CheckCircle,
  XCircle, Settings2, Cpu, Languages, SlidersHorizontal, Sparkles, Check, Calendar, List, Minus
} from 'lucide-react';
import { MOCK_PIPELINES, MOCK_CHANNELS, MOCK_KB_CATEGORIES, MOCK_CRM_FIELDS, CRM_ACTIONS } from '../services/crmData';
import { AgentDealsContacts, AgentDealsContactsRef } from '../components/AgentDealsContacts';
import { AgentBasicSettings } from '../components/AgentBasicSettings';
import { Agent } from '../types';
import { AgentBasicSettingsRef } from '../components/AgentBasicSettings';
import { integrationsService } from '../src/services/api';
import { apiClient } from '../src/services/api/apiClient';
// import Toggle from '../components/Toggle'; // Removed: Defined internally
import { ConfirmationModal } from '../components/ConfirmationModal';
// import Toast, { ToastRef } from '../components/Toast'; // Removed: Not used or incorrect

interface AgentEditorProps {
  agent: Agent | null;
  onCancel: () => void;
  onSave: (agent: Agent) => Promise<void>;
  kbCategories: { id: string; name: string }[];
  onNavigate: (page: string) => void;
}

type Tab = 'main' | 'deals' | 'triggers' | 'chains' | 'integrations' | 'advanced';
type IntegrationView = 'list' | 'kommo' | 'google_calendar';
type CreativityLevel = 'precise' | 'balanced' | 'creative';

// --- Types ---
interface UpdateRule {
  id: string;
  fieldId: string;
  condition: string;
  overwrite: boolean;
}

interface TriggerAction {
  id: string;
  action: string;
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

export const AgentEditor: React.FC<AgentEditorProps> = ({ agent, onCancel, onSave, kbCategories, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('agentEditorActiveTab');
    return (saved as Tab) || 'main';
  });
  const basicSettingsRef = useRef<AgentBasicSettingsRef>(null);
  const dealsContactsRef = useRef<AgentDealsContactsRef>(null);

  // --- Loading and Error States ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // --- Modal States ---
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  // --- Integrations State ---
  const [integrationView, setIntegrationView] = useState<IntegrationView>('list');
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [kommoActive, setKommoActive] = useState(false);
  const [kommoConnected, setKommoConnected] = useState(false);
  const [googleCalendarActive, setGoogleCalendarActive] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  // --- Advanced Tab State ---
  const [advancedModel, setAdvancedModel] = useState('OpenAI GPT-4.1');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [autoLanguage, setAutoLanguage] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [agentSchedule, setAgentSchedule] = useState<WorkingDay[]>(DEFAULT_WORKING_HOURS);
  const [creativity, setCreativity] = useState<CreativityLevel>('balanced');
  const [responseDelay, setResponseDelay] = useState(45);

  // --- Memory & Context State ---
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [contextWindow, setContextWindow] = useState(20);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(true);

  // --- Triggers Data ---
  const [triggers, setTriggers] = useState<Trigger[]>([]);

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
  const availableActions = crmData?.actions || CRM_ACTIONS;

  // Загружаем модель из агента при монтировании компонента
  React.useEffect(() => {
    if (agent?.model) {
      setAdvancedModel(agent.model);
    }
  }, [agent]);

  // Загружаем список моделей с сервера
  useEffect(() => {
    const fetchModels = async () => {
      setModelsLoading(true);
      try {
        const response = await apiClient.get('/models');
        if (response.data.success && response.data.models) {
          setAvailableModels(response.data.models);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // Если не удалось загрузить модели, используем модели по умолчанию
        setAvailableModels([
          { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
          { id: 'openai/gpt-4-turbo', name: 'OpenAI GPT-4 Turbo' },
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        ]);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Сохраняем активную вкладку в localStorage
  React.useEffect(() => {
    localStorage.setItem('agentEditorActiveTab', activeTab);
  }, [activeTab]);

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
          setKommoActive(kommo.isActive || false);
        } else {
          setKommoConnected(false);
          setKommoActive(false);
        }

        if (googleCalendar) {
          setGoogleCalendarConnected(googleCalendar.isConnected || false);
          setGoogleCalendarActive(googleCalendar.isActive || false);
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
        model: advancedModel,  // Сохраняем выбранную модель
        crmData: updatedCrmData  // Отправляем объект, не строку!
      };

      console.log('Updated agent:', updatedAgent);
      console.log('Calling onSave...');
      await onSave(updatedAgent);
      console.log('onSave completed successfully');
    } catch (error: any) {
      setSaveError(error.response?.data?.message || 'Не удалось сохранить изменения. Попробуйте еще раз.');
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
    } catch (error) {
      console.error('Failed to update Kommo integration:', error);
      // Откатываем изменение в случае ошибки
      setKommoActive(!isActive);
      alert('Не удалось обновить интеграцию Kommo');
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
    } catch (error) {
      console.error('Failed to update Google Calendar integration:', error);
      // Откатываем изменение в случае ошибки
      setGoogleCalendarActive(!isActive);
      alert('Не удалось обновить интеграцию Google Calendar');
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
        alert('Интеграция Kommo не найдена. Пожалуйста, сначала создайте интеграцию.');
        return;
      }

      // Используем новый endpoint для синхронизации Kommo
      const result = await integrationsService.syncKommo(agent.id, kommoIntegration.id);
      setKommoConnected(true);

      console.log('CRM синхронизирована:', result);

      alert(
        `CRM успешно синхронизирована!\n\n` +
        `Воронок: ${result.stats.pipelines}\n` +
        `Контактов: ${result.stats.contacts}\n` +
        `Сделок: ${result.stats.leads}\n\n` +
        `Последняя синхронизация: ${new Date(result.lastSynced).toLocaleString('ru-RU')}`
      );

      // Reload page to update agent with new crmData
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to sync CRM:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка';
      alert(`Не удалось синхронизировать CRM.\n\nОшибка: ${errorMessage}`);
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
  const [name, setName] = useState('АИ ассистент');
  const [isActive, setIsActive] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState(
    `ОТВЕЧАЙ ТОЛЬКО НА АНГЛИЙСКОМ ЯЗЫКЕ - ВСЕГДА !!`
  );
  const [checkBeforeSend, setCheckBeforeSend] = useState(false);

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

  const toggleWorkingDay = (day: string) => {
    setChainSchedule(prev => prev.map(d => d.day === day ? { ...d, enabled: !d.enabled } : d));
  };

  const toggleAgentWorkingDay = (day: string) => {
    setAgentSchedule(prev => prev.map(d => d.day === day ? { ...d, enabled: !d.enabled } : d));
  };

  const toggleChainStatus = (id: string) => {
    setChains(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
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

  const handleSaveChain = () => {
    const chainData: Chain = {
      id: editingChainId || Math.random().toString(36).substr(2, 9),
      name: chainName,
      isActive: chainActive,
      conditionType: chainAllStages ? 'all' : 'specific',
      conditionStages: chainStages,
      conditionExclude: chainExcludeCondition,
      steps: chainSteps,
      schedule: chainSchedule,
      runLimit: chainRunLimit
    };

    if (editingChainId) {
      setChains(prev => prev.map(c => c.id === editingChainId ? chainData : c));
    } else {
      setChains(prev => [...prev, chainData]);
    }
    setIsChainModalOpen(false);
  };

  const handleDeleteChain = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту цепочку?')) {
      setChains(prev => prev.filter(c => c.id !== id));
    }
  };

  // --- Trigger Modal Form State ---
  const [triggerName, setTriggerName] = useState('');
  const [triggerActive, setTriggerActive] = useState(true);
  const [triggerCondition, setTriggerCondition] = useState('');
  const [triggerActions, setTriggerActions] = useState<Array<{ id: string, action: string }>>([{ id: '1', action: '' }]);
  const [triggerCancelMessage, setTriggerCancelMessage] = useState('');
  const [triggerRunLimit, setTriggerRunLimit] = useState(0);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [triggerLimit, setTriggerLimit] = useState(0);
  const addTriggerAction = () => setTriggerActions(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), action: '' }]);
  const removeTriggerAction = (id: string) => setTriggerActions(prev => prev.filter(a => a.id !== id));
  const updateTriggerAction = (id: string, val: string) => setTriggerActions(prev => prev.map(a => a.id === id ? { ...a, action: val } : a));
  const toggleTriggerStatus = (id: string) => setTriggers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));

  const handleCreateTrigger = () => {
    setEditingTriggerId(null);
    setTriggerName('');
    setTriggerActive(true);
    setTriggerCondition('');
    setIsTriggerModalOpen(true);
  };

  const handleEditTrigger = (trigger: Trigger) => {
    setEditingTriggerId(trigger.id);
    setTriggerName(trigger.name);
    setTriggerActive(trigger.isActive);
    setTriggerCondition(trigger.condition);
    setIsTriggerModalOpen(true);
  };

  const handleDeleteTrigger = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот триггер?')) {
      setTriggers(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveTrigger = () => {
    const triggerData: Trigger = {
      id: editingTriggerId || Math.random().toString(36).substr(2, 9),
      name: triggerName,
      isActive: triggerActive,
      condition: triggerCondition,
      actions: triggerActions,
      cancelMessage: triggerCancelMessage,
      runLimit: triggerRunLimit
    };

    if (editingTriggerId) {
      setTriggers(prev => prev.map(t => t.id === editingTriggerId ? triggerData : t));
    } else {
      setTriggers(prev => [...prev, triggerData]);
    }
    setIsTriggerModalOpen(false);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id
        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${checked ? 'translate-x-4 scale-110' : 'translate-x-0 scale-100'}`} />
    </button>
  );

  // Breadcrumbs
  const renderBreadcrumbs = () => {
    if (activeTab === 'integrations' && integrationView !== 'list') {
      const integrationName = integrationView === 'kommo' ? 'Kommo' : 'Google Calendar';
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Агенты ИИ</span>
          <span>/</span>
          <span>{name}</span>
          <span>/</span>
          <span>Интеграции</span>
          <span>/</span>
          <span>{integrationName}</span>
        </div>
      );
    }

    if (activeTab === 'advanced') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Агенты ИИ</span>
          <span>/</span>
          <span>{name}</span>
          <span>/</span>
          <span>Редактирование</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
        <span>Агенты ИИ</span>
        <span>/</span>
        <span>{name}</span>
        <span>/</span>
        <span>{
          activeTab === 'main' ? 'Основные' :
            activeTab === 'deals' ? 'Сделки и контакты' :
              activeTab === 'triggers' ? 'Триггеры' :
                activeTab === 'chains' ? 'Цепочки' :
                  activeTab === 'integrations' ? 'Интеграции' :
                    activeTab === 'advanced' ? 'Расширенные настройки' : 'Редактирование'
        }</span>
      </div>
    );
  };

  const renderPageTitle = () => {
    if (activeTab === 'integrations' && integrationView !== 'list') {
      return integrationView === 'kommo' ? 'Kommo' : 'Google Calendar';
    }

    return activeTab === 'chains' ? 'Цепочки' :
      activeTab === 'triggers' ? 'Триггеры' :
        activeTab === 'deals' ? 'Сделки и контакты' :
          activeTab === 'integrations' ? 'Интеграции' :
            activeTab === 'advanced' ? 'Расширенные настройки' : `Редактирование ${name}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-12">
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
            Удалить
          </button>
        )}
      </div>

      {/* Tabs Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto no-scrollbar pl-[90px]">
          <TabButton id="main" label="Основные" icon={Settings} />
          <TabButton id="deals" label="Сделки и контакты" icon={Users} />
          <TabButton id="triggers" label="Триггеры" icon={Zap} />
          <TabButton id="chains" label="Цепочки" icon={Clock} />
          <TabButton id="integrations" label="Интеграции" icon={Puzzle} />
          <TabButton id="advanced" label="Дополнительно" icon={FilePenLine} />
        </div>

        {/* Tab Content: Advanced */}
        {activeTab === 'advanced' && (
          <div className="p-6 space-y-6">

            {/* Model Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Cpu size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">Модель ИИ</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выберите модель ИИ<span className="text-red-500">*</span>
                    {modelsLoading && <span className="ml-2 text-xs text-gray-500">(загрузка...)</span>}
                  </label>
                  <div className="relative">
                    <select
                      value={advancedModel}
                      onChange={(e) => setAdvancedModel(e.target.value)}
                      disabled={modelsLoading}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {availableModels.length === 0 ? (
                        <option value="">Загрузка моделей...</option>
                      ) : (
                        availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Выберите, насколько умным вы хотите сделать ИИ. Более продвинутые модели стоят дороже.</p>
                </div>
              </div>
            </div>

            {/* Language Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Languages size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">Язык</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Toggle checked={autoLanguage} onChange={setAutoLanguage} />
                  <span className="text-sm text-gray-900 dark:text-white">Автоматически определять язык пользователя</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Язык ответа</label>
                  <input
                    type="text"
                    value={responseLanguage}
                    onChange={(e) => setResponseLanguage(e.target.value)}
                    placeholder="например, Английский"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Язык, который агент будет использовать для ответов пользователям</p>
                </div>
              </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Clock size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">Расписание работы агента</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Управляйте временем, когда агент отвечает на входящие сообщения пользователей</p>
                <div className="flex items-center gap-3">
                  <Toggle checked={scheduleEnabled} onChange={setScheduleEnabled} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Включить расписание</span>
                </div>
                {scheduleEnabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Настройте рабочие часы для каждого дня недели</p>
                    {agentSchedule.map((day) => (
                      <div key={day.day} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3 w-40">
                          <Toggle checked={day.enabled} onChange={() => toggleAgentWorkingDay(day.day)} />
                          <span className={`text-sm ${day.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{day.day}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <input
                              type="time"
                              value={day.start}
                              disabled={!day.enabled}
                              onChange={(e) => {
                                const newSchedule = agentSchedule.map(d => d.day === day.day ? { ...d, start: e.target.value } : d);
                                setAgentSchedule(newSchedule);
                              }}
                              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                          <div className="relative">
                            <input
                              type="time"
                              value={day.end}
                              disabled={!day.enabled}
                              onChange={(e) => {
                                const newSchedule = agentSchedule.map(d => d.day === day.day ? { ...d, end: e.target.value } : d);
                                setAgentSchedule(newSchedule);
                              }}
                              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Response Settings Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Clock size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">Настройки ответа</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Креативность</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreativity('precise')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${creativity === 'precise'
                        ? 'border-[#0078D4] bg-[#0078D4] text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <CheckCircle size={16} />
                      Точный
                    </button>
                    <button
                      onClick={() => setCreativity('balanced')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${creativity === 'balanced'
                        ? 'border-[#0078D4] bg-[#0078D4] text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <SlidersHorizontal size={16} />
                      Сбалансированный
                    </button>
                    <button
                      onClick={() => setCreativity('creative')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${creativity === 'creative'
                        ? 'border-[#0078D4] bg-[#0078D4] text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Sparkles size={16} />
                      Креативный
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Управляйте стилем ответов агента. Точный: последовательный и предсказуемый, может звучать сухо. Сбалансированный: естественный и легко читаемый. Креативный: выразительный и разнообразный.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Задержка ответа (секунд)</label>
                  <input
                    type="number"
                    value={responseDelay}
                    onChange={(e) => setResponseDelay(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Сколько секунд ждать перед ответом. Рекомендуем установить задержку не менее 30 секунд, чтобы избежать дублирования ответов, если клиент отправит другое сообщение, пока агент отвечает.</p>
                </div>
              </div>
            </div>

            {/* Memory & Context Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <Cpu size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">Память и Контекст</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Toggle checked={memoryEnabled} onChange={setMemoryEnabled} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Включить долговременную память</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Агент будет запоминать факты из разговоров и использовать Knowledge Graph для связывания информации.
                  Это делает агента "сознательным" - он понимает контекст и связи между данными.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Размер контекстного окна
                  </label>
                  <input
                    type="number"
                    value={contextWindow}
                    onChange={(e) => setContextWindow(Number(e.target.value))}
                    min="5"
                    max="50"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Количество важных фактов и воспоминаний, которые агент будет учитывать при ответе (5-50)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Toggle checked={semanticSearchEnabled} onChange={setSemanticSearchEnabled} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Семантический поиск</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Использовать векторные embeddings для поиска релевантной информации по смыслу, а не только по ключевым словам.
                  Агент будет понимать запросы на более глубоком уровне.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                        Интеллектуальная память
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Агент создает граф знаний из разговоров с клиентами, автоматически извлекает факты
                        и связывает их с CRM данными. Это позволяет агенту быть "осознанным" и давать
                        персонализированные ответы на основе всей истории взаимодействий.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions (Advanced) */}
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-3 rounded-md text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <button
                onClick={handleCancel}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Отмена
              </button>
            </div>

          </div>
        )}

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
                      placeholder="Поиск"
                      className="pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Table */}
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Интеграция</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Установлено</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Активно</th>
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
                          <Settings size={16} /> Настройки
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
                          <Settings size={16} /> Настройки
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
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">Подключение</h3>

                {!kommoConnected ? (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 mb-4">
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <label htmlFor="kommoTokenInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Долгосрочный токен Kommo:
                      </label>
                      <textarea
                        id="kommoTokenInput"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300"
                        rows={3}
                        placeholder="Вставьте токен сюда..."
                        defaultValue="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjRmNjBkMWMyMTJkNDkwOTJlNTY3N2Y1YzFkMmI3MmFiOGI4YzE4MjVhODEwOWZiMGFjYWM2MTJlZDQwODk0YjFjMDY5ZTQwZjNmYTBiNGRiIn0.eyJhdWQiOiIyYTVjMTQ2My00M2RkLTRjY2MtYWJkMC03OTUxNmY3ODVlNTciLCJqdGkiOiI0ZjYwZDFjMjEyZDQ5MDkyZTU2NzdmNWMxZDJiNzJhYjhiOGMxODI1YTgxMDlmYjBhY2FjNjEyZWQ0MDg5NGIxYzA2OWU0MGYzZmEwYjRkYiIsImlhdCI6MTc2NDAxOTczNywibmJmIjoxNzY0MDE5NzM3LCJleHAiOjE4NDg3MDA4MDAsInN1YiI6IjEyNzYwMzgzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM0MjEwMzA3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZmRmZWFiMmUtYTBmNC00NzljLWJiYmMtOTY0OThkN2U2NTNlIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.gb1UkZnVBWRn2xDlkVNsVNRbFuGPoGakEfbqDGi-mkOFYSC4aX2FtAQFgo9xraZo8Mln3ult23qQfPjBk8uqzIlXfoXoPAgW8XjOHddBqhIn0QRRUdjMSgs_lHYEs61j2MLm5vSppJe07bi4kSegJqIdUCW2kKx3I5ZDLwPapmrByOrU1T9TCdGGVQXIdFACvmmxvOribpZOtBU75VtgQ-1Jmn7oqnWOMa6es0Ztw7b01raBXC_0sReOFLb7a0l1Rk93aAAkxJAQ2uuebwYcoE4mxZKrwOmH7YsevdtVti9XWtRK87NiRQBi-CVFsOGO63mp1VQK8HPpe4SPRN6GMA"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        ☝️ Токен уже вставлен. Просто нажмите кнопку "Подключить через токен".
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (!agent) return;

                        const tokenInput = document.getElementById('kommoTokenInput') as HTMLTextAreaElement;
                        const token = tokenInput?.value.trim();

                        if (!token) {
                          alert('Вставьте токен в поле выше!');
                          return;
                        }

                        try {
                          console.log('🔑 Connecting Kommo with long-lived token...');

                          // Find or create kommo integration
                          let kommoIntegration = integrations.find((i: any) => i.integrationType === 'kommo');

                          if (!kommoIntegration) {
                            console.log('🔵 Creating new Kommo integration...');
                            kommoIntegration = await integrationsService.upsertIntegration(
                              agent.id,
                              'kommo',
                              kommoActive,
                              false
                            );
                            await refreshIntegrations();
                            console.log('✅ Integration created:', kommoIntegration.id);
                          }

                          // Connect with token
                          await integrationsService.connectKommoWithToken(kommoIntegration.id, token);

                          console.log('✅ Kommo connected with token!');
                          setKommoConnected(true);
                          await refreshIntegrations();
                          alert('Kommo успешно подключен через токен!');
                          tokenInput.value = ''; // Clear token after success
                        } catch (error: any) {
                          console.error('❌ Failed to connect with token:', error);
                          alert(`Не удалось подключить Kommo: ${error.response?.data?.message || error.message}`);
                        }
                      }}
                      className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2.5 transition-colors font-medium text-sm shadow-sm w-full justify-center mb-3"
                    >
                      🔑 Подключить через токен
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-600"></span>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">или используйте OAuth (не работает)</span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!agent) return;

                        try {
                          console.log('🔵 Starting Kommo OAuth flow...');

                          // Find or create kommo integration
                          let kommoIntegration = integrations.find((i: any) => i.integrationType === 'kommo');

                          if (!kommoIntegration) {
                            console.log('🔵 Creating new Kommo integration...');
                            // Create integration first
                            kommoIntegration = await integrationsService.upsertIntegration(
                              agent.id,
                              'kommo',
                              kommoActive,
                              false
                            );
                            await refreshIntegrations();
                            console.log('✅ Integration created:', kommoIntegration.id);
                          }

                          // Get OAuth URL (baseDomain is taken from .env on backend)
                          console.log('🔵 Fetching OAuth URL for integration:', kommoIntegration.id);
                          const response = await apiClient.get('/kommo/auth', {
                            params: {
                              integrationId: kommoIntegration.id,
                            },
                          });

                          console.log('🔵 OAuth URL response:', response.data);

                          if (response.data.authUrl) {
                            console.log('🔵 Opening popup:', response.data.authUrl);

                            // Open OAuth URL in popup
                            const width = 600;
                            const height = 700;
                            const left = window.screen.width / 2 - width / 2;
                            const top = window.screen.height / 2 - height / 2;

                            const popup = window.open(
                              response.data.authUrl,
                              'Kommo Authorization',
                              `width=${width},height=${height},left=${left},top=${top}`
                            );

                            if (!popup) {
                              alert('Popup заблокирован! Разрешите всплывающие окна для этого сайта.');
                              return;
                            }

                            // Listen for postMessage from popup
                            const messageHandler = (event: MessageEvent) => {
                              console.log('🔵 Received postMessage:', event.data);

                              if (event.data.type === 'kommo_oauth_success') {
                                console.log('✅ OAuth success!');
                                window.removeEventListener('message', messageHandler);
                                setKommoConnected(true);
                                refreshIntegrations();
                                alert('Kommo успешно подключен!');
                              }
                            };

                            window.addEventListener('message', messageHandler);

                            // Also refresh after 5 seconds as fallback
                            setTimeout(async () => {
                              console.log('🔵 Timeout refresh...');
                              await refreshIntegrations();
                              const updated = integrations.find((i: any) => i.integrationType === 'kommo');
                              if (updated?.isConnected) {
                                setKommoConnected(true);
                                console.log('✅ Kommo connected via timeout check');
                              }
                            }, 5000);
                          } else {
                            console.error('❌ No authUrl in response');
                            alert('Не удалось получить URL авторизации');
                          }
                        } catch (error: any) {
                          console.error('❌ Failed to initiate Kommo OAuth:', error);
                          alert(`Не удалось подключить Kommo: ${error.response?.data?.message || error.message}`);
                        }
                        }}
                        className="flex items-center gap-3 bg-gray-400 hover:bg-gray-500 text-white rounded-md px-4 py-2.5 transition-colors font-medium text-sm shadow-sm w-full justify-center mt-3 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        OAuth подключение (временно недоступно)
                      </button>
                    </div>
                  ) : (
                    <div className="border border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle size={20} />
                        <span className="font-medium">Kommo аккаунт подключен</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">Общие настройки</h3>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Toggle checked={kommoActive} onChange={handleKommoActiveChange} />
                      <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Включить или отключить эту интеграцию</p>

                    <button
                      onClick={handleSyncCRM}
                      disabled={isSaving || !kommoConnected}
                      className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={16} className={isSaving ? 'animate-spin' : ''} />
                      {isSaving ? 'Синхронизация...' : 'Синхронизировать настройки CRM'}
                    </button>
                    {!kommoConnected && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Сначала подключите Kommo аккаунт для синхронизации данных
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    onClick={() => setIntegrationView('list')}
                  >
                    Сохранить изменения
                  </button>
                  <button
                    onClick={() => setIntegrationView('list')}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    Отменить
                  </button>
                </div>
              </>
            )}

            {/* Google Calendar Settings View */}
            {integrationView === 'google_calendar' && (
              <>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 transition-colors">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">Подключение</h3>

                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 mb-4">
                    <button
                      onClick={() => {
                        setGoogleCalendarConnected(true);
                        setGoogleCalendarActive(true);
                      }}
                      className="flex items-center gap-3 border border-gray-300 dark:border-gray-500 rounded-md px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-600 text-gray-700 dark:text-white font-medium text-sm shadow-sm"
                    >
                      <GoogleIcon />
                      Войти через Google
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Подключая аккаунт Google, вы предоставляете доступ к своим календарям для бронирования. Вы можете отозвать доступ в любое время в настройках аккаунта Google. <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Политика конфиденциальности</a>.
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    onClick={() => setIntegrationView('list')}
                  >
                    Сохранить изменения
                  </button>
                  <button
                    onClick={() => setIntegrationView('list')}
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    Отменить
                  </button>
                </div>
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
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <button
                onClick={handleCancel}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Отмена
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
              <div><h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Триггеры</h2><p className="text-sm text-gray-500">Выполняйте мгновенные действия...</p></div>
              <button onClick={handleCreateTrigger} className="bg-[#0078D4] text-white px-4 py-2 rounded-md text-sm font-medium">Создать</button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
              {triggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Не найдено Триггеры</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Создать Триггер для старта</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr>
                      <th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Название</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Активно</th>
                      <th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Условие</th>
                      <th className="p-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {triggers.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">
                          <button onClick={() => handleEditTrigger(t)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left">
                            {t.name}
                          </button>
                        </td>
                        <td className="p-4"><Toggle checked={t.isActive} onChange={() => toggleTriggerStatus(t.id)} /></td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">{t.condition}</td>
                        <td className="p-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-4">
                            <button onClick={() => handleEditTrigger(t)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1"><Edit size={16} /> Изменить</button>
                            <button onClick={() => handleDeleteTrigger(t.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1"><Trash2 size={16} /> Удалить</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Trigger Modal */}
            {isTriggerModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsTriggerModalOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-colors animate-fadeIn">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingTriggerId ? 'Редактировать Триггер' : 'Создать Триггер'}</h2>
                    <button onClick={() => setIsTriggerModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Название */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Название<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={triggerName}
                        onChange={(e) => setTriggerName(e.target.value)}
                        placeholder="Например, запрос оплаты"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Активно */}
                    <div className="flex items-center gap-3">
                      <Toggle checked={triggerActive} onChange={setTriggerActive} />
                      <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                    </div>

                    {/* Условие */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Условие<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={triggerCondition}
                        onChange={(e) => setTriggerCondition(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder="Например, если клиент просит оплатить"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Укажите, когда этот триггер должен срабатывать</p>
                    </div>

                    {/* Действия */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Действия<span className="text-red-500">*</span></label>
                      <div className="space-y-4">
                        {triggerActions.map((action, index) => (
                          <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-gray-400 cursor-move">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 15l5 5 5-5" />
                                  <path d="M7 9l5-5 5 5" />
                                </svg>
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

                            <div>
                              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">Выберите действие<span className="text-red-500">*</span></label>
                              <select
                                value={action.action}
                                onChange={(e) => {
                                  const newActions = [...triggerActions];
                                  newActions[index].action = e.target.value;
                                  setTriggerActions(newActions);
                                }}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
                              >
                                <option value="">Выбрать вариант</option>
                                {availableActions.map((actionOption: any) => (
                                  <option key={actionOption.id} value={actionOption.id}>
                                    {actionOption.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setTriggerActions([...triggerActions, { id: Math.random().toString(), action: '' }])}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                          type="button"
                        >
                          Добавить действие
                        </button>
                      </div>
                    </div>

                    {/* Ответное сообщение */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Ответное сообщение</label>
                      <input
                        type="text"
                        value={triggerCancelMessage}
                        onChange={(e) => setTriggerCancelMessage(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder="Например, я обработал ваш запрос и создал задачу для нашей финансовой команды."
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Сообщение, возвращаемое при выполнении триггера</p>
                    </div>

                    {/* Лимит запусков в чате */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Лимит запусков в чате</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={triggerRunLimit}
                          onChange={(e) => setTriggerRunLimit(parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">раз</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Максимальное количество запусков этого триггера в одном чате. Установите 0 для неограниченного количества.</p>
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
                    <button onClick={handleSaveTrigger} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                      {editingTriggerId ? 'Сохранить' : 'Создать'}
                    </button>
                    <button onClick={() => {
                      handleSaveTrigger();
                      // Reset form for creating another
                      setTriggerName('');
                      setTriggerCondition('');
                      setTriggerActions([{ id: '1', action: '' }]);
                      setTriggerCancelMessage('');
                      setTriggerRunLimit(0);
                    }} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                      Создать и создать еще один
                    </button>
                    <button onClick={() => setIsTriggerModalOpen(false)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                      Отменить
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
                <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Цепочки</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Автоматизируйте отправку последующих сообщений и выполнение действий по расписанию.</p>
              </div>
              <button onClick={handleCreateChain} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors">Создать</button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
              {chains.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Не найдено Цепочки</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Создать Цепочки для старта</p>
                </div>
              ) : (
                <table className="w-full"><thead className="bg-gray-50 dark:bg-gray-750"><tr><th className="w-12 p-4"><input type="checkbox" className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">Название</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">Активно</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-white">Шаги</th><th className="px-4 py-3 text-right"></th></tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {chains.map(chain => (
                      <tr key={chain.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-4"><input type="checkbox" className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#0078D4] checked:border-[#0078D4] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat transition-all cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-[#0078D4]" /></td>
                        <td className="px-4 py-4 text-sm font-medium"><button onClick={() => handleEditChain(chain)} className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left">{chain.name}</button></td>
                        <td className="px-4 py-4"><Toggle checked={chain.isActive} onChange={() => toggleChainStatus(chain.id)} /></td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{chain.steps.length}</td>
                        <td className="px-4 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-4">
                            <button onClick={() => handleEditChain(chain)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1"><Edit size={16} /> Изменить</button>
                            <button onClick={() => handleDeleteChain(chain.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1"><Trash2 size={16} /> Удалить</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* Pagination Mock */}
              {chains.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6"><div className="text-sm text-gray-700 dark:text-gray-300">Показано с 1 по {chains.length} из {chains.length}</div></div>
              )}
            </div>
            {/* Chain Modal */}
            {isChainModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsChainModalOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col transition-colors animate-fadeIn">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingChainId ? 'Редактировать Цепочку' : 'Создать Цепочку'}</h2>
                    <button onClick={() => setIsChainModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Название<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={chainName}
                        onChange={(e) => setChainName(e.target.value)}
                        placeholder="Например, Follow-up"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-3">
                      <Toggle checked={chainActive} onChange={setChainActive} />
                      <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                    </div>

                    {/* Conditions Accordion */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsChainConditionsOpen(!isChainConditionsOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                            <Settings size={18} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Условия</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Выберите, когда запускать эту цепочку</div>
                          </div>
                        </div>
                        {isChainConditionsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainConditionsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-5 bg-white dark:bg-gray-800">
                          <div className="flex items-center gap-3">
                            <Toggle checked={chainAllStages} onChange={setChainAllStages} />
                            <span className="text-sm text-gray-900 dark:text-white">Любой этап сделки, разрешённый для этого агента ИИ</span>
                          </div>

                          {!chainAllStages && (
                            <div>
                              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">Этапы сделки<span className="text-red-500">*</span></label>
                              <div className="relative">
                                <select
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                  value={chainStages[0] || ''}
                                  onChange={(e) => setChainStages([e.target.value])}
                                >
                                  <option value="">Выберите этапы сделки...</option>
                                  {availablePipelines.length > 0 && availablePipelines[0].stages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                  ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Если выбранный этап не разрешён в настройках воронки агента ИИ, цепочка не запустится и дальнейшие шаги не будут выполнены.</p>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">Не запускать цепочку, когда</label>
                            <textarea
                              value={chainExcludeCondition}
                              onChange={(e) => setChainExcludeCondition(e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                              placeholder="например, клиент попросил не писать или клиенту больше не нужна помощь и т. д."
                            />
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Пропускать цепочку, когда это правило истинно (оставьте пустым, если это не требуется).</p>
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
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                            <List size={18} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Шаги</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Добавьте действия для этой цепочки</div>
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
                                    Шаг
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
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Время ожидания после предыдущего сообщения</label>
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
                                        <option value="Минуты">Минуты</option>
                                        <option value="Часы">Часы</option>
                                        <option value="Дни">Дни</option>
                                      </select>
                                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                  </div>
                                </div>

                                {/* Actions List */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Действия<span className="text-red-500">*</span></label>
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
                                              {action.type === 'generate_message' ? 'Сгенерировать сообщение' : 'Действие'}
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
                                            <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Выберите действие<span className="text-red-500">*</span></label>
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
                                                <option value="">Выберите действие</option>
                                                {availableActions.map((actionOption: any) => (
                                                  <option key={actionOption.id} value={actionOption.id}>
                                                    {actionOption.name}
                                                  </option>
                                                ))}
                                              </select>
                                              <X size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400" />
                                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-[10px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400 mb-1">Инструкция<span className="text-red-500">*</span></label>
                                            <textarea
                                              value={action.instruction}
                                              onChange={(e) => {
                                                const newSteps = [...chainSteps];
                                                newSteps[stepIndex].actions[actionIndex].instruction = e.target.value;
                                                setChainSteps(newSteps);
                                              }}
                                              rows={3}
                                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                              placeholder="например: попросите клиента подтвердить заказ"
                                            />
                                            <p className="mt-1 text-[10px] text-gray-400">ИИ создаст персонализированное сообщение на основе этой инструкции и контекста разговора.</p>
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
                                      Добавить действие
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
                              Добавить шаг
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
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                            <Clock size={18} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Рабочие часы цепочки</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Автоматические шаги цепочки выполняются только в указанные часы. Если время наступает вне рабочих часов, выполнение переносится на начало следующего рабочего дня.</div>
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
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={day.start}
                                    disabled={!day.enabled}
                                    onChange={(e) => {
                                      const newSchedule = chainSchedule.map(d => d.day === day.day ? { ...d, start: e.target.value } : d);
                                      setChainSchedule(newSchedule);
                                    }}
                                    className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={day.end}
                                    disabled={!day.enabled}
                                    onChange={(e) => {
                                      const newSchedule = chainSchedule.map(d => d.day === day.day ? { ...d, end: e.target.value } : d);
                                      setChainSchedule(newSchedule);
                                    }}
                                    className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
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
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                            <Settings2 size={18} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Дополнительные настройки</div>
                          </div>
                        </div>
                        {isChainSettingsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>

                      {isChainSettingsOpen && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-gray-800">
                          <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5">Лимит запусков в чате</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={chainRunLimit}
                                onChange={(e) => setChainRunLimit(parseInt(e.target.value) || 0)}
                                min="0"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">раз</span>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Максимальное количество запусков этой цепочки в одном чате. Установите 0 для неограниченного количества.</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0">
                    <button onClick={handleSaveChain} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                      {editingChainId ? 'Сохранить' : 'Создать'}
                    </button>
                    <button onClick={() => setIsChainModalOpen(false)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                      Отменить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* End Tabs Container */}
    </div>
  );
};

export default AgentEditor;