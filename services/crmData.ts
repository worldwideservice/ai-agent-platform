import { CrmPipeline, CrmField } from '../types';

// Default pipelines shown before CRM synchronization
export const MOCK_PIPELINES: CrmPipeline[] = [
  {
    id: 'default_sales',
    name: 'Продажи',
    stages: [
      { id: 'new', name: 'Новый' },
      { id: 'contact', name: 'Первичный контакт' },
      { id: 'qualification', name: 'Квалификация' },
      { id: 'proposal', name: 'Предложение' },
      { id: 'negotiation', name: 'Переговоры' },
      { id: 'closed_won', name: 'Успешно завершено' },
      { id: 'closed_lost', name: 'Отказ' }
    ]
  },
  {
    id: 'default_support',
    name: 'Поддержка',
    stages: [
      { id: 'new_request', name: 'Новый запрос' },
      { id: 'in_progress', name: 'В работе' },
      { id: 'waiting_response', name: 'Ожидание ответа' },
      { id: 'resolved', name: 'Решено' },
      { id: 'closed', name: 'Закрыто' }
    ]
  },
  {
    id: 'default_onboarding',
    name: 'Онбординг',
    stages: [
      { id: 'new_client', name: 'Новый клиент' },
      { id: 'documentation', name: 'Документы' },
      { id: 'setup', name: 'Настройка' },
      { id: 'training', name: 'Обучение' },
      { id: 'active', name: 'Активен' }
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