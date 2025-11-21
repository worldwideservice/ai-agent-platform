import React, { useState } from 'react';
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
import { MOCK_CRM_FIELDS } from '../services/crmData';

interface UpdateRule {
    id: string;
    fieldId: string;
    condition: string;
    overwrite: boolean;
}

interface AgentDealsContactsProps {
    onCancel: () => void;
    crmConnected: boolean;
}

export const AgentDealsContacts: React.FC<AgentDealsContactsProps> = ({ onCancel, crmConnected }) => {
    // --- State ---
    // Data Access
    const [readDealFields, setReadDealFields] = useState<string[]>(['stage_id']);
    const [readContactFields, setReadContactFields] = useState<string[]>(['f_name']);
    const [isDealAccessOpen, setIsDealAccessOpen] = useState(true);
    const [isContactAccessOpen, setIsContactAccessOpen] = useState(true);

    // Data Input
    const [dealUpdateRules, setDealUpdateRules] = useState<UpdateRule[]>([
        { id: '1', fieldId: '', condition: '', overwrite: false }
    ]);
    const [contactUpdateRules, setContactUpdateRules] = useState<UpdateRule[]>([
        { id: '1', fieldId: '', condition: '', overwrite: true }
    ]);
    const [isDealRulesOpen, setIsDealRulesOpen] = useState(true);
    const [isContactRulesOpen, setIsContactRulesOpen] = useState(true);

    // --- Helpers ---
    const toggleSelection = (id: string, currentList: string[], setter: (l: string[]) => void) => {
        if (currentList.includes(id)) setter(currentList.filter(item => item !== id));
        else setter([...currentList, id]);
    };

    const getFieldName = (fieldId: string) => {
        return MOCK_CRM_FIELDS.find(f => f.id === fieldId)?.label || fieldId;
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

    // --- Components ---
    const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
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
        availableFields
    }: {
        label: string,
        selectedIds: string[],
        onChange: (id: string) => void,
        placeholder: string,
        availableFields: typeof MOCK_CRM_FIELDS
    }) => (
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

            {/* Dropdown Trigger (Mock) */}
            <div className="relative group">
                <div className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors">
                    <span>{placeholder}</span>
                    <ChevronDown size={16} />
                </div>

                {/* Dropdown Menu (Hidden by default, shown on hover for demo) */}
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg hidden group-hover:block max-h-48 overflow-y-auto">
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
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Выберите поля, к которым агент сможет получить доступ.
            </p>
        </div>
    );

    const availableCrmFields = crmConnected ? MOCK_CRM_FIELDS : [];

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
                    <button className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors">
                        <RefreshCw size={12} />
                        Синхронизировать настройки CRM
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
                                    availableFields={availableCrmFields}
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
                                    availableFields={availableCrmFields}
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
                                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowUp size={14} /></button>
                                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowDown size={14} /></button>
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
                                                            {availableCrmFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
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
                                    className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors font-medium"
                                >
                                    Добавить поле
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
                                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowUp size={14} /></button>
                                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowDown size={14} /></button>
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
                                                            {availableCrmFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
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
                                    className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors font-medium"
                                >
                                    Добавить поле
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
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
    );
};
