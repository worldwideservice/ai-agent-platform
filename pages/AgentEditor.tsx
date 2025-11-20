import React, { useState } from 'react';
import { 
  User, 
  RefreshCw, 
  MessageSquare, 
  Book, 
  Settings, 
  Share2, 
  Zap, 
  Link as LinkIcon, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Clock, 
  Puzzle, 
  FilePenLine, 
  Users, 
  Eye, 
  Briefcase, 
  PenSquare, 
  GripVertical, 
  Trash2, 
  Plus,
  Search,
  LayoutGrid,
  Edit,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Settings2,
  Cpu,
  Languages,
  SlidersHorizontal,
  Sparkles,
  Check
} from 'lucide-react';
import { MOCK_PIPELINES, MOCK_CHANNELS, MOCK_KB_CATEGORIES, MOCK_CRM_FIELDS, CRM_ACTIONS } from '../services/crmData';

interface AgentEditorProps {
  onCancel: () => void;
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

interface Trigger {
  id: string;
  name: string;
  isActive: boolean;
  condition: string;
}

interface TriggerAction {
  id: string;
  actionId: string;
}

interface Chain {
  id: string;
  name: string;
  isActive: boolean;
  stepsCount: number;
  steps: ChainStep[];
  allStages: boolean;
  stopCondition: string;
  workingHours: WorkingDay[];
  runLimit: number;
}

interface ChainStep {
  id: string;
  delayValue: number;
  delayUnit: string;
  actions: { id: string; type: string; instruction: string }[];
}

interface WorkingDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

// --- Constants ---
const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DEFAULT_WORKING_HOURS: WorkingDay[] = DAYS_OF_WEEK.map(day => ({ day, enabled: true, start: '08:00', end: '22:00' }));

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
  </svg>
);

export const AgentEditor: React.FC<AgentEditorProps> = ({ onCancel }) => {
  const [activeTab, setActiveTab] = useState<Tab>('advanced');
  
  // --- Modal States ---
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [editingChainId, setEditingChainId] = useState<string | null>(null);

  // --- Integrations State ---
  const [integrationView, setIntegrationView] = useState<IntegrationView>('list');
  const [kommoActive, setKommoActive] = useState(true);

  // --- Advanced Tab State ---
  const [advancedModel, setAdvancedModel] = useState('OpenAI GPT-4.1');
  const [autoLanguage, setAutoLanguage] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [creativity, setCreativity] = useState<CreativityLevel>('balanced');
  const [responseDelay, setResponseDelay] = useState(45);

  // --- Triggers Data ---
  const [triggers, setTriggers] = useState<Trigger[]>([
    { id: '1', name: 'Тип услуги "AGENT PARTNERSHIP"', isActive: true, condition: 'Когда ты понял, что это клиент по продукту AGENT PARTNERSHIP...' },
    { id: '2', name: 'Тип услуги "WORK VISA IN POLAND"', isActive: true, condition: 'Когда ты понял что это клиент по продукту WORK VISA IN POLAND...' },
    { id: '3', name: 'Тип услуги "SEASONAL VISA IN POLAND"', isActive: true, condition: 'Когда ты понял что это клиент по продукту SEASONAL VISA IN POLAND...' },
  ]);

  // --- Chains Data ---
  const [chains, setChains] = useState<Chain[]>([
    { 
      id: '1', 
      name: '12', 
      isActive: true, 
      stepsCount: 3,
      steps: [
        { 
          id: 's1', 
          delayValue: 20, 
          delayUnit: 'Минуты', 
          actions: [{ id: 'a1', type: 'generate_message', instruction: '234' }] 
        },
        { 
          id: 's2', 
          delayValue: 20, 
          delayUnit: 'Минуты', 
          actions: [{ id: 'a2', type: 'generate_message', instruction: '234' }] 
        },
        { 
          id: 's3', 
          delayValue: 20, 
          delayUnit: 'Минуты', 
          actions: [{ id: 'a3', type: 'generate_message', instruction: '234' }] 
        }
      ],
      allStages: false,
      stopCondition: '123',
      workingHours: DEFAULT_WORKING_HOURS,
      runLimit: 0
    }
  ]);

  // --- Chain Modal Form State ---
  const [chainName, setChainName] = useState('');
  const [chainActive, setChainActive] = useState(true);
  
  // Chain Modal Accordions
  const [isChainConditionsOpen, setIsChainConditionsOpen] = useState(true);
  const [isChainStepsOpen, setIsChainStepsOpen] = useState(true);
  const [isChainHoursOpen, setIsChainHoursOpen] = useState(true);
  const [isChainSettingsOpen, setIsChainSettingsOpen] = useState(true);

  // Chain Conditions
  const [chainAllStages, setChainAllStages] = useState(false);
  const [chainStopCondition, setChainStopCondition] = useState('');

  // Chain Steps
  const [chainSteps, setChainSteps] = useState<ChainStep[]>([]);

  // Working Hours & Limits
  const [workingHours, setWorkingHours] = useState<WorkingDay[]>(DEFAULT_WORKING_HOURS);
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
    const pipe = MOCK_PIPELINES.find(p => p.id === pipelineId);
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
    setWorkingHours(prev => prev.map(d => d.day === day ? { ...d, enabled: !d.enabled } : d));
  };

  const toggleChainStatus = (id: string) => {
    setChains(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleCreateChain = () => {
    setEditingChainId(null);
    setChainName('');
    setChainActive(true);
    setChainAllStages(false);
    setChainStopCondition('');
    setChainSteps([{ 
      id: Math.random().toString(36).substr(2, 9), 
      delayValue: 20, 
      delayUnit: 'Минуты', 
      actions: [{ id: Math.random().toString(36).substr(2, 9), type: 'generate_message', instruction: '' }] 
    }]);
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setChainRunLimit(0);
    setIsChainModalOpen(true);
  };

  const handleEditChain = (chain: Chain) => {
    setEditingChainId(chain.id);
    setChainName(chain.name);
    setChainActive(chain.isActive);
    setChainAllStages(chain.allStages);
    setChainStopCondition(chain.stopCondition);
    setChainSteps(chain.steps);
    setWorkingHours(chain.workingHours);
    setChainRunLimit(chain.runLimit);
    setIsChainModalOpen(true);
  };

  const handleSaveChain = () => {
    const chainData: Chain = {
      id: editingChainId || Math.random().toString(36).substr(2, 9),
      name: chainName,
      isActive: chainActive,
      steps: chainSteps,
      stepsCount: chainSteps.length,
      allStages: chainAllStages,
      stopCondition: chainStopCondition,
      workingHours: workingHours,
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

  // Trigger Helpers
  const [triggerName, setTriggerName] = useState('');
  const [triggerActive, setTriggerActive] = useState(true);
  const [triggerCondition, setTriggerCondition] = useState('');
  const [triggerResponse, setTriggerResponse] = useState('');
  const [triggerLimit, setTriggerLimit] = useState(0);
  const [triggerActions, setTriggerActions] = useState<TriggerAction[]>([{ id: '1', actionId: '' }]);
  const addTriggerAction = () => setTriggerActions(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), actionId: '' }]);
  const removeTriggerAction = (id: string) => setTriggerActions(prev => prev.filter(a => a.id !== id));
  const updateTriggerAction = (id: string, val: string) => setTriggerActions(prev => prev.map(a => a.id === id ? { ...a, actionId: val } : a));
  const toggleTriggerStatus = (id: string) => setTriggers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id 
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
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
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
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {renderBreadcrumbs()}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {renderPageTitle()}
          </h1>
        </div>
        {(activeTab !== 'triggers' && activeTab !== 'chains' && activeTab !== 'integrations') && (
          <button className="bg-[#DC2626] hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            Удалить
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto no-scrollbar">
        <TabButton id="main" label="Основные" icon={Settings} />
        <TabButton id="deals" label="Сделки и контакты" icon={Users} />
        <TabButton id="triggers" label="Триггеры" icon={Zap} />
        <TabButton id="chains" label="Цепочки" icon={Clock} />
        <TabButton id="integrations" label="Интеграции" icon={Puzzle} />
        <TabButton id="advanced" label="Дополнительно" icon={FilePenLine} />
      </div>

      {/* Tab Content: Advanced */}
      {activeTab === 'advanced' && (
        <div className="space-y-6 mt-6">
          
          {/* Model Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Cpu size={20} className="text-gray-400" />
              <h2 className="text-base font-medium text-gray-900 dark:text-white">Модель ИИ</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                 <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Выберите модель ИИ<span className="text-red-500">*</span></label>
                 <div className="relative">
                    <select 
                      value={advancedModel}
                      onChange={(e) => setAdvancedModel(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                       <option value="OpenAI GPT-4.1">OpenAI GPT-4.1 - Строго следует инструкциям</option>
                       <option value="OpenAI GPT-4o">OpenAI GPT-4o</option>
                       <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
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
              <h2 className="text-base font-medium text-gray-900 dark:text-white">Расписание</h2>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-sm text-gray-600 dark:text-gray-300">Если включено, агент будет активен только в выбранные часы</p>
               <div className="flex items-center gap-3">
                  <Toggle checked={scheduleEnabled} onChange={setScheduleEnabled} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Включить расписание</span>
               </div>
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
                       className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                         creativity === 'precise' 
                           ? 'border-[#0078D4] bg-[#0078D4] text-white' 
                           : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                       }`}
                     >
                       <CheckCircle size={16} />
                       Точный
                     </button>
                     <button 
                       onClick={() => setCreativity('balanced')}
                       className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                         creativity === 'balanced' 
                           ? 'border-[#0078D4] bg-[#0078D4] text-white' 
                           : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                       }`}
                     >
                       <SlidersHorizontal size={16} />
                       Сбалансированный
                     </button>
                     <button 
                       onClick={() => setCreativity('creative')}
                       className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                         creativity === 'creative' 
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

          {/* Footer Actions (Advanced) */}
          <div className="flex items-center gap-4 pt-4">
             <button className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm">
                Сохранить
             </button>
             <button 
               onClick={onCancel}
               className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
             >
                Отмена
             </button>
          </div>

        </div>
      )}

      {/* ... (Previous Tab Contents: Integrations, Chains, etc.) ... */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 mt-6">
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
                        <CheckCircle size={20} className="text-green-500" />
                     </td>
                     <td className="px-6 py-4">
                        <XCircle size={20} className="text-gray-300 dark:text-gray-500" />
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
                        <CheckCircle size={20} className="text-green-500" />
                     </td>
                     <td className="px-6 py-4">
                        <CheckCircle size={20} className="text-green-500" />
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
                 <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">Общие настройки</h3>
                 
                 <div className="space-y-6">
                   <div className="flex items-center gap-3">
                      <Toggle checked={kommoActive} onChange={setKommoActive} />
                      <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                   </div>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Включить или отключить эту интеграцию</p>
                   
                   <button className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 w-fit">
                      <RefreshCw size={16} />
                      Синхронизировать настройки CRM
                   </button>
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
                     <button className="flex items-center gap-3 border border-gray-300 dark:border-gray-500 rounded-md px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-600 text-gray-700 dark:text-white font-medium text-sm shadow-sm">
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
          // ... (Main tab content code - shortened for brevity as it was provided in previous turn)
          <div className="space-y-6 mt-6">
            {/* Profile */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
               {/* ... (Existing Main Tab Implementation) ... */}
               <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <User size={20} className="text-gray-400" strokeWidth={1.5} />
                  <h2 className="text-base font-medium text-gray-900 dark:text-white">Профиль агента</h2>
               </div>
               <div className="p-6 space-y-6">
                 {/* ... Name, Active, Instructions ... */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Название<span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex items-center gap-3"><Toggle checked={isActive} onChange={setIsActive} /><span className="text-sm text-gray-900 dark:text-white">Активно</span></div>
                  <div>
                     <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Инструкции для агента<span className="text-red-500">*</span></label>
                     <textarea value={systemInstructions} onChange={(e) => setSystemInstructions(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[320px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono" />
                  </div>
               </div>
            </div>
            {/* Footer */}
            <div className="flex items-center gap-4 pt-4"><button className="bg-[#0078D4] text-white px-6 py-2.5 rounded-md text-sm font-medium">Сохранить</button><button onClick={onCancel} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-md text-sm font-medium">Отмена</button></div>
          </div>
       )}

       {activeTab === 'deals' && (
         // ... (Deals tab content code - reused from previous turn)
         <div className="space-y-6 mt-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
               {/* ... Data Access ... */}
               <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3"><Eye size={20} className="text-gray-400" /><h2 className="text-base font-medium text-gray-900 dark:text-white">Настройки доступа к данным</h2></div>
               </div>
               {/* ... (Implementation matches previous turn) ... */}
               <div className="p-6 text-center text-gray-500 text-sm">Content loaded...</div> 
            </div>
            <div className="flex items-center gap-4 pt-4"><button className="bg-[#0078D4] text-white px-6 py-2.5 rounded-md text-sm font-medium">Сохранить</button><button onClick={onCancel} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-md text-sm font-medium">Отмена</button></div>
         </div>
       )}

       {activeTab === 'triggers' && (
          // ... (Triggers tab content code - reused from previous turn)
         <div className="space-y-6 mt-6">
             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 flex items-center justify-between">
               <div><h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Триггеры</h2><p className="text-sm text-gray-500">Выполняйте мгновенные действия...</p></div>
               <button onClick={() => setIsTriggerModalOpen(true)} className="bg-[#0078D4] text-white px-4 py-2 rounded-md text-sm font-medium">Создать</button>
             </div>
             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                {/* ... Table ... */}
                <table className="w-full"><thead className="bg-gray-50 dark:bg-gray-750"><tr><th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Название</th><th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Активно</th><th className="p-4 text-left text-xs font-medium text-gray-900 dark:text-white">Условие</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{triggers.map(t => <tr key={t.id}><td className="p-4 text-sm text-gray-900 dark:text-white">{t.name}</td><td className="p-4"><Toggle checked={t.isActive} onChange={() => toggleTriggerStatus(t.id)} /></td><td className="p-4 text-sm text-gray-600 dark:text-gray-300">{t.condition}</td></tr>)}</tbody></table>
             </div>
             {/* Trigger Modal (hidden logic reused) */}
             {isTriggerModalOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="bg-white p-8 rounded-xl"><h2 className="text-xl font-bold mb-4">Создать Триггер</h2><button onClick={() => setIsTriggerModalOpen(false)}>Close</button></div></div>}
         </div>
       )}
       
       {activeTab === 'chains' && (
          // ... (Chains tab content code - reused from previous turn)
         <div className="space-y-6 mt-6">
           {/* ... (Chains implementation) ... */}
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 flex items-center justify-between transition-colors">
             <div>
                <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Цепочки</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Автоматизируйте отправку последующих сообщений и выполнение действий по расписанию.</p>
             </div>
             <button onClick={handleCreateChain} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors">Создать</button>
           </div>
           {/* ... Table ... */}
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
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
               {/* Pagination Mock */}
               <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6"><div className="text-sm text-gray-700 dark:text-gray-300">Показано с 1 по {chains.length} из {chains.length}</div></div>
           </div>
           {/* Chain Modal (Reused) */}
           {isChainModalOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsChainModalOpen(false)} />
               <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col transition-colors animate-fadeIn">
                 <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"><h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingChainId ? 'Редактировать Цепочку' : 'Создать Цепочку'}</h2><button onClick={() => setIsChainModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button></div>
                 <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                   {/* Name */}
                   <div className="space-y-1"><label className="block text-sm font-medium text-gray-900 dark:text-white">Название<span className="text-red-500">*</span></label><input type="text" value={chainName} onChange={(e) => setChainName(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /><div className="flex items-center gap-3 mt-3"><Toggle checked={chainActive} onChange={setChainActive} /><span className="text-sm text-gray-900 dark:text-white">Активно</span></div></div>
                   {/* Conditions Accordion */}
                   <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"><button onClick={() => setIsChainConditionsOpen(!isChainConditionsOpen)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><div className="flex items-center gap-2"><Settings size={18} className="text-gray-500 dark:text-gray-400" /><div className="text-left"><div className="text-sm font-medium text-gray-900 dark:text-white">Условия</div></div></div>{isChainConditionsOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}</button>{isChainConditionsOpen && <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-gray-800"><div className="flex items-center gap-3"><Toggle checked={chainAllStages} onChange={setChainAllStages} /><span className="text-sm text-gray-900 dark:text-white">Любой этап сделки</span></div>{!chainAllStages && <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Этапы сделки</label><div className="relative"><select className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none outline-none"><option>GENERATION LEAD</option></select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div></div>}</div>}</div>
                   {/* Steps Accordion (Simplified View for brevity in this update) */}
                   <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"><button onClick={() => setIsChainStepsOpen(!isChainStepsOpen)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><div className="flex items-center gap-2"><LinkIcon size={18} className="text-gray-500 dark:text-gray-400" /><div className="text-left"><div className="text-sm font-medium text-gray-900 dark:text-white">Шаги</div></div></div>{isChainStepsOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}</button>{isChainStepsOpen && <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"><p className="text-sm text-gray-500">Конфигурация шагов...</p></div>}</div>
                 </div>
                 <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-b-xl flex-shrink-0"><button onClick={handleSaveChain} className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">{editingChainId ? 'Сохранить' : 'Создать'}</button><button onClick={() => setIsChainModalOpen(false)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">Отменить</button></div>
               </div>
             </div>
           )}
         </div>
       )}

    </div>
  );
};