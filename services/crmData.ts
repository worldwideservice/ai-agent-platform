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