import { CrmPipeline, CrmField } from '../types';

// Simulating data fetched from a connected CRM (e.g., HubSpot, AmoCRM, Bitrix24)
export const MOCK_PIPELINES: CrmPipeline[] = [
  {
    id: 'sales_funnel_1',
    name: 'GENERATION LEAD',
    stages: [
      { id: 'new_lead', name: 'Сделка не распределена' },
      { id: 'qualification', name: 'Сделка распределена' },
      { id: 'social_media', name: 'Social media' },
      { id: 'presentation', name: 'Презентация' },
      { id: 'contract', name: 'Договор' },
    ]
  },
  {
    id: 'work_visa_poland',
    name: 'WORK VISA IN POLAND',
    stages: [
      { id: 'docs_collection', name: 'Сбор документов' },
      { id: 'submission', name: 'Подача' },
      { id: 'visa_received', name: 'Виза получена' },
    ]
  },
  {
    id: 'seasonal_visa',
    name: 'SEASONAL VISA IN POLAND',
    stages: [
      { id: 'stage_1', name: 'Этап 1' },
      { id: 'stage_2', name: 'Этап 2' },
    ]
  },
  {
    id: 'study_georgia',
    name: 'STUDY VISA IN GEORGIA',
    stages: [
      { id: 'consultation', name: 'Консультация' },
      { id: 'enrollment', name: 'Зачисление' }
    ]
  },
  {
    id: 'agent_partners',
    name: 'AGENT PARTNERSHIP',
    stages: []
  },
  {
    id: 'product_vendors',
    name: 'PRODUCT VENDORS (PARTNERSHIP)',
    stages: []
  }
];

export const MOCK_CRM_FIELDS: CrmField[] = [
  { id: 'stage_id', key: 'deal_stage', label: 'Этап сделки', type: 'text' },
  { id: 'f_name', key: 'contact_name', label: 'Имя Контакта', type: 'text' },
  { id: 'f_phone', key: 'phone_number', label: 'Телефон', type: 'text' },
  { id: 'f_email', key: 'email', label: 'Email', type: 'text' },
  { id: 'f_company', key: 'company_name', label: 'Название Компании', type: 'text' },
  { id: 'f_budget', key: 'deal_budget', label: 'Бюджет Сделки', type: 'number' },
  { id: 'f_source', key: 'lead_source', label: 'Источник Лида', type: 'text' },
];

export const CRM_ACTIONS = [
  { id: 'move_stage', label: 'Сменить этап сделки' },
  { id: 'add_tag', label: 'Добавить тег' },
  { id: 'create_task', label: 'Создать задачу' },
  { id: 'update_field', label: 'Обновить поле' },
];

export const MOCK_CHANNELS = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook Messenger' },
  { id: 'email', name: 'Email' },
  { id: 'viber', name: 'Viber' },
];

export const MOCK_KB_CATEGORIES = [
  { id: 'general', name: 'Общее' },
  { id: 'visas', name: 'Визы' },
  { id: 'immigration', name: 'Иммиграция' },
  { id: 'prices', name: 'Цены и Услуги' },
  { id: 'faq', name: 'FAQ' },
];