# Спецификация Backend для AI Agent Platform

## Оглавление
1. [Структура базы данных](#структура-базы-данных)
2. [API Endpoints](#api-endpoints)
3. [Бизнес-логика](#бизнес-логика)
4. [Интеграции](#интеграции)
5. [Аутентификация и авторизация](#аутентификация-и-авторизация)
6. [Валидация данных](#валидация-данных)
7. [Обработка событий](#обработка-событий)
8. [Очереди и фоновые задачи](#очереди-и-фоновые-задачи)

---

## Структура базы данных

### 1. Users (Пользователи)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  company_name VARCHAR(255) DEFAULT 'World Wide Services',
  company_logo_url TEXT,

  -- Subscription
  subscription_plan VARCHAR(50) DEFAULT 'trial', -- trial, launch, scale, max
  subscription_status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
  subscription_expires_at TIMESTAMP,
  trial_ends_at TIMESTAMP,

  -- Usage
  ai_responses_used INTEGER DEFAULT 0,
  ai_responses_limit INTEGER DEFAULT 500,

  -- Settings
  theme VARCHAR(20) DEFAULT 'light', -- light, dark, system
  locale VARCHAR(10) DEFAULT 'ru',

  -- Agent Management Settings
  stop_on_human_reply BOOLEAN DEFAULT FALSE,
  auto_resume_after INTEGER DEFAULT 30,
  auto_resume_unit VARCHAR(20) DEFAULT 'дней', -- дней, часов, минут

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Agents (AI Агенты)
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  model VARCHAR(100) DEFAULT 'OpenAI GPT-4.1',

  -- Instructions
  system_instructions TEXT NOT NULL,

  -- Interactions
  check_before_send BOOLEAN DEFAULT FALSE,

  -- Advanced Settings
  auto_detect_language BOOLEAN DEFAULT FALSE,
  response_language VARCHAR(10),
  creativity_level VARCHAR(20) DEFAULT 'balanced', -- precise, balanced, creative
  response_delay_seconds INTEGER DEFAULT 45,

  -- Working Hours
  schedule_enabled BOOLEAN DEFAULT FALSE,
  working_schedule JSONB, -- Array of working days with times

  -- Statistics
  total_messages INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  average_response_time INTEGER, -- seconds

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
);
```

### 3. Agent_Pipelines (Воронки агента)
```sql
CREATE TABLE agent_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  pipeline_id VARCHAR(100) NOT NULL, -- ID из CRM (например: sales_funnel_1)
  pipeline_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  all_stages BOOLEAN DEFAULT FALSE,

  -- If all_stages = false, список этапов
  stages JSONB, -- Array of stage IDs

  -- Instructions for each stage
  stage_instructions JSONB, -- Object: { stageId: instruction }

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id),
  UNIQUE (agent_id, pipeline_id)
);
```

### 4. Agent_Channels (Каналы агента)
```sql
CREATE TABLE agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  all_channels BOOLEAN DEFAULT FALSE,

  -- If all_channels = false
  channels JSONB, -- Array of channel IDs: ["whatsapp", "telegram", "email"]

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id)
);
```

### 5. Agent_Knowledge_Base (База знаний агента)
```sql
CREATE TABLE agent_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  all_categories BOOLEAN DEFAULT FALSE,
  selected_categories JSONB, -- Array of category IDs

  create_task_if_no_answer BOOLEAN DEFAULT FALSE,
  no_answer_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id)
);
```

### 6. Agent_CRM_Access (Доступ к данным CRM)
```sql
CREATE TABLE agent_crm_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Deal fields
  read_deal_fields JSONB, -- Array of field IDs

  -- Contact fields
  read_contact_fields JSONB, -- Array of field IDs

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id)
);
```

### 7. Agent_Update_Rules (Правила обновления данных)
```sql
CREATE TABLE agent_update_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  entity_type VARCHAR(50) NOT NULL, -- deal, contact
  field_id VARCHAR(100) NOT NULL,
  condition TEXT NOT NULL,
  overwrite BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id),
  INDEX idx_entity_type (entity_type)
);
```

### 8. Triggers (Триггеры)
```sql
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  condition TEXT NOT NULL,

  -- Settings
  cancel_message TEXT,
  run_limit INTEGER DEFAULT 0, -- 0 = unlimited
  runs_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id),
  INDEX idx_is_active (is_active)
);
```

### 9. Trigger_Actions (Действия триггера)
```sql
CREATE TABLE trigger_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,

  action_type VARCHAR(100) NOT NULL, -- update_field, send_message, create_task, etc.
  action_config JSONB NOT NULL, -- Configuration for specific action
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_trigger_id (trigger_id)
);
```

### 10. Chains (Цепочки)
```sql
CREATE TABLE chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Conditions
  condition_type VARCHAR(20) DEFAULT 'all', -- all, specific
  condition_stages JSONB, -- Array of stage IDs
  condition_exclude TEXT,

  -- Settings
  run_limit INTEGER DEFAULT 0,
  runs_count INTEGER DEFAULT 0,

  -- Working schedule
  schedule JSONB, -- Array of working days with times

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id),
  INDEX idx_is_active (is_active)
);
```

### 11. Chain_Steps (Шаги цепочки)
```sql
CREATE TABLE chain_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,

  order_index INTEGER NOT NULL,
  delay_value INTEGER NOT NULL,
  delay_unit VARCHAR(20) NOT NULL, -- Минуты, Часы, Дни

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_chain_id (chain_id)
);
```

### 12. Chain_Step_Actions (Действия шага цепочки)
```sql
CREATE TABLE chain_step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES chain_steps(id) ON DELETE CASCADE,

  action_type VARCHAR(100) NOT NULL, -- generate_message, update_field, create_task
  instruction TEXT,
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_step_id (step_id)
);
```

### 13. Integrations (Интеграции)
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  integration_type VARCHAR(50) NOT NULL, -- kommo, google_calendar, telegram, etc.
  is_active BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT FALSE,

  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Configuration
  config JSONB, -- Integration-specific settings

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_integration_type (integration_type),
  UNIQUE (user_id, integration_type)
);
```

### 14. KB_Categories (Категории базы знаний)
```sql
CREATE TABLE kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES kb_categories(id) ON DELETE CASCADE,

  -- Hierarchy
  path VARCHAR(500), -- Materialized path: /general/immigration/
  level INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_path (path)
);
```

### 15. KB_Articles (Статьи базы знаний)
```sql
CREATE TABLE kb_articles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Search optimization
  content_vector TSVECTOR, -- For full-text search
  embedding VECTOR(1536), -- For semantic search (OpenAI embeddings)

  -- Statistics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active),
  INDEX idx_content_vector USING GIN(content_vector),
  INDEX idx_embedding USING ivfflat(embedding vector_cosine_ops)
);
```

### 16. KB_Article_Categories (Связь статей и категорий)
```sql
CREATE TABLE kb_article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_article_id (article_id),
  INDEX idx_category_id (category_id),
  UNIQUE (article_id, category_id)
);
```

### 17. KB_Article_Relations (Связанные статьи)
```sql
CREATE TABLE kb_article_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  related_article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_article_id (article_id),
  UNIQUE (article_id, related_article_id),
  CHECK (article_id != related_article_id)
);
```

### 18. KB_Article_Files (Файлы статей)
```sql
CREATE TABLE kb_article_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_article_id (article_id)
);
```

### 19. Conversations (Разговоры)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- CRM Connection
  crm_deal_id VARCHAR(100),
  crm_contact_id VARCHAR(100),

  -- Channel
  channel_type VARCHAR(50) NOT NULL, -- whatsapp, telegram, chat, email
  channel_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, paused, closed
  paused_by VARCHAR(50), -- human, agent, system
  paused_at TIMESTAMP,

  -- Metadata
  first_message_at TIMESTAMP,
  last_message_at TIMESTAMP,
  messages_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_agent_id (agent_id),
  INDEX idx_status (status),
  INDEX idx_crm_deal_id (crm_deal_id)
);
```

### 20. Messages (Сообщения)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(20) NOT NULL, -- user, agent, system
  sender_name VARCHAR(255),

  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text', -- text, image, audio, video, document
  attachments JSONB, -- Array of file URLs

  -- AI Info (if role = agent)
  model VARCHAR(100),
  tokens_used INTEGER,
  response_time_ms INTEGER,

  -- Knowledge Base (if used)
  kb_articles_used JSONB, -- Array of article IDs used

  -- Status
  is_sent BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_conversation_id (conversation_id),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
);
```

### 21. Notifications (Уведомления)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- license_expiring, quota_exceeded, agent_error
  title VARCHAR(255) NOT NULL,
  description TEXT,
  action_text VARCHAR(100),
  action_url VARCHAR(500),

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);
```

### 22. Audit_Log (Журнал аудита)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL, -- create_agent, delete_article, update_trigger
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  old_values JSONB,
  new_values JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at)
);
```

### 23. Usage_Statistics (Статистика использования)
```sql
CREATE TABLE usage_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Messages
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,

  -- AI
  ai_responses_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Conversations
  new_conversations INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  closed_conversations INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  UNIQUE (user_id, date)
);
```

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Регистрация нового пользователя
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "subscription_plan": "trial",
    "trial_ends_at": "2025-12-21T10:00:00Z"
  },
  "access_token": "jwt_token",
  "refresh_token": "jwt_refresh_token"
}
```

#### POST /api/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": { ... },
  "access_token": "jwt_token",
  "refresh_token": "jwt_refresh_token"
}
```

#### POST /api/auth/refresh
Обновление access token

#### POST /api/auth/logout
Выход из системы

#### POST /api/auth/forgot-password
Восстановление пароля

---

### User Management

#### GET /api/user/profile
Получить профиль пользователя

#### PATCH /api/user/profile
Обновить профиль
```json
Request:
{
  "full_name": "John Doe",
  "company_name": "My Company",
  "theme": "dark"
}
```

#### POST /api/user/avatar
Загрузить аватар (multipart/form-data)

#### PATCH /api/user/settings
Обновить настройки
```json
Request:
{
  "stop_on_human_reply": true,
  "auto_resume_after": 30,
  "auto_resume_unit": "дней"
}
```

---

### Agents

#### GET /api/agents
Получить список агентов
```json
Query params:
- page: number
- limit: number
- search: string
- is_active: boolean

Response:
{
  "agents": [
    {
      "id": "uuid",
      "name": "AI Assistant",
      "is_active": true,
      "model": "OpenAI GPT-4.1",
      "created_at": "2025-11-21T10:00:00Z",
      "total_messages": 1234,
      "total_conversations": 56
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### POST /api/agents
Создать агента
```json
Request:
{
  "name": "Sales Agent",
  "is_active": false,
  "system_instructions": "You are a helpful sales assistant..."
}

Response:
{
  "agent": {
    "id": "uuid",
    "name": "Sales Agent",
    ...
  }
}
```

#### GET /api/agents/:id
Получить детали агента (включая все настройки)

#### PATCH /api/agents/:id
Обновить агента
```json
Request:
{
  "name": "Updated Name",
  "is_active": true,
  "system_instructions": "...",
  "check_before_send": false,
  "creativity_level": "balanced",
  "response_delay_seconds": 45
}
```

#### DELETE /api/agents/:id
Удалить агента

#### POST /api/agents/:id/duplicate
Создать копию агента

#### PATCH /api/agents/:id/toggle
Включить/выключить агента

---

### Agent Pipelines

#### GET /api/agents/:id/pipelines
Получить настройки воронок агента

#### PUT /api/agents/:id/pipelines
Обновить настройки воронок
```json
Request:
{
  "pipelines": [
    {
      "pipeline_id": "sales_funnel_1",
      "pipeline_name": "Воронка продаж",
      "is_active": true,
      "all_stages": false,
      "stages": ["new_lead", "qualification"],
      "stage_instructions": {
        "new_lead": "Be friendly and welcoming...",
        "qualification": "Ask qualifying questions..."
      }
    }
  ]
}
```

#### POST /api/agents/:id/sync-crm
Синхронизировать настройки из CRM

---

### Agent Channels

#### GET /api/agents/:id/channels
#### PUT /api/agents/:id/channels
```json
Request:
{
  "all_channels": false,
  "channels": ["whatsapp", "telegram", "email"]
}
```

---

### Agent Knowledge Base

#### GET /api/agents/:id/knowledge-base
#### PUT /api/agents/:id/knowledge-base
```json
Request:
{
  "all_categories": false,
  "selected_categories": ["cat-uuid-1", "cat-uuid-2"],
  "create_task_if_no_answer": true,
  "no_answer_message": "..."
}
```

---

### Agent CRM Access & Update Rules

#### GET /api/agents/:id/crm-access
#### PUT /api/agents/:id/crm-access
```json
Request:
{
  "read_deal_fields": ["stage_id", "budget", "description"],
  "read_contact_fields": ["f_name", "l_name", "phone"]
}
```

#### GET /api/agents/:id/update-rules
#### POST /api/agents/:id/update-rules
Создать правило обновления
```json
Request:
{
  "entity_type": "deal",
  "field_id": "budget",
  "condition": "when customer mentions price",
  "overwrite": false
}
```

#### PATCH /api/agents/:id/update-rules/:ruleId
#### DELETE /api/agents/:id/update-rules/:ruleId

---

### Triggers

#### GET /api/agents/:id/triggers
Получить список триггеров агента

#### POST /api/agents/:id/triggers
Создать триггер
```json
Request:
{
  "name": "Welcome Message",
  "is_active": true,
  "condition": "When conversation starts",
  "actions": [
    {
      "action_type": "send_message",
      "action_config": {
        "message": "Hello! How can I help you?"
      }
    }
  ],
  "cancel_message": "Operation cancelled",
  "run_limit": 1
}
```

#### PATCH /api/agents/:id/triggers/:triggerId
#### DELETE /api/agents/:id/triggers/:triggerId
#### PATCH /api/agents/:id/triggers/:triggerId/toggle

---

### Chains

#### GET /api/agents/:id/chains
Получить список цепочек

#### POST /api/agents/:id/chains
Создать цепочку
```json
Request:
{
  "name": "Follow-up Sequence",
  "is_active": true,
  "condition_type": "specific",
  "condition_stages": ["new_lead"],
  "condition_exclude": "if already contacted",
  "steps": [
    {
      "order_index": 0,
      "delay_value": 20,
      "delay_unit": "Минуты",
      "actions": [
        {
          "action_type": "generate_message",
          "instruction": "Send a follow-up message..."
        }
      ]
    }
  ],
  "schedule": [
    {
      "day": "Понедельник",
      "enabled": true,
      "start": "08:00",
      "end": "22:00"
    }
  ],
  "run_limit": 0
}
```

#### PATCH /api/agents/:id/chains/:chainId
#### DELETE /api/agents/:id/chains/:chainId
#### PATCH /api/agents/:id/chains/:chainId/toggle

---

### Integrations

#### GET /api/integrations
Получить список интеграций пользователя

#### GET /api/integrations/:type
Получить детали конкретной интеграции (kommo, google_calendar)

#### POST /api/integrations/:type/connect
Подключить интеграцию (OAuth flow)

#### DELETE /api/integrations/:type/disconnect
Отключить интеграцию

#### PATCH /api/integrations/:type/toggle
Включить/выключить интеграцию

#### PATCH /api/integrations/:type/config
Обновить конфигурацию
```json
Request (Kommo):
{
  "subdomain": "mycompany",
  "webhook_secret": "secret123"
}

Request (Google Calendar):
{
  "calendar_id": "primary",
  "event_title_template": "Meeting with {contact_name}"
}
```

---

### Knowledge Base - Categories

#### GET /api/kb/categories
Получить категории
```json
Query params:
- parent_id: uuid | null (для иерархии)

Response:
{
  "categories": [
    {
      "id": "uuid",
      "name": "General",
      "description": "...",
      "parent_id": null,
      "subcategories_count": 5,
      "articles_count": 12
    }
  ]
}
```

#### POST /api/kb/categories
Создать категорию
```json
Request:
{
  "name": "Immigration",
  "description": "Immigration related articles",
  "parent_id": "parent-uuid or null"
}
```

#### GET /api/kb/categories/:id
#### PATCH /api/kb/categories/:id
#### DELETE /api/kb/categories/:id
#### POST /api/kb/categories/:id/duplicate

---

### Knowledge Base - Articles

#### GET /api/kb/articles
Получить статьи
```json
Query params:
- page: number
- limit: number
- search: string
- category_id: uuid
- is_active: boolean

Response:
{
  "articles": [
    {
      "id": 1234,
      "title": "How to apply for visa",
      "is_active": true,
      "categories": ["Immigration", "Visas"],
      "related_articles_count": 3,
      "usage_count": 45,
      "created_at": "2025-11-21T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### POST /api/kb/articles
Создать статью
```json
Request:
{
  "title": "Article title",
  "content": "Article content...",
  "is_active": true,
  "categories": ["cat-uuid-1", "cat-uuid-2"],
  "related_articles": [1235, 1236]
}
```

#### GET /api/kb/articles/:id
#### PATCH /api/kb/articles/:id
#### DELETE /api/kb/articles/:id
#### POST /api/kb/articles/:id/duplicate
#### PATCH /api/kb/articles/:id/toggle

#### POST /api/kb/articles/:id/files
Загрузить файлы к статье (multipart/form-data)

#### DELETE /api/kb/articles/:id/files/:fileId
Удалить файл

---

### Chat

#### POST /api/chat/send
Отправить сообщение в тестовый чат
```json
Request:
{
  "agent_id": "uuid",
  "message": "Hello, how can I get a visa?",
  "conversation_id": "uuid or null for new conversation"
}

Response:
{
  "conversation_id": "uuid",
  "message": {
    "id": "uuid",
    "role": "agent",
    "content": "Hello! I'd be happy to help...",
    "kb_articles_used": [1234, 1235],
    "response_time_ms": 1250,
    "tokens_used": 456
  }
}
```

#### GET /api/chat/conversations
Получить список разговоров

#### GET /api/chat/conversations/:id
Получить историю разговора

#### DELETE /api/chat/conversations/:id
Удалить разговор

---

### Conversations (Production)

#### GET /api/conversations
Получить все разговоры
```json
Query params:
- status: active | paused | closed
- agent_id: uuid
- channel_type: whatsapp | telegram | chat
- date_from: timestamp
- date_to: timestamp
```

#### GET /api/conversations/:id
#### PATCH /api/conversations/:id/pause
Поставить на паузу
```json
Request:
{
  "paused_by": "human",
  "reason": "Need human assistance"
}
```

#### PATCH /api/conversations/:id/resume
Возобновить

#### POST /api/conversations/:id/messages
Отправить сообщение

---

### Notifications

#### GET /api/notifications
Получить уведомления

#### PATCH /api/notifications/:id/read
Отметить как прочитанное

#### POST /api/notifications/read-all
Отметить все как прочитанные

#### DELETE /api/notifications/:id
Удалить уведомление

#### DELETE /api/notifications
Удалить все

---

### Billing

#### GET /api/billing/subscription
Получить текущую подписку

#### POST /api/billing/subscribe
Оформить подписку
```json
Request:
{
  "plan": "scale",
  "billing_cycle": "yearly",
  "responses_count": 15000,
  "payment_method": "stripe_payment_method_id"
}
```

#### POST /api/billing/cancel
Отменить подписку

#### POST /api/billing/change-plan
Изменить план

#### GET /api/billing/invoices
Получить историю платежей

---

### Statistics & Dashboard

#### GET /api/statistics/dashboard
Получить данные для дашборда
```json
Response:
{
  "active_agents": 5,
  "total_messages": 1234,
  "new_leads": 45,
  "response_rate": "85%",
  "messages_chart": [
    { "date": "2025-11-01", "count": 45 },
    { "date": "2025-11-02", "count": 52 }
  ],
  "conversions_chart": [ ... ]
}
```

#### GET /api/statistics/usage
Статистика использования

#### GET /api/statistics/agents/:id
Статистика конкретного агента

---

## Бизнес-логика

### 1. Обработка входящего сообщения

**Алгоритм:**
1. Получить сообщение из канала (Webhook от CRM/мессенджера)
2. Определить разговор (существующий или создать новый)
3. Найти агента для этого разговора:
   - По воронке/этапу сделки
   - По каналу
   - Проверить, активен ли агент
4. Проверить статус разговора:
   - Если на паузе (человек отвечает) → пропустить
   - Если активен → продолжить
5. Проверить рабочее время агента
6. Получить контекст:
   - История сообщений
   - Данные из CRM (если доступ настроен)
   - Релевантные статьи из базы знаний
7. Проверить триггеры:
   - Выполнить условия триггера
   - Если сработал → выполнить действия
8. Если нет триггера:
   - Сформировать prompt для AI
   - Отправить запрос к AI модели
   - Получить ответ
9. Поиск в базе знаний:
   - Semantic search по embeddings
   - Получить релевантные статьи
   - Добавить в контекст
10. Применить правила обновления данных:
    - Проанализировать сообщение
    - Обновить поля CRM по условиям
11. Если требуется проверка перед отправкой:
    - Сохранить сообщение как черновик
    - Отправить уведомление пользователю
12. Иначе:
    - Отправить сообщение клиенту
    - Обновить статистику
13. Проверить цепочки:
    - Если условия цепочки совпали
    - Запланировать шаги цепочки в очередь

---

### 2. Обработка цепочек (Chains)

**Алгоритм:**
1. Cron job проверяет каждую минуту:
   - Запланированные шаги цепочек
2. Для каждого шага:
   - Проверить, прошло ли время delay
   - Проверить рабочее время
   - Проверить статус разговора
3. Выполнить действия шага:
   - generate_message → отправить AI сообщение
   - update_field → обновить поле CRM
   - create_task → создать задачу в CRM
4. Если есть следующий шаг:
   - Запланировать его выполнение
5. Обновить runs_count
6. Проверить run_limit

---

### 3. Поиск в базе знаний

**Алгоритм:**
1. Получить вопрос пользователя
2. Генерировать embedding вопроса (OpenAI)
3. Semantic search:
   ```sql
   SELECT * FROM kb_articles
   WHERE user_id = ? AND is_active = true
   ORDER BY embedding <=> query_embedding
   LIMIT 5;
   ```
4. Full-text search (дополнительно):
   ```sql
   SELECT * FROM kb_articles
   WHERE content_vector @@ to_tsquery(?)
   ```
5. Объединить результаты
6. Фильтр по категориям (если настроено)
7. Получить связанные статьи
8. Получить файлы статей
9. Сформировать контекст для AI
10. Если ничего не найдено:
    - Использовать no_answer_message
    - Создать задачу в CRM (если настроено)

---

### 4. Применение правил обновления

**Алгоритм:**
1. Получить сообщение пользователя
2. Получить все правила агента для entity_type
3. Для каждого правила:
   - Отправить в AI проверку условия:
     ```
     Message: "I want to buy for $5000"
     Rule condition: "when customer mentions budget"
     Question: "Does this message match the condition?"
     Answer: Yes/No + extracted value
     ```
4. Если условие совпало:
   - Извлечь значение из сообщения
   - Проверить overwrite флаг
   - Обновить поле в CRM через API

---

### 5. Управление подпиской

**Алгоритм:**
1. При регистрации:
   - План: trial
   - trial_ends_at: +14 дней
   - ai_responses_limit: 500
2. При каждом AI ответе:
   - Увеличить ai_responses_used
   - Проверить лимит
   - Если превышен:
     - Отправить уведомление
     - Заблокировать агентов
3. Cron job ежедневно:
   - Проверить истекающие подписки
   - За 7 дней → уведомление
   - За 3 дня → уведомление
   - За 1 день → уведомление
   - В день истечения → деактивировать
4. При оплате:
   - Обновить план
   - Обновить лимиты
   - Обновить expires_at
   - Обнулить ai_responses_used (если новый период)

---

### 6. Синхронизация с CRM

**Алгоритм Kommo:**
1. OAuth подключение:
   - Redirect на Kommo OAuth
   - Получить access_token
   - Сохранить в integrations
2. Webhook setup:
   - Зарегистрировать webhooks в Kommo:
     - new_message
     - deal_status_changed
     - contact_updated
3. При получении webhook:
   - Обработать событие
   - Обновить локальные данные
4. Синхронизация воронок:
   - GET /api/v4/leads/pipelines
   - Обновить список воронок и этапов

---

## Интеграции

### 1. Kommo CRM

**Endpoints для интеграции:**
- OAuth: `https://www.amocrm.ru/oauth`
- API Base: `https://{subdomain}.amocrm.ru/api/v4/`

**Webhooks:**
- `message_in` - входящее сообщение
- `lead_status_changed` - изменение статуса сделки
- `contact_note_added` - новая заметка

**API Methods используемые:**
- GET `/leads` - получить сделки
- GET `/leads/{id}` - детали сделки
- PATCH `/leads/{id}` - обновить сделку
- GET `/contacts/{id}` - получить контакт
- PATCH `/contacts/{id}` - обновить контакт
- POST `/talks` - отправить сообщение
- GET `/leads/pipelines` - получить воронки

---

### 2. Google Calendar

**Endpoints:**
- OAuth: `https://accounts.google.com/o/oauth2/auth`
- API: `https://www.googleapis.com/calendar/v3/`

**Scopes:**
- `https://www.googleapis.com/auth/calendar.events`

**Use cases:**
- Создание встреч из чата
- Напоминания о встречах
- Синхронизация занятости

---

### 3. OpenAI API

**Endpoints:**
- Chat: `https://api.openai.com/v1/chat/completions`
- Embeddings: `https://api.openai.com/v1/embeddings`

**Models:**
- GPT-4.1 turbo
- GPT-4o
- text-embedding-3-large (для embeddings)

---

### 4. Google Gemini API

**Endpoint:**
- `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

---

### 5. Мессенджеры

**WhatsApp Business API:**
- Webhook для входящих сообщений
- Send message API

**Telegram Bot API:**
- Long polling / Webhooks
- sendMessage

**Email:**
- SMTP для отправки
- IMAP для получения

---

## Аутентификация и авторизация

### JWT Tokens

**Access Token:**
- Срок: 15 минут
- Payload:
  ```json
  {
    "user_id": "uuid",
    "email": "user@example.com",
    "subscription_plan": "scale",
    "exp": 1234567890
  }
  ```

**Refresh Token:**
- Срок: 30 дней
- Хранится в httpOnly cookie
- Используется для обновления access token

### Permissions

**User roles:**
- `owner` - владелец аккаунта (все права)
- `admin` - администратор (все кроме billing)
- `member` - член команды (просмотр + редактирование агентов)
- `viewer` - только просмотр

### Rate Limiting

**Лимиты по endpoint:**
- Auth: 5 req/min
- Chat: 30 req/min
- CRUD: 60 req/min
- Read-only: 120 req/min

---

## Валидация данных

### Agent
```typescript
{
  name: {
    required: true,
    minLength: 1,
    maxLength: 255
  },
  system_instructions: {
    required: true,
    minLength: 10,
    maxLength: 40000 // в зависимости от плана
  },
  model: {
    enum: ['OpenAI GPT-4.1', 'OpenAI GPT-4o', 'Gemini 1.5 Pro']
  },
  creativity_level: {
    enum: ['precise', 'balanced', 'creative']
  },
  response_delay_seconds: {
    min: 0,
    max: 300
  }
}
```

### KB Article
```typescript
{
  title: {
    required: true,
    minLength: 1,
    maxLength: 500
  },
  content: {
    required: true,
    minLength: 10
  },
  categories: {
    required: true,
    minLength: 1,
    type: 'array'
  }
}
```

### Trigger
```typescript
{
  name: {
    required: true,
    minLength: 1,
    maxLength: 255
  },
  condition: {
    required: true,
    minLength: 5
  },
  actions: {
    required: true,
    minLength: 1,
    type: 'array'
  }
}
```

---

## Обработка событий

### Event-Driven Architecture

**Events:**
1. `agent.created`
2. `agent.updated`
3. `agent.deleted`
4. `message.received`
5. `message.sent`
6. `conversation.started`
7. `conversation.paused`
8. `conversation.closed`
9. `trigger.executed`
10. `chain.step.executed`
11. `article.used`
12. `quota.exceeded`
13. `subscription.expired`

**Event Handlers:**
```typescript
// Example
on('message.received', async (event) => {
  const { conversation_id, message, agent_id } = event.data;

  // Process message with agent
  await processMessageWithAgent(conversation_id, message, agent_id);

  // Check triggers
  await checkTriggers(agent_id, conversation_id, message);

  // Check chains
  await checkChains(agent_id, conversation_id);
});
```

---

## Очереди и фоновые задачи

### Bull Queue (Redis)

**Queues:**

1. **message-processing**
   - Обработка входящих сообщений
   - Priority: high
   - Concurrency: 10

2. **ai-generation**
   - Генерация AI ответов
   - Priority: high
   - Concurrency: 5
   - Timeout: 30s

3. **chain-execution**
   - Выполнение шагов цепочек
   - Priority: medium
   - Concurrency: 3

4. **knowledge-base-indexing**
   - Генерация embeddings для статей
   - Priority: low
   - Concurrency: 2

5. **crm-sync**
   - Синхронизация с CRM
   - Priority: medium
   - Concurrency: 2

6. **notifications**
   - Отправка уведомлений
   - Priority: low
   - Concurrency: 5

### Cron Jobs

```javascript
// Проверка истекающих подписок (ежедневно в 00:00)
cron.schedule('0 0 * * *', checkExpiringSubscriptions);

// Обработка запланированных цепочек (каждую минуту)
cron.schedule('* * * * *', processScheduledChains);

// Агрегация статистики (ежечасно)
cron.schedule('0 * * * *', aggregateStatistics);

// Очистка старых логов (еженедельно)
cron.schedule('0 0 * * 0', cleanupOldLogs);

// Обновление embeddings (каждые 6 часов)
cron.schedule('0 */6 * * *', updateKBEmbeddings);
```

---

## WebSocket Events

### Real-time updates

**Events for client:**
```typescript
// New message in conversation
socket.emit('message:new', {
  conversation_id: 'uuid',
  message: { ... }
});

// Agent status changed
socket.emit('agent:status_changed', {
  agent_id: 'uuid',
  is_active: true
});

// Quota warning
socket.emit('quota:warning', {
  used: 450,
  limit: 500,
  remaining: 50
});

// Notification
socket.emit('notification:new', {
  notification: { ... }
});
```

---

## Кэширование

### Redis Cache

**Keys:**
```
user:{user_id}:profile
user:{user_id}:settings
user:{user_id}:subscription
agent:{agent_id}:config
agent:{agent_id}:statistics
kb:categories:{user_id}
conversation:{conversation_id}:context
```

**TTL:**
- User data: 15 minutes
- Agent config: 5 minutes
- KB categories: 1 hour
- Conversation context: 30 minutes

---

## Мониторинг и логирование

### Metrics

**Application:**
- Request rate
- Response time
- Error rate
- Active users
- Active conversations

**Business:**
- AI responses per day
- Tokens used per day
- Revenue (MRR, ARR)
- Churn rate
- Active subscriptions by plan

**Infrastructure:**
- CPU/Memory usage
- Database connections
- Queue length
- Redis memory

### Logging

**Levels:**
- ERROR: Критические ошибки
- WARN: Предупреждения
- INFO: Важные события
- DEBUG: Детальная информация

**Structured logging:**
```json
{
  "timestamp": "2025-11-21T10:00:00Z",
  "level": "INFO",
  "service": "agent-service",
  "user_id": "uuid",
  "agent_id": "uuid",
  "conversation_id": "uuid",
  "message": "Message processed successfully",
  "duration_ms": 1250,
  "tokens_used": 456
}
```

---

## Безопасность

### Input Validation
- Sanitize all user inputs
- Validate file uploads (type, size)
- Rate limiting per user/IP

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all connections
- Mask tokens in logs

### AI Safety
- Content moderation for AI responses
- Prompt injection prevention
- Token limit per request

### Access Control
- JWT tokens
- Role-based permissions
- IP whitelisting (опционально)

---

## Масштабирование

### Horizontal Scaling
- Stateless API servers
- Load balancer (Nginx/HAProxy)
- Multiple workers for queues

### Database
- Read replicas for heavy reads
- Connection pooling
- Query optimization
- Partitioning (по user_id)

### Caching Strategy
- Redis cluster
- CDN for static files
- Cache warming

---

## Резервное копирование

### Database
- Ежедневные полные бэкапы
- Continuous WAL archiving
- Point-in-time recovery

### Files
- S3 backups для uploaded files
- Versioning enabled

### Recovery Plan
- RTO: 4 hours
- RPO: 15 minutes

---

**Дата создания:** 21 ноября 2025
**Версия:** 1.0
**Автор:** Claude Code
