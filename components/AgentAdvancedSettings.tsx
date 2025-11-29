import React, { useState, forwardRef, useImperativeHandle, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Languages, Clock, ChevronDown } from 'lucide-react';
import { Agent } from '../types';
import { agentService } from '../src/services/api';
import apiClient from '../src/services/api/apiClient';

interface WorkingDay {
    day: string;
    enabled: boolean;
    start: string;
    end: string;
}

const DEFAULT_WORKING_HOURS: WorkingDay[] = [
    { day: 'Понедельник', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Вторник', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Среда', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Четверг', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Пятница', enabled: true, start: '09:00', end: '18:00' },
    { day: 'Суббота', enabled: false, start: '10:00', end: '16:00' },
    { day: 'Воскресенье', enabled: false, start: '10:00', end: '16:00' },
];

interface AgentAdvancedSettingsProps {
    agent?: Agent | null;
}

export interface AgentAdvancedSettingsRef {
    getData: () => any;
}

// Toggle component - memoized to prevent unnecessary re-renders
const Toggle = memo(({ checked, onChange, disabled }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${checked ? 'bg-[#0078D4]' : 'bg-gray-200 dark:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ transition: 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
        <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md ring-0 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
            style={{ transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
    </button>
));

export const AgentAdvancedSettings = forwardRef<AgentAdvancedSettingsRef, AgentAdvancedSettingsProps>(({ agent }, ref) => {
    const { t } = useTranslation();

    // Model states
    const [advancedModel, setAdvancedModel] = useState(agent?.model || 'openai/gpt-4o');
    const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; description?: string }>>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    // Language states
    const [autoLanguage, setAutoLanguage] = useState(false);
    const [responseLanguage, setResponseLanguage] = useState('');

    // Schedule states
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [agentSchedule, setAgentSchedule] = useState<WorkingDay[]>(DEFAULT_WORKING_HOURS);

    // Response settings
    const [responseDelay, setResponseDelay] = useState(45);

    // Memory states
    const [memoryEnabled, setMemoryEnabled] = useState(true);
    const [graphEnabled, setGraphEnabled] = useState(true);
    const [contextWindow, setContextWindow] = useState(20);
    const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(true);

    // Internal models
    const [factExtractionModel, setFactExtractionModel] = useState('openai/gpt-4o-mini');
    const [triggerEvaluationModel, setTriggerEvaluationModel] = useState('openai/gpt-4o-mini');
    const [chainMessageModel, setChainMessageModel] = useState('openai/gpt-4o-mini');
    const [emailGenerationModel, setEmailGenerationModel] = useState('openai/gpt-4o-mini');
    const [instructionParsingModel, setInstructionParsingModel] = useState('openai/gpt-4o-mini');
    const [kbAnalysisModel, setKbAnalysisModel] = useState('anthropic/claude-3.5-sonnet');

    // Load models
    useEffect(() => {
        const loadModels = async () => {
            setModelsLoading(true);
            try {
                const response = await apiClient.get('/models');
                if (response.data.success && response.data.models) {
                    const models = response.data.models;
                    setAvailableModels(models);

                    // Если у агента есть модель, проверяем что она существует в списке
                    if (agent?.model) {
                        const modelExists = models.some((m: { id: string }) => m.id === agent.model);
                        if (modelExists) {
                            setAdvancedModel(agent.model);
                        } else {
                            console.warn(`Model "${agent.model}" not found in available models, using default`);
                            setAdvancedModel(models[0]?.id || 'openai/gpt-4o');
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load models:', error);
                // Если не удалось загрузить модели, используем модели по умолчанию
                const defaultModels = [
                    { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
                    { id: 'openai/gpt-4-turbo', name: 'OpenAI GPT-4 Turbo' },
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
                ];
                setAvailableModels(defaultModels);

                if (agent?.model) {
                    const modelExists = defaultModels.some(m => m.id === agent.model);
                    setAdvancedModel(modelExists ? agent.model : 'openai/gpt-4o');
                }
            } finally {
                setModelsLoading(false);
            }
        };
        loadModels();
    }, [agent?.model]);

    // Load agent advanced settings from API
    useEffect(() => {
        if (agent?.id) {
            const loadAdvancedSettings = async () => {
                try {
                    const settings = await agentService.getAdvancedSettings(agent.id);

                    if (settings.model) {
                        setAdvancedModel(settings.model);
                    }

                    setAutoLanguage(settings.autoDetectLanguage ?? false);
                    setResponseLanguage(settings.responseLanguage || '');
                    setScheduleEnabled(settings.scheduleEnabled ?? false);
                    setResponseDelay(settings.responseDelaySeconds ?? 45);
                    setMemoryEnabled(settings.memoryEnabled ?? true);
                    setGraphEnabled(settings.graphEnabled ?? true);
                    setContextWindow(settings.contextWindow ?? 20);
                    setSemanticSearchEnabled(settings.semanticSearchEnabled ?? true);

                    if (settings.scheduleData) {
                        setAgentSchedule(settings.scheduleData);
                    }

                    // Internal models
                    if (settings.factExtractionModel) setFactExtractionModel(settings.factExtractionModel);
                    if (settings.triggerEvaluationModel) setTriggerEvaluationModel(settings.triggerEvaluationModel);
                    if (settings.chainMessageModel) setChainMessageModel(settings.chainMessageModel);
                    if (settings.emailGenerationModel) setEmailGenerationModel(settings.emailGenerationModel);
                    if (settings.instructionParsingModel) setInstructionParsingModel(settings.instructionParsingModel);
                    if (settings.kbAnalysisModel) setKbAnalysisModel(settings.kbAnalysisModel);
                } catch (error) {
                    console.error('Failed to load advanced settings:', error);
                    // Если настройки не найдены, используем значения по умолчанию (уже установлены в useState)
                }
            };
            loadAdvancedSettings();
        }
    }, [agent?.id]);

    const toggleAgentWorkingDay = (day: string) => {
        setAgentSchedule(prev => prev.map(d => d.day === day ? { ...d, enabled: !d.enabled } : d));
    };

    // Expose getData method
    useImperativeHandle(ref, () => ({
        getData: () => ({
            model: advancedModel,
            advancedSettings: {
                model: advancedModel,
                autoDetectLanguage: autoLanguage,
                responseLanguage,
                scheduleEnabled,
                scheduleData: agentSchedule,
                responseDelaySeconds: responseDelay,
                memoryEnabled,
                graphEnabled,
                contextWindow,
                semanticSearchEnabled,
                factExtractionModel,
                triggerEvaluationModel,
                chainMessageModel,
                emailGenerationModel,
                instructionParsingModel,
                kbAnalysisModel,
            }
        })
    }));

    return (
        <div className="p-6 space-y-6">
            {/* Model Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Cpu size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.aiModel.title')}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.aiModel.selectModel')}<span className="text-red-500">*</span>
                            {modelsLoading && <span className="ml-2 text-xs text-gray-500">({t('agentEditor.aiModel.loading')})</span>}
                        </label>
                        <div className="relative">
                            <select
                                value={advancedModel}
                                onChange={(e) => setAdvancedModel(e.target.value)}
                                disabled={modelsLoading}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {availableModels.length === 0 ? (
                                    <option value="">{t('agentEditor.aiModel.loadingModels')}</option>
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('agentEditor.aiModel.description')}</p>
                    </div>
                </div>
            </div>

            {/* Language Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Languages size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.language.title')}</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Toggle checked={autoLanguage} onChange={setAutoLanguage} />
                        <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.language.autoDetect')}</span>
                    </div>
                    {!autoLanguage && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('agentEditor.language.responseLanguage')}</label>
                            <input
                                type="text"
                                value={responseLanguage}
                                onChange={(e) => setResponseLanguage(e.target.value)}
                                placeholder={t('agentEditor.language.placeholder')}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('agentEditor.language.description')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Clock size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.schedule.title')}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.schedule.description')}</p>
                    <div className="flex items-center gap-3">
                        <Toggle checked={scheduleEnabled} onChange={setScheduleEnabled} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.schedule.enable')}</span>
                    </div>
                    {scheduleEnabled && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.schedule.configureHours')}</p>
                            {agentSchedule.map((day) => (
                                <div key={day.day} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-3 w-40">
                                        <Toggle checked={day.enabled} onChange={() => toggleAgentWorkingDay(day.day)} />
                                        <span className={`text-sm ${day.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{day.day}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="time"
                                            value={day.start}
                                            disabled={!day.enabled}
                                            onChange={(e) => {
                                                const newSchedule = agentSchedule.map(d => d.day === day.day ? { ...d, start: e.target.value } : d);
                                                setAgentSchedule(newSchedule);
                                            }}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="time"
                                            value={day.end}
                                            disabled={!day.enabled}
                                            onChange={(e) => {
                                                const newSchedule = agentSchedule.map(d => d.day === day.day ? { ...d, end: e.target.value } : d);
                                                setAgentSchedule(newSchedule);
                                            }}
                                            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
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
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.responseSettings.title')}</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('agentEditor.responseSettings.delayLabel')}</label>
                        <input
                            type="number"
                            value={responseDelay}
                            onChange={(e) => setResponseDelay(Number(e.target.value))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('agentEditor.responseSettings.delayDescription')}</p>
                    </div>
                </div>
            </div>

            {/* Memory & Context Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Cpu size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.memory.title')}</h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* Memory Toggle */}
                    <div className="flex items-center gap-3">
                        <Toggle checked={memoryEnabled} onChange={setMemoryEnabled} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.memory.longTermMemory')}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('agentEditor.memory.longTermMemoryDesc')}
                    </p>

                    {/* Graph Toggle */}
                    <div className="flex items-center gap-3">
                        <Toggle checked={graphEnabled} onChange={setGraphEnabled} disabled={!memoryEnabled} />
                        <span className={`text-sm font-medium ${memoryEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                            {t('agentEditor.memory.relationGraph')}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('agentEditor.memory.relationGraphDesc')}
                    </p>

                    {/* Context Window */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.memory.contextWindowSize')}
                        </label>
                        <input
                            type="number"
                            value={contextWindow}
                            onChange={(e) => setContextWindow(Number(e.target.value))}
                            min="5"
                            max="50"
                            disabled={!memoryEnabled}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t('agentEditor.memory.factsCount')}
                        </p>
                    </div>

                    {/* Semantic Search Toggle */}
                    <div className="flex items-center gap-3">
                        <Toggle checked={semanticSearchEnabled} onChange={setSemanticSearchEnabled} disabled={!memoryEnabled} />
                        <span className={`text-sm font-medium ${memoryEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                            {t('agentEditor.memory.semanticSearch')}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('agentEditor.memory.semanticSearchDesc')}
                    </p>
                </div>
            </div>

            {/* Internal AI Models Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Cpu size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.internalModels.title')}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        {t('agentEditor.internalModels.description')}
                    </p>

                    {/* Fact Extraction Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.factExtraction')}
                        </label>
                        <select
                            value={factExtractionModel}
                            onChange={(e) => setFactExtractionModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.factExtractionDesc')}
                        </p>
                    </div>

                    {/* Trigger Evaluation Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.triggerEvaluation')}
                        </label>
                        <select
                            value={triggerEvaluationModel}
                            onChange={(e) => setTriggerEvaluationModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.triggerEvaluationDesc')}
                        </p>
                    </div>

                    {/* Chain Message Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.chainAiMessage')}
                        </label>
                        <select
                            value={chainMessageModel}
                            onChange={(e) => setChainMessageModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.chainAiMessageDesc')}
                        </p>
                    </div>

                    {/* Email Generation Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.emailGeneration')}
                        </label>
                        <select
                            value={emailGenerationModel}
                            onChange={(e) => setEmailGenerationModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.emailGenerationDesc')}
                        </p>
                    </div>

                    {/* Instruction Parsing Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.instructionParsing')}
                        </label>
                        <select
                            value={instructionParsingModel}
                            onChange={(e) => setInstructionParsingModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.instructionParsingDesc')}
                        </p>
                    </div>

                    {/* KB Analysis Model */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('agentEditor.internalModels.kbAnalysis')}
                        </label>
                        <select
                            value={kbAnalysisModel}
                            onChange={(e) => setKbAnalysisModel(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            {modelsLoading ? (
                                <option>{t('agentEditor.aiModel.loadingModels')}</option>
                            ) : (
                                availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('agentEditor.internalModels.kbAnalysisDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});
