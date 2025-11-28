import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    Briefcase,
    Paperclip,
    FileText,
    Plus,
    X,
    Users,
    Headphones,
    MessageCircle,
    Target,
    Star,
    Award,
    TrendingUp,
    Zap,
    RefreshCw,
    Upload,
    Trash2,
    File,
    Image as ImageIcon,
    FileSpreadsheet,
    Loader2,
    Undo2
} from 'lucide-react';
import { MOCK_PIPELINES, MOCK_CHANNELS, MOCK_KB_CATEGORIES } from '../services/crmData';
import { Agent, TrainingRole } from '../types';
import * as trainingService from '../src/services/api/training.service';
import * as agentDocumentsService from '../src/services/api/agent-documents.service';
import type { AgentDocument } from '../src/services/api/agent-documents.service';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { RestrictedSection } from './PlanRestriction';

// Icon mapping for roles
const roleIconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
    'briefcase': Briefcase,
    'headphones': Headphones,
    'message-circle': MessageCircle,
    'user': User,
    'users': Users,
    'target': Target,
    'star': Star,
    'award': Award,
    'trending-up': TrendingUp,
    'zap': Zap
};

// Структура для прикреплённых статей/файлов к этапу
interface StageAttachment {
    id: number;
    title: string;
    type: 'article';
}

// Расширенная структура инструкций этапа
interface StageInstructionData {
    text: string;
    attachments?: StageAttachment[];
}

// Статья KB для выбора
interface KbArticleOption {
    id: number;
    title: string;
    isActive: boolean;
}

interface AgentBasicSettingsProps {
    agent?: Agent | null;
    onCancel: () => void;
    crmConnected: boolean;
    kbCategories: { id: string; name: string }[];
    kbArticles?: KbArticleOption[]; // Статьи KB для выбора
    onNavigateToKbArticles: () => void;
    onSyncCRM: () => Promise<void>;
}

export interface AgentBasicSettingsRef {
    getData: () => Partial<Agent>;
    hasPendingDocumentChanges: () => boolean;
    commitDocumentChanges: (agentId: string) => Promise<void>;
    getPendingDocumentCount: () => { uploads: number; deletes: number };
}

export const AgentBasicSettings = forwardRef<AgentBasicSettingsRef, AgentBasicSettingsProps>(({ agent, onCancel, crmConnected, kbCategories, kbArticles = [], onNavigateToKbArticles, onSyncCRM }, ref) => {
    const { t } = useTranslation();
    const { canUseFeature } = useSubscription();
    const canSendMedia = canUseFeature('canSendMedia');

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

    // Parse channel settings from agent
    const parseChannelSettings = () => {
        if (!agent?.channelSettings) return null;
        if (typeof agent.channelSettings === 'object') {
            return agent.channelSettings;
        }
        try {
            return JSON.parse(agent.channelSettings);
        } catch {
            return null;
        }
    };

    // Parse KB settings from agent
    const parseKbSettings = () => {
        if (!agent?.kbSettings) return null;
        if (typeof agent.kbSettings === 'object') {
            return agent.kbSettings;
        }
        try {
            return JSON.parse(agent.kbSettings);
        } catch {
            return null;
        }
    };

    const crmData = parseCrmData();
    const availablePipelines = crmData?.pipelines || MOCK_PIPELINES;
    const availableChannels = crmData?.channels || MOCK_CHANNELS;
    const savedPipelineSettings = parsePipelineSettings();
    const savedChannelSettings = parseChannelSettings();
    const savedKbSettings = parseKbSettings();

    // --- State ---
    // Profile
    const [name, setName] = useState(agent?.name || 'АИ ассистент');
    const [isActive, setIsActive] = useState(agent?.isActive || false);
    const [systemInstructions, setSystemInstructions] = useState(agent?.systemInstructions || 'Вы — полезный помощник.');
    const [trainingRoleId, setTrainingRoleId] = useState<string | null>(agent?.trainingRoleId || null);

    // Training roles
    const [trainingRoles, setTrainingRoles] = useState<TrainingRole[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef<HTMLDivElement>(null);

    // Load training roles on mount
    useEffect(() => {
        const loadRoles = async () => {
            try {
                const roles = await trainingService.getRoles();
                setTrainingRoles(roles);
            } catch (error) {
                console.error('Failed to load training roles:', error);
            } finally {
                setLoadingRoles(false);
            }
        };
        loadRoles();
    }, []);

    // Close role dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setRoleDropdownOpen(false);
            }
        };
        if (roleDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [roleDropdownOpen]);

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
    // Structure: { pipelineId: { stageId: StageInstructionData } }
    // Supports backward compatibility with string values
    const [stageInstructions, setStageInstructions] = useState<Record<string, Record<string, StageInstructionData>>>(() => {
        if (!savedPipelineSettings?.pipelines) return {};
        const instructions: Record<string, Record<string, StageInstructionData>> = {};
        Object.keys(savedPipelineSettings.pipelines).forEach(pipelineId => {
            const pipeline = savedPipelineSettings.pipelines[pipelineId];
            if (pipeline.stageInstructions) {
                instructions[pipelineId] = {};
                Object.keys(pipeline.stageInstructions).forEach(stageId => {
                    const value = pipeline.stageInstructions[stageId];
                    // Backward compatibility: convert string to StageInstructionData
                    if (typeof value === 'string') {
                        instructions[pipelineId][stageId] = { text: value, attachments: [] };
                    } else {
                        instructions[pipelineId][stageId] = value as StageInstructionData;
                    }
                });
            } else {
                instructions[pipelineId] = {};
            }
        });
        return instructions;
    });

    // State for article selection dropdown per stage
    const [articleDropdownOpen, setArticleDropdownOpen] = useState<Record<string, boolean>>({});

    // Channels - initialize from saved settings
    const [channelsAll, setChannelsAll] = useState(savedChannelSettings?.allChannels || false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(savedChannelSettings?.selected || []);

    // Knowledge Base - initialize from saved settings
    const [kbAllCategories, setKbAllCategories] = useState(savedKbSettings?.allCategories || false);
    const [selectedKbCategories, setSelectedKbCategories] = useState<string[]>(savedKbSettings?.selectedCategories || []);
    const [kbCreateTask, setKbCreateTask] = useState(savedKbSettings?.createTaskIfNotFound || false);
    const [kbNoAnswerMessage, setKbNoAnswerMessage] = useState(
        savedKbSettings?.noAnswerMessage || 'Ответ на этот вопрос предоставит ваш персональный immigration advisor, когда свяжется с вами напрямую.'
    );

    // Agent Documents for sending to clients
    const [agentDocuments, setAgentDocuments] = useState<AgentDocument[]>([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [allowAllDocuments, setAllowAllDocuments] = useState(savedKbSettings?.allowAllDocuments ?? true);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pending document changes (draft mode)
    interface PendingUpload {
        id: string;
        file: File;
        preview?: string;
    }
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
    const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

    // Dropdown state
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Expose getData and document methods via ref
    useImperativeHandle(ref, () => ({
        getData: () => ({
            name,
            isActive,
            systemInstructions,
            trainingRoleId: trainingRoleId || undefined,
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
                noAnswerMessage: kbNoAnswerMessage,
                allowAllDocuments: allowAllDocuments
            })
        }),

        // Check if there are pending document changes
        hasPendingDocumentChanges: () => {
            return pendingUploads.length > 0 || pendingDeletes.size > 0;
        },

        // Get count of pending changes
        getPendingDocumentCount: () => ({
            uploads: pendingUploads.length,
            deletes: pendingDeletes.size
        }),

        // Commit all pending document changes (upload new files, delete marked files)
        commitDocumentChanges: async (agentId: string) => {
            const errors: string[] = [];

            // Upload pending files
            for (const pending of pendingUploads) {
                try {
                    const uploaded = await agentDocumentsService.uploadAgentDocument(agentId, pending.file);
                    setAgentDocuments(prev => [...prev, uploaded]);
                } catch (error) {
                    console.error('Error uploading document:', pending.file.name, error);
                    errors.push(`Ошибка загрузки: ${pending.file.name}`);
                }
            }

            // Delete marked files
            for (const docId of pendingDeletes) {
                try {
                    await agentDocumentsService.deleteAgentDocument(agentId, docId);
                    setAgentDocuments(prev => prev.filter(d => d.id !== docId));
                } catch (error) {
                    console.error('Error deleting document:', docId, error);
                    errors.push(`Ошибка удаления документа`);
                }
            }

            // Clear pending states
            // Clean up object URLs to prevent memory leaks
            pendingUploads.forEach(p => {
                if (p.preview) URL.revokeObjectURL(p.preview);
            });
            setPendingUploads([]);
            setPendingDeletes(new Set());

            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }
        }
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

    // --- Document Handlers ---
    // Load agent documents on mount
    useEffect(() => {
        const loadDocuments = async () => {
            if (!agent?.id) return;
            setDocumentsLoading(true);
            try {
                const docs = await agentDocumentsService.getAgentDocuments(agent.id);
                setAgentDocuments(docs);
            } catch (error) {
                console.error('Error loading documents:', error);
            } finally {
                setDocumentsLoading(false);
            }
        };
        loadDocuments();
    }, [agent?.id]);

    // Add files to pending uploads (draft mode - files uploaded on Save)
    const addFilesToPending = (files: FileList | File[]) => {
        const newPendingUploads: PendingUpload[] = Array.from(files).map(file => ({
            id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        }));
        setPendingUploads(prev => [...prev, ...newPendingUploads]);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        addFilesToPending(files);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Drag and drop handlers
    const dragCounterRef = useRef(0);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        const files = e.dataTransfer.files;

        if (!files || files.length === 0) {
            return;
        }

        addFilesToPending(files);
    };

    // Mark document for deletion (draft mode - deleted on Save)
    const handleDeleteDocument = (documentId: string) => {
        // Check if it's a pending upload - just remove it
        if (documentId.startsWith('pending-')) {
            setPendingUploads(prev => prev.filter(p => p.id !== documentId));
            return;
        }

        // Mark existing document for deletion
        setPendingDeletes(prev => new Set([...prev, documentId]));
    };

    // Undo pending delete
    const handleUndoDelete = (documentId: string) => {
        setPendingDeletes(prev => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
        });
    };

    // Remove pending upload
    const handleRemovePendingUpload = (pendingId: string) => {
        setPendingUploads(prev => prev.filter(p => p.id !== pendingId));
    };

    const handleToggleDocument = async (documentId: string, isEnabled: boolean) => {
        if (!agent?.id) return;
        try {
            const updated = await agentDocumentsService.updateAgentDocument(agent.id, documentId, { isEnabled });
            setAgentDocuments(prev => prev.map(d => d.id === documentId ? updated : d));
        } catch (error) {
            console.error('Error toggling document:', error);
        }
    };

    const getDocumentIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
            return (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow">
                    <ImageIcon size={20} className="text-white" />
                </div>
            );
        }
        if (['xls', 'xlsx', 'csv'].includes(type)) {
            return (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow">
                    <FileSpreadsheet size={20} className="text-white" />
                </div>
            );
        }
        if (['pdf'].includes(type)) {
            return (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow">
                    <FileText size={20} className="text-white" />
                </div>
            );
        }
        if (['doc', 'docx'].includes(type)) {
            return (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow">
                    <FileText size={20} className="text-white" />
                </div>
            );
        }
        return (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow">
                <File size={20} className="text-white" />
            </div>
        );
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
                            <div className="px-3 py-2 text-sm text-gray-400 text-center">{t('agentEditor.basicSettings.noChannels')}</div>
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
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.agentProfile')}</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.nameLabel')}<span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.roleLabel')}</label>
                        <div className="relative" ref={roleDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-blue-500 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {trainingRoleId ? (
                                        <>
                                            {(() => {
                                                const selectedRole = trainingRoles.find(r => r.id === trainingRoleId);
                                                if (selectedRole) {
                                                    const IconComp = roleIconMap[selectedRole.icon] || Briefcase;
                                                    return (
                                                        <>
                                                            <IconComp size={16} className="text-blue-500" />
                                                            <span>{selectedRole.name}</span>
                                                        </>
                                                    );
                                                }
                                                return <span className="text-gray-400">{t('agentEditor.basicSettings.loading')}</span>;
                                            })()}
                                        </>
                                    ) : (
                                        <span className="text-gray-400">{t('agentEditor.basicSettings.noRole')}</span>
                                    )}
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {roleDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                    {/* No role option */}
                                    <div
                                        onClick={() => {
                                            setTrainingRoleId(null);
                                            setRoleDropdownOpen(false);
                                        }}
                                        className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 ${!trainingRoleId ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                    >
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{t('agentEditor.basicSettings.noRole')}</span>
                                        {!trainingRoleId && <CheckCircle size={14} className="text-blue-600 ml-auto" />}
                                    </div>

                                    {loadingRoles ? (
                                        <div className="px-3 py-4 text-center text-sm text-gray-400">
                                            {t('agentEditor.basicSettings.loadingRoles')}
                                        </div>
                                    ) : (
                                        trainingRoles.map(role => {
                                            const IconComp = roleIconMap[role.icon] || Briefcase;
                                            const isSelected = trainingRoleId === role.id;
                                            return (
                                                <div
                                                    key={role.id}
                                                    onClick={() => {
                                                        setTrainingRoleId(role.id);
                                                        setRoleDropdownOpen(false);
                                                    }}
                                                    className={`px-3 py-2.5 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.isBuiltIn ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                            <IconComp size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</div>
                                                            {role.description && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{role.description}</div>
                                                            )}
                                                        </div>
                                                        {isSelected && <CheckCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {t('agentEditor.basicSettings.roleHint')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Toggle checked={isActive} onChange={setIsActive} />
                        <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.active')}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.instructionsLabel')}<span className="text-red-500">*</span></label>
                        <textarea
                            value={systemInstructions}
                            onChange={(e) => setSystemInstructions(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[150px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono leading-relaxed resize-y"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            {t('agentEditor.basicSettings.instructionsHint')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Pipelines Section */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Briefcase size={20} className="text-gray-400" />
                        <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.funnelSettings')}</h2>
                    </div>
                    <button
                        onClick={handleSyncCRM}
                        disabled={isSyncing}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? t('agentEditor.basicSettings.syncing') : t('agentEditor.basicSettings.syncCrmSettings')}
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('agentEditor.basicSettings.funnelHint')}</p>

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
                                                <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.active')}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Toggle checked={allStagesPipelines[pipeline.id] || false} onChange={() => toggleAllStages(pipeline.id)} />
                                                <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.allStages')}</span>
                                            </div>
                                        </div>

                                        {/* Выбор этапов */}
                                        {!allStagesPipelines[pipeline.id] && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.selectDealStages')}<span className="text-red-500">*</span></label>
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
                                                    placeholder={t('agentEditor.basicSettings.selectStages')}
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
                                                    <span className="text-xs font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.stageInstructions')}</span>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('agentEditor.basicSettings.stageInstructionsHint')}</p>
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
                                                                    <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('agentEditor.basicSettings.stageInstruction')}</label>
                                                                            <textarea
                                                                                value={stageInstructions[pipeline.id]?.[stage.id]?.text || ''}
                                                                                onChange={(e) => setStageInstructions(prev => ({
                                                                                    ...prev,
                                                                                    [pipeline.id]: {
                                                                                        ...prev[pipeline.id],
                                                                                        [stage.id]: {
                                                                                            ...prev[pipeline.id]?.[stage.id],
                                                                                            text: e.target.value
                                                                                        }
                                                                                    }
                                                                                }))}
                                                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                                                placeholder={t('agentEditor.basicSettings.stageInstructionPlaceholder')}
                                                                            />
                                                                        </div>

                                                                        {/* Прикреплённые статьи KB */}
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                                                <Paperclip size={12} className="inline mr-1" />
                                                                                {t('agentEditor.basicSettings.filesToSend')}
                                                                            </label>

                                                                            {/* Список прикреплённых статей */}
                                                                            {(stageInstructions[pipeline.id]?.[stage.id]?.attachments?.length || 0) > 0 && (
                                                                                <div className="mb-2 space-y-1.5">
                                                                                    {stageInstructions[pipeline.id]?.[stage.id]?.attachments?.map((attachment) => (
                                                                                        <div key={attachment.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-md px-3 py-2 border border-blue-100 dark:border-blue-800">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                                                                                                <span className="text-sm text-blue-700 dark:text-blue-300">{attachment.title}</span>
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    setStageInstructions(prev => ({
                                                                                                        ...prev,
                                                                                                        [pipeline.id]: {
                                                                                                            ...prev[pipeline.id],
                                                                                                            [stage.id]: {
                                                                                                                ...prev[pipeline.id]?.[stage.id],
                                                                                                                attachments: prev[pipeline.id]?.[stage.id]?.attachments?.filter(a => a.id !== attachment.id) || []
                                                                                                            }
                                                                                                        }
                                                                                                    }));
                                                                                                }}
                                                                                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                            >
                                                                                                <X size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Dropdown для добавления статей */}
                                                                            <div className="relative">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setArticleDropdownOpen(prev => ({ ...prev, [stageKey]: !prev[stageKey] }))}
                                                                                    className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-md transition-colors"
                                                                                >
                                                                                    <Plus size={14} />
                                                                                    {t('agentEditor.basicSettings.addKbArticle')}
                                                                                </button>

                                                                                {articleDropdownOpen[stageKey] && kbArticles.length > 0 && (
                                                                                    <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                                                                        {kbArticles.filter(a => a.isActive).map(article => {
                                                                                            const isAttached = stageInstructions[pipeline.id]?.[stage.id]?.attachments?.some(a => a.id === article.id);
                                                                                            return (
                                                                                                <div
                                                                                                    key={article.id}
                                                                                                    onClick={() => {
                                                                                                        if (!isAttached) {
                                                                                                            setStageInstructions(prev => ({
                                                                                                                ...prev,
                                                                                                                [pipeline.id]: {
                                                                                                                    ...prev[pipeline.id],
                                                                                                                    [stage.id]: {
                                                                                                                        ...prev[pipeline.id]?.[stage.id],
                                                                                                                        text: prev[pipeline.id]?.[stage.id]?.text || '',
                                                                                                                        attachments: [
                                                                                                                            ...(prev[pipeline.id]?.[stage.id]?.attachments || []),
                                                                                                                            { id: article.id, title: article.title, type: 'article' as const }
                                                                                                                        ]
                                                                                                                    }
                                                                                                                }
                                                                                                            }));
                                                                                                        }
                                                                                                        setArticleDropdownOpen(prev => ({ ...prev, [stageKey]: false }));
                                                                                                    }}
                                                                                                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${isAttached ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'}`}
                                                                                                >
                                                                                                    <span className="truncate">{article.title}</span>
                                                                                                    {isAttached && <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                        {kbArticles.filter(a => a.isActive).length === 0 && (
                                                                                            <div className="px-3 py-2 text-sm text-gray-400 text-center">{t('agentEditor.basicSettings.noActiveArticles')}</div>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {kbArticles.length === 0 && (
                                                                                    <p className="mt-1.5 text-xs text-gray-400">{t('agentEditor.basicSettings.createArticlesHint')}</p>
                                                                                )}
                                                                            </div>

                                                                            <p className="mt-2 text-xs text-gray-400">
                                                                                {t('agentEditor.basicSettings.articlesAvailableHint')}
                                                                            </p>
                                                                        </div>
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
                        <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.channelsTitle')}</h2>
                    </div>
                    <button
                        onClick={handleSyncCRM}
                        disabled={isSyncing}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? t('agentEditor.basicSettings.syncing') : t('agentEditor.basicSettings.syncCrmSettings')}
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('agentEditor.basicSettings.channelsHint')}</p>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Toggle checked={channelsAll} onChange={setChannelsAll} />
                            <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.allChannels')}</span>
                        </div>

                        {!channelsAll && (
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">{t('agentEditor.basicSettings.selectChannels')}<span className="text-red-500">*</span></label>
                                <MultiSelect
                                    options={availableChannels}
                                    selectedIds={selectedChannels}
                                    onChange={setSelectedChannels}
                                    placeholder={t('agentEditor.basicSettings.selectChannels')}
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
                    <h2 className="text-base font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.knowledgeBaseTitle')}</h2>
                </div>
                <div className="p-6 space-y-6">

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Toggle checked={kbAllCategories} onChange={setKbAllCategories} />
                            <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.allowAllCategories')}</span>
                        </div>

                        {!kbAllCategories && (
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.selectCategories')}</label>
                                <MultiSelect
                                    options={kbCategories}
                                    selectedIds={selectedKbCategories}
                                    onChange={setSelectedKbCategories}
                                    placeholder={t('agentEditor.basicSettings.selectCategories')}
                                    dropdownId="kb-categories"
                                />
                                <p className="text-xs text-gray-400 mt-2">{t('agentEditor.basicSettings.categoriesHint')}</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700" />

                    {/* Documents for sending to clients */}
                    <RestrictedSection
                        isAllowed={canSendMedia}
                        requiredPlan="launch"
                        featureName={t('planRestriction.sendMediaTitle')}
                    >
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Share2 size={16} className="text-blue-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{t('agentEditor.basicSettings.documentsTitle')}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            {t('agentEditor.basicSettings.documentsHint')}
                        </p>

                        {/* Toggle: Разрешить все документы */}
                        <div className="flex items-center gap-3 mb-4">
                            <Toggle checked={allowAllDocuments} onChange={setAllowAllDocuments} />
                            <span className="text-sm text-gray-900 dark:text-white">
                                {allowAllDocuments ? t('agentEditor.basicSettings.allowAllDocs') : t('agentEditor.basicSettings.selectedDocsOnly')}
                            </span>
                        </div>

                        {/* Upload area with drag-and-drop */}
                        <div className="mb-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp"
                                multiple
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                    isDragging
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02]'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                                }`}
                            >
                                {isDragging ? (
                                    <Upload size={28} className="text-blue-500" />
                                ) : (
                                    <Upload size={28} className="text-gray-400" />
                                )}
                                <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                    {isDragging
                                        ? t('agentEditor.basicSettings.dropFilesHere')
                                        : t('agentEditor.basicSettings.dragOrClick')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {t('agentEditor.basicSettings.fileFormats')}
                                </span>
                            </div>
                        </div>

                        {/* Documents list */}
                        {documentsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="text-blue-500 animate-spin" />
                            </div>
                        ) : (agentDocuments.length > 0 || pendingUploads.length > 0) ? (
                            <div className="space-y-2">
                                {/* Existing documents */}
                                {agentDocuments.map(doc => {
                                    const isDisabled = !allowAllDocuments && !doc.isEnabled;
                                    const isPendingDelete = pendingDeletes.has(doc.id);

                                    return (
                                        <div
                                            key={doc.id}
                                            className={`relative group flex items-center gap-3 p-2 border rounded-lg transition-all ${
                                                isPendingDelete
                                                    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20 opacity-60'
                                                    : isDisabled
                                                        ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-pointer'
                                                        : doc.isEnabled
                                                            ? 'border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/20 cursor-pointer'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                                            }`}
                                            onClick={() => !isPendingDelete && !allowAllDocuments && handleToggleDocument(doc.id, !doc.isEnabled)}
                                        >
                                            {/* Selection checkbox when allowAllDocuments is off */}
                                            {!allowAllDocuments && !isPendingDelete && (
                                                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    doc.isEnabled
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {doc.isEnabled && <CheckCircle size={12} className="text-white" />}
                                                </div>
                                            )}

                                            {/* Icon */}
                                            <div className={`flex-shrink-0 ${isPendingDelete ? 'opacity-50' : ''}`}>
                                                {doc.thumbnailUrl ? (
                                                    <img
                                                        src={agentDocumentsService.getThumbnailFullUrl(doc.thumbnailUrl) || ''}
                                                        alt={doc.fileName}
                                                        className="w-10 h-10 rounded object-cover"
                                                    />
                                                ) : (
                                                    getDocumentIcon(doc.fileType)
                                                )}
                                            </div>

                                            {/* File info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isPendingDelete ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`} title={doc.fileName}>
                                                    {doc.fileName}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {isPendingDelete ? (
                                                        <span className="text-red-500">{t('agentEditor.basicSettings.willBeDeleted')}</span>
                                                    ) : (
                                                        agentDocumentsService.formatFileSize(doc.fileSize)
                                                    )}
                                                </p>
                                            </div>

                                            {/* Undo delete button or Delete button */}
                                            {isPendingDelete ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUndoDelete(doc.id);
                                                    }}
                                                    className="flex-shrink-0 px-2 py-1 bg-gray-100 hover:bg-blue-500 text-gray-600 hover:text-white dark:bg-gray-700 dark:hover:bg-blue-500 rounded-md flex items-center gap-1 text-xs transition-all"
                                                >
                                                    <Undo2 size={12} />
                                                    {t('common.cancel')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDocument(doc.id);
                                                    }}
                                                    className="flex-shrink-0 w-7 h-7 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white dark:bg-gray-700 dark:hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Pending uploads */}
                                {pendingUploads.map(pending => (
                                    <div
                                        key={pending.id}
                                        className="relative group flex items-center gap-3 p-2 border-2 border-dashed border-green-400 dark:border-green-600 bg-green-50/30 dark:bg-green-900/20 rounded-lg transition-all"
                                    >
                                        {/* Icon */}
                                        <div className="flex-shrink-0">
                                            {pending.preview ? (
                                                <img
                                                    src={pending.preview}
                                                    alt={pending.file.name}
                                                    className="w-10 h-10 rounded object-cover"
                                                />
                                            ) : (
                                                getDocumentIcon(pending.file.name.split('.').pop() || '')
                                            )}
                                        </div>

                                        {/* File info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={pending.file.name}>
                                                {pending.file.name}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                {t('agentEditor.basicSettings.willBeUploaded')}
                                            </p>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            onClick={() => handleRemovePendingUpload(pending.id)}
                                            className="flex-shrink-0 w-7 h-7 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white dark:bg-gray-700 dark:hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-sm text-gray-400">
                                {t('agentEditor.basicSettings.noDocuments')}
                            </div>
                        )}

                        {/* Hint */}
                        {agentDocuments.length > 0 && !allowAllDocuments && (
                            <p className="text-xs text-gray-400 mt-3">
                                {t('agentEditor.basicSettings.clickToToggle')}
                            </p>
                        )}

                        {agentDocuments.filter(d => d.isEnabled).length > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                {t('agentEditor.basicSettings.availableToSend', { count: allowAllDocuments ? agentDocuments.length : agentDocuments.filter(d => d.isEnabled).length })}
                            </p>
                        )}
                    </div>
                    </RestrictedSection>

                    <div className="h-px bg-gray-100 dark:bg-gray-700" />

                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Toggle checked={kbCreateTask} onChange={setKbCreateTask} />
                            <span className="text-sm text-gray-900 dark:text-white">{t('agentEditor.basicSettings.createTaskIfNoAnswer')}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('agentEditor.basicSettings.createTaskHint')}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-2">{t('agentEditor.basicSettings.noAnswerMessage')}</label>
                        <textarea
                            value={kbNoAnswerMessage}
                            onChange={(e) => setKbNoAnswerMessage(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm min-h-[60px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-2">{t('agentEditor.basicSettings.noAnswerMessageHint')}</p>
                    </div>

                    <button
                        onClick={onNavigateToKbArticles}
                        className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Book size={14} />
                        {t('agentEditor.basicSettings.openKnowledgeBase')}
                    </button>

                </div>
            </div>
        </div>
    );
});
