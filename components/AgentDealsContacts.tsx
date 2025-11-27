import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import {
    Eye,
    Edit,
    ChevronDown,
    X,
    RefreshCw,
    Briefcase,
    User,
    Trash2,
    Plus,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { DEAL_FIELDS, CONTACT_FIELDS } from '../services/crmData';
import { Agent } from '../types';

interface UpdateRule {
    id: string;
    fieldId: string;
    condition: string;
    overwrite: boolean;
}

interface AgentDealsContactsProps {
    agent?: Agent | null;
    onCancel: () => void;
    onSave?: () => void;
    crmConnected: boolean;
    onSyncCRM: () => Promise<void>;
}

export interface AgentDealsContactsRef {
    getData: () => any;
}

export const AgentDealsContacts = forwardRef<AgentDealsContactsRef, AgentDealsContactsProps>(({ agent, onCancel, onSave, crmConnected, onSyncCRM }, ref) => {
    // Parse CRM data from agent (handles double-encoded JSON)
    const parseCrmData = () => {
        if (!agent?.crmData) return null;
        try {
            // crmData может быть уже объектом (после парсинга на backend) или строкой
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
    const availableDealFields = crmData?.dealFields || DEAL_FIELDS;
    const availableContactFields = crmData?.contactFields || CONTACT_FIELDS;

    // --- State ---
    // Data Access - Инициализируем из сохраненных данных или пустыми массивами
    const [readDealFields, setReadDealFields] = useState<string[]>(
        crmData?.dealReadFields || []
    );
    const [readContactFields, setReadContactFields] = useState<string[]>(
        crmData?.contactReadFields || []
    );
    const [isDealAccessOpen, setIsDealAccessOpen] = useState(true);
    const [isContactAccessOpen, setIsContactAccessOpen] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Data Input - Инициализируем из сохраненных данных или дефолтными значениями
    const [dealUpdateRules, setDealUpdateRules] = useState<UpdateRule[]>(
        crmData?.dealUpdateRules || [{ id: '1', fieldId: '', condition: '', overwrite: false }]
    );
    const [contactUpdateRules, setContactUpdateRules] = useState<UpdateRule[]>(
        crmData?.contactUpdateRules || [{ id: '1', fieldId: '', condition: '', overwrite: true }]
    );
    const [isDealRulesOpen, setIsDealRulesOpen] = useState(true);
    const [isContactRulesOpen, setIsContactRulesOpen] = useState(true);

    // Dropdown state
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Загружаем данные из агента при изменении агента
    React.useEffect(() => {
        const data = parseCrmData();
        if (data) {
            if (data.dealReadFields) setReadDealFields(data.dealReadFields);
            if (data.contactReadFields) setReadContactFields(data.contactReadFields);
            if (data.dealUpdateRules) setDealUpdateRules(data.dealUpdateRules);
            if (data.contactUpdateRules) setContactUpdateRules(data.contactUpdateRules);
        }
    }, [agent?.id]);

    // Expose getData method via ref
    useImperativeHandle(ref, () => ({
        getData: () => ({
            dealReadFields: readDealFields,
            contactReadFields: readContactFields,
            dealUpdateRules,
            contactUpdateRules
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
    const toggleSelection = (id: string, currentList: string[], setter: (l: string[]) => void) => {
        if (currentList.includes(id)) setter(currentList.filter(item => item !== id));
        else setter([...currentList, id]);
    };

    const getFieldName = (fieldId: string) => {
        // Сначала ищем в реальных данных CRM (включая кастомные поля)
        const crmDealField = availableDealFields.find((f: any) => f.id === fieldId);
        if (crmDealField?.label) return crmDealField.label;

        const crmContactField = availableContactFields.find((f: any) => f.id === fieldId);
        if (crmContactField?.label) return crmContactField.label;

        // Fallback на захардкоженные поля
        const dealField = DEAL_FIELDS.find(f => f.id === fieldId);
        const contactField = CONTACT_FIELDS.find(f => f.id === fieldId);
        return dealField?.label || contactField?.label || fieldId;
    };

    // Dynamic List Helpers
    const addRule = (setter: React.Dispatch<React.SetStateAction<UpdateRule[]>>) => {
        setter(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), fieldId: '', condition: '', overwrite: false }]);
    };

    const removeRule = (id: string, setter: React.Dispatch<React.SetStateAction<UpdateRule[]>>) => {
        setter(prev => prev.filter(r => r.id !== id));
    };

    const updateRule = (id: string, field: keyof UpdateRule, value: any, setter: React.Dispatch<React.SetStateAction<UpdateRule[]>>) => {
        setter(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const moveRuleUp = (index: number, setter: React.Dispatch<React.SetStateAction<UpdateRule[]>>) => {
        if (index === 0) return;
        setter(prev => {
            const newRules = [...prev];
            [newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]];
            return newRules;
        });
    };

    const moveRuleDown = (index: number, setter: React.Dispatch<React.SetStateAction<UpdateRule[]>>, rules: UpdateRule[]) => {
        if (index >= rules.length - 1) return;
        setter(prev => {
            const newRules = [...prev];
            [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
            return newRules;
        });
    };

    // --- Components ---
    const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-out ${checked ? 'translate-x-4 scale-110' : 'translate-x-0 scale-100'}`} />
        </button>
    );

    const SectionHeader = ({ icon: Icon, title, isOpen, onToggle }: { icon: any, title: string, isOpen: boolean, onToggle: (v: boolean) => void }) => (
        <div
            className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => onToggle(!isOpen)}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-900 dark:text-white">{title}</h2>
            </div>
            <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
    );

    const MultiSelect = ({
        label,
        selectedIds,
        onChange,
        placeholder,
        availableFields,
        dropdownId
    }: {
        label: string,
        selectedIds: string[],
        onChange: (id: string) => void,
        placeholder: string,
        availableFields: typeof DEAL_FIELDS | typeof CONTACT_FIELDS,
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
            <div className="bg-gray-50 dark:bg-gray-750/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">{label}</label>

                {/* Selected Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedIds.map(id => (
                        <div key={id} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md text-sm border border-blue-100 dark:border-blue-800">
                            <span>{getFieldName(id)}</span>
                            <button onClick={() => onChange(id)} className="hover:text-blue-900 dark:hover:text-blue-100">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        onClick={() => setOpenDropdowns(prev => ({ ...prev, [dropdownId]: !prev[dropdownId] }))}
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors"
                    >
                        <span>{placeholder}</span>
                        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                            {availableFields.filter(f => !selectedIds.includes(f.id)).map(field => (
                                <div
                                    key={field.id}
                                    onClick={() => onChange(field.id)}
                                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                                >
                                    {field.label}
                                </div>
                            ))}
                            {availableFields.filter(f => !selectedIds.includes(f.id)).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-400 text-center">Нет доступных полей</div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Выберите поля, к которым агент сможет получить доступ.
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-6 mt-6">

            {/* Data Access Settings */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Eye size={20} className="text-gray-400" />
                        <div>
                            <h2 className="text-base font-medium text-gray-900 dark:text-white">Настройки доступа к данным</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Выберите, какие данные агент может читать и использовать в диалогах</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSyncCRM}
                        disabled={isSyncing}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Синхронизация...' : 'Синхронизировать настройки CRM'}
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Deal Data */}
                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setIsDealAccessOpen(!isDealAccessOpen)}
                        >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                <Briefcase size={16} className="text-gray-400" />
                                Данные сделки
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDealAccessOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDealAccessOpen && (
                            <div className="pl-6">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Выберите поля сделки, которые агент может читать</p>
                                <MultiSelect
                                    label="Выберите поля сделки"
                                    selectedIds={readDealFields}
                                    onChange={(id) => toggleSelection(id, readDealFields, setReadDealFields)}
                                    placeholder="Выберите поля, к которым агент сможет получить доступ..."
                                    availableFields={availableDealFields}
                                    dropdownId="deal-fields"
                                />
                                <p className="text-xs text-gray-400 mt-2">Выбирайте только необходимые поля. Дополнительные поля добавляют лишний контекст и могут снизить точность ответов</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700" />

                    {/* Contact Data */}
                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setIsContactAccessOpen(!isContactAccessOpen)}
                        >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                <User size={16} className="text-gray-400" />
                                Данные контакта
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isContactAccessOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isContactAccessOpen && (
                            <div className="pl-6">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Выберите, какие поля контакта агент сможет читать</p>
                                <MultiSelect
                                    label="Выберите поля контакта"
                                    selectedIds={readContactFields}
                                    onChange={(id) => toggleSelection(id, readContactFields, setReadContactFields)}
                                    placeholder="Выберите поля, к которым агент сможет получить доступ..."
                                    availableFields={availableContactFields}
                                    dropdownId="contact-fields"
                                />
                                <p className="text-xs text-gray-400 mt-2">Выбирайте только необходимые поля. Большее количество полей добавляет дополнительный контекст и может снизить точность ответов.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Input Settings */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <Edit size={20} className="text-gray-400" />
                    <div>
                        <h2 className="text-base font-medium text-gray-900 dark:text-white">Настройки ввода данных</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Настройте, как агент может изменять данные сделок и контактов в зависимости от контекста разговора</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Deal Update Rules */}
                    <div>
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setIsDealRulesOpen(!isDealRulesOpen)}
                        >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                <Briefcase size={16} className="text-gray-400" />
                                Данные сделки
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDealRulesOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDealRulesOpen && (
                            <div className="pl-6 space-y-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Задайте правила автоматического обновления полей сделки во время разговора</p>

                                <div className="space-y-3">
                                    {dealUpdateRules.map((rule, index) => (
                                        <div key={rule.id} className="bg-gray-50 dark:bg-gray-750/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 relative group">
                                            {/* Header Row */}
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => moveRuleUp(index, setDealUpdateRules)}
                                                        disabled={index === 0}
                                                        className={`${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveRuleDown(index, setDealUpdateRules, dealUpdateRules)}
                                                        disabled={index >= dealUpdateRules.length - 1}
                                                        className={`${index >= dealUpdateRules.length - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeRule(rule.id, setDealUpdateRules)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Поле<span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <select
                                                            value={rule.fieldId}
                                                            onChange={(e) => updateRule(rule.id, 'fieldId', e.target.value, setDealUpdateRules)}
                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="">Выберите поле для обновления</option>
                                                            {availableDealFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Условие обновления<span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={rule.condition}
                                                        onChange={(e) => updateRule(rule.id, 'condition', e.target.value, setDealUpdateRules)}
                                                        placeholder="Например: когда клиент упоминает цену"
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-3">
                                                <Toggle checked={rule.overwrite} onChange={(val) => updateRule(rule.id, 'overwrite', val, setDealUpdateRules)} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Перезаписать существующее значение</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => addRule(setDealUpdateRules)}
                                    className="group w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all font-medium flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                    <span>Добавить поле</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700" />

                    {/* Contact Update Rules */}
                    <div>
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setIsContactRulesOpen(!isContactRulesOpen)}
                        >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                                <User size={16} className="text-gray-400" />
                                Данные контакта
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isContactRulesOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isContactRulesOpen && (
                            <div className="pl-6 space-y-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Определите правила автоматического обновления полей контакта во время разговора</p>

                                <div className="space-y-3">
                                    {contactUpdateRules.map((rule, index) => (
                                        <div key={rule.id} className="bg-gray-50 dark:bg-gray-750/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 relative group">
                                            {/* Header Row */}
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => moveRuleUp(index, setContactUpdateRules)}
                                                        disabled={index === 0}
                                                        className={`${index === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveRuleDown(index, setContactUpdateRules, contactUpdateRules)}
                                                        disabled={index >= contactUpdateRules.length - 1}
                                                        className={`${index >= contactUpdateRules.length - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeRule(rule.id, setContactUpdateRules)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Поле<span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <select
                                                            value={rule.fieldId}
                                                            onChange={(e) => updateRule(rule.id, 'fieldId', e.target.value, setContactUpdateRules)}
                                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="">Выберите поле для обновления</option>
                                                            {availableContactFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Условие обновления<span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={rule.condition}
                                                        onChange={(e) => updateRule(rule.id, 'condition', e.target.value, setContactUpdateRules)}
                                                        placeholder="Например: когда клиент называет своё имя"
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-3">
                                                <Toggle checked={rule.overwrite} onChange={(val) => updateRule(rule.id, 'overwrite', val, setContactUpdateRules)} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Перезаписать существующее значение</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => addRule(setContactUpdateRules)}
                                    className="group w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all font-medium flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                    <span>Добавить поле</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-4 pt-4">
                <button
                    onClick={() => {
                        console.log('Save button clicked!');
                        console.log('onSave function:', onSave);
                        if (onSave) {
                            onSave();
                        } else {
                            console.error('onSave is not defined!');
                        }
                    }}
                    className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
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
    );
});
