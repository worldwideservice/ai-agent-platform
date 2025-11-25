import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import {
    User,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
    HelpCircle,
    Book,
    Share2,
    Briefcase
} from 'lucide-react';
import { MOCK_PIPELINES, MOCK_CHANNELS, MOCK_KB_CATEGORIES } from '../services/crmData';
import { Agent } from '../types';

interface AgentBasicSettingsProps {
    agent?: Agent | null;
    onCancel: () => void;
    crmConnected: boolean;
    kbCategories: { id: string; name: string }[];
    onNavigateToKbArticles: () => void;
    onSyncCRM: () => Promise<void>;
}

export interface AgentBasicSettingsRef {
    getData: () => Partial<Agent>;
}

export const AgentBasicSettings = forwardRef<AgentBasicSettingsRef, AgentBasicSettingsProps>(({ agent, onCancel, crmConnected, kbCategories, onNavigateToKbArticles, onSyncCRM }, ref) => {
    // Parse CRM data from agent
    const parseCrmData = () => {
        if (!agent?.crmData) return null;
        // If it's already an object (parsed by backend), return as-is
        if (typeof agent.crmData === 'object') {
            return agent.crmData;
        }
        // If it's a string, try to parse it
        try {
            let parsed = JSON.parse(agent.crmData);
            // Handle double-encoded JSON (string inside string)
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            return parsed;
        } catch {
            return null;
        }
    };

    // Parse pipeline settings from agent
    const parsePipelineSettings = () => {
        if (!agent?.pipelineSettings) return null;
        // If it's already an object (parsed by backend), return as-is
        if (typeof agent.pipelineSettings === 'object') {
            return agent.pipelineSettings;
        }
        try {
            return JSON.parse(agent.pipelineSettings);
        } catch {
            return null;
        }
    };

    const crmData = parseCrmData();
    const availablePipelines = crmData?.pipelines || MOCK_PIPELINES;
    const availableChannels = crmData?.channels || MOCK_CHANNELS;
    const savedPipelineSettings = parsePipelineSettings();

    // --- State ---
    // Profile
    const [name, setName] = useState(agent?.name || 'АИ ассистент');
    const [isActive, setIsActive] = useState(agent?.isActive || false);
    const [systemInstructions, setSystemInstructions] = useState(agent?.systemInstructions || 'Вы — полезный помощник.');

    // Interactions
    const [checkBeforeSend, setCheckBeforeSend] = useState(agent?.checkBeforeSend || false);

    // Sync status
    const [isSyncing, setIsSyncing] = useState(false);

    // Pipelines
    const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({ 'pipeline_1': true });
    const [activePipelines, setActivePipelines] = useState<Record<string, boolean>>(() => {
        if (!savedPipelineSettings?.pipelines) return {};
        const active: Record<string, boolean> = {};
        Object.keys(savedPipelineSettings.pipelines).forEach(pipelineId => {
            active[pipelineId] = savedPipelineSettings.pipelines[pipelineId].active || false;
        });
        return active;
    });
    const [allStagesPipelines, setAllStagesPipelines] = useState<Record<string, boolean>>(() => {
        if (!savedPipelineSettings?.pipelines) return {};
        const allStages: Record<string, boolean> = {};
        Object.keys(savedPipelineSettings.pipelines).forEach(pipelineId => {
            allStages[pipelineId] = savedPipelineSettings.pipelines[pipelineId].allStages || false;
        });
        return allStages;
    });
    const [pipelineStages, setPipelineStages] = useState<Record<string, string[]>>(() => {
        if (!savedPipelineSettings?.pipelines) return {};
        const stages: Record<string, string[]> = {};
        Object.keys(savedPipelineSettings.pipelines).forEach(pipelineId => {
            stages[pipelineId] = savedPipelineSettings.pipelines[pipelineId].stages || [];
        });
        return stages;
    });
    const [stageInstructionsOpen, setStageInstructionsOpen] = useState<Record<string, boolean>>({});
    const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

    // Initialize stage instructions from saved settings
    // Structure: { pipelineId: { stageId: "instructions" } }
    const [stageInstructions, setStageInstructions] = useState<Record<string, Record<string, string>>>(() => {
        if (!savedPipelineSettings?.pipelines) return {};
        const instructions: Record<string, Record<string, string>> = {};
        Object.keys(savedPipelineSettings.pipelines).forEach(pipelineId => {
            const pipeline = savedPipelineSettings.pipelines[pipelineId];
            if (pipeline.stageInstructions) {
                instructions[pipelineId] = pipeline.stageInstructions;
            } else {
                instructions[pipelineId] = {};
            }
        });
        return instructions;
    });

    // Channels
    const [channelsAll, setChannelsAll] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    // Knowledge Base
    const [kbAllCategories, setKbAllCategories] = useState(false);
    const [selectedKbCategories, setSelectedKbCategories] = useState<string[]>([]);
    const [kbCreateTask, setKbCreateTask] = useState(false);
    const [kbNoAnswerMessage, setKbNoAnswerMessage] = useState('Ответ на этот вопрос предоставит ваш персональный immigration advisor, когда свяжется с вами напрямую.');

    // Dropdown state
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Expose getData method via ref
    useImperativeHandle(ref, () => ({
        getData: () => ({
            name,
            isActive,
            systemInstructions,
            checkBeforeSend,
            pipelineSettings: JSON.stringify({
                pipelines: availablePipelines.reduce((acc, pipeline) => {
                    acc[pipeline.id] = {
                        name: pipeline.name,
                        active: activePipelines[pipeline.id] || false,
                        allStages: allStagesPipelines[pipeline.id] || false,
                        stages: pipelineStages[pipeline.id] || [],
                        stageInstructions: stageInstructions[pipeline.id] || {}
                    };
                    return acc;
                }, {} as Record<string, any>)
            }),
            channelSettings: JSON.stringify({
                allChannels: channelsAll,
                selected: selectedChannels
            }),
            kbSettings: JSON.stringify({
                allCategories: kbAllCategories,
                selectedCategories: selectedKbCategories,
                createTaskIfNotFound: kbCreateTask,
                noAnswerMessage: kbNoAnswerMessage
            })
        })
    }));

    // --- Handlers ---
    const handleSyncCRM = async () => {
        setIsSyncing(true);
        try {
            await onSyncCRM();
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Helpers ---
    const togglePipelineExpand = (id: string) => {
        setExpandedPipelines(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const togglePipelineActive = (id: string) => {
        setActivePipelines(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleAllStages = (id: string) => {
        setAllStagesPipelines(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleStageSelection = (pipelineId: string, stageId: string) => {
        setPipelineStages(prev => {
            const current = prev[pipelineId] || [];
            if (current.includes(stageId)) {
                return { ...prev, [pipelineId]: current.filter(s => s !== stageId) };
            } else {
                return { ...prev, [pipelineId]: [...current, stageId] };
            }
        });
    };

    const toggleStageInstructions = (pipelineId: string) => {
        setStageInstructionsOpen(prev => ({ ...prev, [pipelineId]: !prev[pipelineId] }));
    };

    const toggleStageExpand = (stageKey: string) => {
        setExpandedStages(prev => ({ ...prev, [stageKey]: !prev[stageKey] }));
    };

    const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${checked ? 'translate-x-4 scale-110' : 'translate-x-0 scale-100'}`} />
        </button>
    );

    const MultiSelect = ({
        options,
        selectedIds,
        onChange,
        placeholder,
        dropdownId
    }: {
        options: { id: string, name: string }[],
        selectedIds: string[],
        onChange: (ids: string[]) => void,
        placeholder: string,
        dropdownId: string
    }) => {
        const dropdownRef = useRef<HTMLDivElement>(null);
        const isOpen = openDropdowns[dropdownId] || false;

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setOpenDropdowns(prev => ({ ...prev, [dropdownId]: false }));
                }
            };

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
                return () => document.removeEventListener('mousedown', handleClickOutside);
            }
        }, [isOpen, dropdownId]);

        return (
            <div className="relative" ref={dropdownRef}>
                <div
                    onClick={() => setOpenDropdowns(prev => ({ ...prev, [dropdownId]: !prev[dropdownId] }))}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                    <span className="truncate">
                        {selectedIds.length > 0
                            ? selectedIds.map(id => options.find(o => o.id === id)?.name).join(', ')
                            : placeholder}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                        {options.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => {
                                    if (selectedIds.includes(opt.id)) onChange(selectedIds.filter(id => id !== opt.id));
                                    else onChange([...selectedIds, opt.id]);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white flex items-center justify-between"
                            >
                                <span>{opt.name}</span>
                                {selectedIds.includes(opt.id) && <CheckCircle size={14} className="text-blue-600" />}
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-400 text-center">Нет доступных каналов</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 mt-6">

            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <User size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">Профиль агента</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Название<span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Toggle checked={isActive} onChange={setIsActive} />
                        <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Инструкции для агента<span className="text-red-500">*</span></label>
                        <textarea
                            value={systemInstructions}
                            onChange={(e) => setSystemInstructions(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[320px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono leading-relaxed resize-y"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Начальные инструкции по тону, стилю и ответам вашего агента. Вы также можете добавить общие сведения о компании, чтобы помочь агенту отвечать более точно.
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactions Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <MessageSquare size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">Взаимодействия</h2>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <Toggle checked={checkBeforeSend} onChange={setCheckBeforeSend} />
                        <span className="text-sm text-gray-900 dark:text-white">Проверять перед отправкой</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Сообщения не будут отправляться автоматически. Они появятся в поле ввода сообщения для вашего просмотра и ручной отправки.
                    </p>
                </div>
            </div>

            {/* Pipelines Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Briefcase size={20} className="text-gray-400" />
                        <h2 className="text-base font-medium text-gray-900 dark:text-white">Настройки воронок</h2>
                    </div>
                    <button
                        onClick={handleSyncCRM}
                        disabled={isSyncing}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={`w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent ${isSyncing ? 'animate-spin' : 'hidden'}`}></span>
                        {isSyncing ? 'Синхронизация...' : 'Синхронизировать настройки CRM'}
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Выберите воронки и этапы сделок, в которых этот агент должен работать</p>

                    <div className="space-y-4">
                        {availablePipelines.map(pipeline => (
                            <div key={pipeline.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div
                                    className="bg-gray-50 dark:bg-gray-750 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => togglePipelineExpand(pipeline.id)}
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white uppercase">{pipeline.name}</span>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedPipelines[pipeline.id] ? 'rotate-180' : ''}`} />
                                </div>

                                {expandedPipelines[pipeline.id] && (
                                    <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                                        {/* Активно Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Toggle checked={activePipelines[pipeline.id] || false} onChange={() => togglePipelineActive(pipeline.id)} />
                                                <span className="text-sm text-gray-900 dark:text-white">Активно</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Toggle checked={allStagesPipelines[pipeline.id] || false} onChange={() => toggleAllStages(pipeline.id)} />
                                                <span className="text-sm text-gray-900 dark:text-white">Все этапы воронок</span>
                                            </div>
                                        </div>

                                        {/* Выбор этапов */}
                                        {!allStagesPipelines[pipeline.id] && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Выберите этапы сделок<span className="text-red-500">*</span></label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {(pipelineStages[pipeline.id] || []).map(stageId => {
                                                        const stage = pipeline.stages.find(s => s.id === stageId);
                                                        return (
                                                            <div key={stageId} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md text-xs border border-blue-100 dark:border-blue-800">
                                                                <span>{stage?.name || stageId}</span>
                                                                <button onClick={() => toggleStageSelection(pipeline.id, stageId)} className="hover:text-blue-900 dark:hover:text-blue-100">
                                                                    <XCircle size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <MultiSelect
                                                    options={pipeline.stages}
                                                    selectedIds={pipelineStages[pipeline.id] || []}
                                                    onChange={(ids) => setPipelineStages(prev => ({ ...prev, [pipeline.id]: ids }))}
                                                    placeholder="Выбрать этапы"
                                                    dropdownId={`pipeline-stages-${pipeline.id}`}
                                                />
                                            </div>
                                        )}

                                        {/* Инструкции для этапа сделки */}
                                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => toggleStageInstructions(pipeline.id)}
                                            >
                                                <div>
                                                    <span className="text-xs font-medium text-gray-900 dark:text-white">Инструкции для этапа сделки</span>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Настройте, как агент отвечает на каждом этапе сделки</p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${stageInstructionsOpen[pipeline.id] ? 'rotate-180' : ''}`} />
                                            </div>
                                            {stageInstructionsOpen[pipeline.id] && (
                                                <div className="mt-4 space-y-3">
                                                    {pipeline.stages.map(stage => {
                                                        const stageKey = `${pipeline.id}_${stage.id}`;
                                                        return (
                                                            <div key={stage.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                                                <div
                                                                    className="bg-gray-50 dark:bg-gray-750 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                    onClick={() => toggleStageExpand(stageKey)}
                                                                >
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</span>
                                                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedStages[stageKey] ? 'rotate-180' : ''}`} />
                                                                </div>
                                                                {expandedStages[stageKey] && (
                                                                    <div className="p-4 bg-white dark:bg-gray-800">
                                                                        <textarea
                                                                            value={stageInstructions[pipeline.id]?.[stage.id] || ''}
                                                                            onChange={(e) => setStageInstructions(prev => ({
                                                                                ...prev,
                                                                                [pipeline.id]: {
                                                                                    ...prev[pipeline.id],
                                                                                    [stage.id]: e.target.value
                                                                                }
                                                                            }))}
                                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                                            placeholder="Пример: для сделок на этом этапе сосредоточтесь на понимании их требований по бюджету и срокам"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Channels Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Share2 size={20} className="text-gray-400" />
                        <h2 className="text-base font-medium text-gray-900 dark:text-white">Каналы</h2>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors">
                        Синхронизировать настройки CRM
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Выберите каналы, в которых агент может отвечать</p>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Toggle checked={channelsAll} onChange={setChannelsAll} />
                            <span className="text-sm text-gray-900 dark:text-white">Все каналы</span>
                        </div>

                        {!channelsAll && (
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Выбрать каналы<span className="text-red-500">*</span></label>
                                <MultiSelect
                                    options={availableChannels}
                                    selectedIds={selectedChannels}
                                    onChange={setSelectedChannels}
                                    placeholder="Выбрать каналы"
                                    dropdownId="channels"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Knowledge Base Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Book size={20} className="text-gray-400" />
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">База знаний</h2>
                </div>
                <div className="p-6 space-y-6">

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Toggle checked={kbAllCategories} onChange={setKbAllCategories} />
                            <span className="text-sm text-gray-900 dark:text-white">Разрешить доступ ко всем категориям</span>
                        </div>

                        {!kbAllCategories && (
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Выберите категории</label>
                                <MultiSelect
                                    options={kbCategories}
                                    selectedIds={selectedKbCategories}
                                    onChange={setSelectedKbCategories}
                                    placeholder="Выбрать категории"
                                    dropdownId="kb-categories"
                                />
                                <p className="text-xs text-gray-400 mt-2">Агент будет получать доступ к знаниям только из этих категорий.</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700" />

                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Toggle checked={kbCreateTask} onChange={setKbCreateTask} />
                            <span className="text-sm text-gray-900 dark:text-white">Создать задачу, если ответ не найден</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Автоматически создавать задачу в вашей CRM, если в базе знаний не найдена релевантная информация.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">Сообщение при отсутствии ответа</label>
                        <textarea
                            value={kbNoAnswerMessage}
                            onChange={(e) => setKbNoAnswerMessage(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[60px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-2">Это сообщение будет показано, когда агент не сможет найти релевантную информацию в базе знаний.</p>
                    </div>

                    <button
                        onClick={onNavigateToKbArticles}
                        className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Book size={14} />
                        Открыть базу знаний
                    </button>

                </div>
            </div>
        </div>
    );
});
