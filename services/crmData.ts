import { CrmPipeline, CrmField } from '../types';

// Default pipelines shown before CRM synchronization
export const MOCK_PIPELINES: CrmPipeline[] = [
  {
    id: 'pipeline_1',
    name: 'Воронка 1',
    stages: [
      { id: 'stage_1_1', name: 'Этап 1' },
      { id: 'stage_1_2', name: 'Этап 2' },
      { id: 'stage_1_3', name: 'Этап 3' },
      { id: 'stage_1_4', name: 'Этап 4' },
      { id: 'stage_1_5', name: 'Этап 5' }
    ]
  },
  {
    id: 'pipeline_2',
    name: 'Воронка 2',
    stages: [
      { id: 'stage_2_1', name: 'Этап 1' },
      { id: 'stage_2_2', name: 'Этап 2' },
      { id: 'stage_2_3', name: 'Этап 3' },
      { id: 'stage_2_4', name: 'Этап 4' }
    ]
  },
  {
    id: 'pipeline_3',
    name: 'Воронка 3',
    stages: [
      { id: 'stage_3_1', name: 'Этап 1' },
      { id: 'stage_3_2', name: 'Этап 2' },
      { id: 'stage_3_3', name: 'Этап 3' }
    ]
  },
  {
    id: 'pipeline_4',
    name: 'Воронка 4',
    stages: [
      { id: 'stage_4_1', name: 'Этап 1' },
      { id: 'stage_4_2', name: 'Этап 2' },
      { id: 'stage_4_3', name: 'Этап 3' },
      { id: 'stage_4_4', name: 'Этап 4' },
      { id: 'stage_4_5', name: 'Этап 5' },
      { id: 'stage_4_6', name: 'Этап 6' }
    ]
  }
];

// Поля сделки (Deal Fields)
export const DEAL_FIELDS: CrmField[] = [
  { id: 'deal_stage', key: 'stage_id', label: 'Этап сделки', type: 'select' },
  { id: 'deal_name', key: 'name', label: 'Название сделки', type: 'text' },
  { id: 'deal_budget', key: 'price', label: 'Бюджет', type: 'number' },
  { id: 'deal_responsible', key: 'responsible_user_id', label: 'Ответственный пользователь', type: 'select' },
  { id: 'deal_created', key: 'created_at', label: 'Дата создания', type: 'date' },
  { id: 'deal_tags', key: 'tags', label: 'Теги', type: 'tags' },
  { id: 'deal_fact', key: 'fact_amount', label: 'Факт (сумма)', type: 'number' },
  { id: 'deal_balance', key: 'remaining_balance', label: 'Remaining Balance', type: 'number' },
  { id: 'deal_service_type', key: 'service_type', label: 'Service Type', type: 'select' },
  { id: 'deal_package_type', key: 'service_package_type', label: 'Service Package Type', type: 'select' },
  { id: 'deal_desired_position', key: 'desired_position', label: 'Desired Position / Job', type: 'text' },
  { id: 'deal_actual_position', key: 'actual_position', label: 'Actual Position / Assigned Job', type: 'text' },
  { id: 'deal_passport_valid', key: 'passport_valid', label: 'Passport Valid', type: 'boolean' },
  { id: 'deal_payment_method', key: 'payment_method', label: 'Payment Method', type: 'select' },
  { id: 'deal_vendor', key: 'vendor', label: 'Vendor', type: 'select' },
  { id: 'deal_contract_signed', key: 'contract_signed', label: 'Contract Signed', type: 'boolean' },
  { id: 'deal_application_submitted', key: 'application_submitted', label: 'Application Submitted', type: 'boolean' },
  { id: 'deal_google_drive', key: 'google_drive', label: 'Google drive', type: 'url' },
  { id: 'deal_product', key: 'product', label: 'Product', type: 'select' },
  { id: 'deal_docs', key: 'n_docs', label: 'n_docs', type: 'number' },
];

// Поля контакта (Contact Fields)
export const CONTACT_FIELDS: CrmField[] = [
  { id: 'contact_name', key: 'name', label: 'Имя Контакта', type: 'text' },
  { id: 'contact_phone', key: 'phone', label: 'Телефон', type: 'phone' },
  { id: 'contact_email', key: 'email', label: 'Email', type: 'email' },
  { id: 'contact_company', key: 'company', label: 'Компания', type: 'text' },
  { id: 'contact_position', key: 'position', label: 'Должность', type: 'text' },
  { id: 'contact_country', key: 'country', label: 'Country', type: 'text' },
  { id: 'contact_gender', key: 'gender', label: 'Gender', type: 'select' },
  { id: 'contact_tags', key: 'tags', label: 'Теги', type: 'tags' },
  { id: 'contact_source', key: 'lead_source', label: 'Источник Лида', type: 'select' },
  { id: 'contact_created', key: 'created_at', label: 'Дата создания', type: 'date' },
];

// Для обратной совместимости
export const MOCK_CRM_FIELDS: CrmField[] = [...DEAL_FIELDS, ...CONTACT_FIELDS];

export const CRM_ACTIONS = [
  { id: 'change_stage', name: 'Изменить этап сделки' },
  { id: 'assign_user', name: 'Изменить ответственного' },
  { id: 'stop_agents', name: 'Остановить агентов в этом чате' },
  { id: 'create_task', name: 'Создать задачу' },
  { id: 'run_salesbot', name: 'Запустить Salesbot' },
  { id: 'add_deal_tags', name: 'Добавить теги сделки' },
  { id: 'add_contact_tags', name: 'Добавить теги контакта' },
  { id: 'add_deal_note', name: 'Добавить примечание к сделке' },
  { id: 'add_contact_note', name: 'Добавить примечание к контакту' },
  { id: 'send_email', name: 'Отправить email' },
  { id: 'send_files', name: 'Отправить файлы' },
  { id: 'send_kb_article', name: 'Отправить статью из базы знаний' },
  { id: 'send_webhook', name: 'Отправить вебхук' },
  // Legacy actions (kept for backwards compatibility)
  { id: 'send_message', name: 'Отправить сообщение' },
];

// Trigger conditions - events from Kommo CRM
export const TRIGGER_CONDITIONS = [
  { id: 'lead_created', name: 'Создана сделка' },
  { id: 'lead_updated', name: 'Обновлена сделка' },
  { id: 'lead_status_changed', name: 'Смена этапа сделки' },
  { id: 'contact_created', name: 'Создан контакт' },
  { id: 'contact_updated', name: 'Обновлен контакт' },
  { id: 'task_created', name: 'Создана задача' },
  { id: 'task_updated', name: 'Обновлена задача' },
  { id: 'any_lead_event', name: 'Любое событие сделки' },
  { id: 'any_contact_event', name: 'Любое событие контакта' },
];

// Mock users for trigger actions
export const MOCK_USERS = [
  { id: 'user_1', name: 'Irakli Shukakidze' },
  { id: 'user_2', name: 'Austin Odumuko' },
  { id: 'user_3', name: 'Максим Головатый' },
];

// Mock salesbots for trigger actions
export const MOCK_SALESBOTS = [
  { id: 'salesbot_1', name: 'INST/FB/WA BOT' },
  { id: 'salesbot_2', name: 'Telegram BOT' },
  { id: 'salesbot_3', name: 'Email Follow-up' },
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