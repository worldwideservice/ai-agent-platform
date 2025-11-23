# Потоки Данных и Источники

## Общая архитектура

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[Пользовательский интерфейс]
        State[State Management]
    end
    
    subgraph "Backend API"
        API[REST API]
        Auth[Аутентификация]
        AgentService[Agent Service]
        TriggerService[Trigger Service]
        SequenceService[Sequence Service]
        IntegrationService[Integration Service]
    end
    
    subgraph "База данных"
        DB[(PostgreSQL/Supabase)]
    end
    
    subgraph "Внешние сервисы"
        CRM[CRM API<br/>Kommo/amoCRM]
        AI[AI Models<br/>OpenAI/Claude/Gemini]
        Calendar[Google Calendar]
        Messaging[Мессенджеры<br/>WhatsApp/Telegram]
    end
    
    UI --> State
    State --> API
    API --> Auth
    Auth --> AgentService
    Auth --> TriggerService
    Auth --> SequenceService
    Auth --> IntegrationService
    
    AgentService --> DB
    TriggerService --> DB
    SequenceService --> DB
    IntegrationService --> DB
    
    IntegrationService --> CRM
    AgentService --> AI
    IntegrationService --> Calendar
    IntegrationService --> Messaging
```

---

## 1. Источники данных

### 1.1 Локальная база данных

**Технология**: PostgreSQL (через Supabase)

**Хранимые данные**:
- Агенты (agents)
- Триггеры (triggers)
- Цепочки (sequences)
- Настройки интеграций (integrations)
- Пользователи (users)
- История выполнения (execution_logs)

**Схема таблиц**:

```sql
-- Таблица агентов
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    instructions TEXT,
    ai_model VARCHAR(100),
    language_detection BOOLEAN DEFAULT false,
    default_language VARCHAR(10),
    schedule JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица настроек CRM доступа
CREATE TABLE agent_crm_access (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    lead_fields JSONB, -- массив ID полей
    contact_fields JSONB, -- массив ID полей
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица триггеров
CREATE TABLE triggers (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    conditions JSONB, -- массив условий
    actions JSONB, -- массив действий
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица цепочек
CREATE TABLE sequences (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    trigger_config JSONB,
    steps JSONB, -- массив шагов
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица интеграций
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    integration_type VARCHAR(100), -- 'google_calendar', 'kommo', etc.
    config JSONB, -- конфигурация интеграции
    credentials JSONB, -- зашифрованные учетные данные
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 1.2 CRM API (Kommo/amoCRM)

**Базовый URL**: `https://{subdomain}.kommo.com/api/v4/`

**Аутентификация**: OAuth 2.0

**Используемые endpoints**:

#### Получение полей сделок
```
GET /api/v4/leads/custom_fields
```
**Response**:
```json
{
  "_embedded": {
    "custom_fields": [
      {
        "id": 123,
        "name": "Бюджет",
        "type": "numeric",
        "is_predefined": false
      }
    ]
  }
}
```

#### Получение полей контактов
```
GET /api/v4/contacts/custom_fields
```

#### Получение воронок и этапов
```
GET /api/v4/leads/pipelines
```
**Response**:
```json
{
  "_embedded": {
    "pipelines": [
      {
        "id": 1,
        "name": "Продажи",
        "_embedded": {
          "statuses": [
            {
              "id": 101,
              "name": "Новая",
              "sort": 1
            }
          ]
        }
      }
    ]
  }
}
```

#### Получение пользователей
```
GET /api/v4/users
```

#### Получение тегов
```
GET /api/v4/leads/tags
GET /api/v4/contacts/tags
```

#### Создание/обновление сделки
```
PATCH /api/v4/leads/{lead_id}
```

#### Создание задачи
```
POST /api/v4/tasks
```

#### Webhooks
CRM отправляет webhooks на наш сервер при событиях:
- Создание сделки
- Изменение статуса
- Добавление примечания
- Изменение полей

**Webhook URL**: `https://our-app.com/api/webhooks/crm`

---

### 1.3 AI Models API

#### OpenAI API
**Base URL**: `https://api.openai.com/v1/`

**Endpoint для чата**:
```
POST /chat/completions
```
**Request**:
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "Инструкции агента..."
    },
    {
      "role": "user",
      "content": "Сообщение пользователя"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### Anthropic Claude API
**Base URL**: `https://api.anthropic.com/v1/`

**Endpoint**:
```
POST /messages
```

#### Google Gemini API
**Base URL**: `https://generativelanguage.googleapis.com/v1beta/`

**Endpoint**:
```
POST /models/gemini-pro:generateContent
```

---

### 1.4 Google Calendar API

**Base URL**: `https://www.googleapis.com/calendar/v3/`

**Аутентификация**: OAuth 2.0

**Endpoints**:

#### Получение списка календарей
```
GET /users/me/calendarList
```

#### Создание события
```
POST /calendars/{calendarId}/events
```
**Request**:
```json
{
  "summary": "Встреча с клиентом",
  "description": "Обсуждение проекта",
  "start": {
    "dateTime": "2024-01-15T10:00:00+03:00",
    "timeZone": "Europe/Moscow"
  },
  "end": {
    "dateTime": "2024-01-15T11:00:00+03:00",
    "timeZone": "Europe/Moscow"
  },
  "attendees": [
    {
      "email": "client@example.com"
    }
  ]
}
```

#### Проверка занятости
```
POST /freeBusy
```

---

### 1.5 Мессенджеры API

#### WhatsApp Business API
**Provider**: Twilio / Meta Business

**Endpoint для отправки сообщения**:
```
POST /v1/messages
```
**Request**:
```json
{
  "to": "+79001234567",
  "type": "text",
  "text": {
    "body": "Текст сообщения"
  }
}
```

#### Telegram Bot API
**Base URL**: `https://api.telegram.org/bot{token}/`

**Endpoint**:
```
POST /sendMessage
```
**Request**:
```json
{
  "chat_id": 123456789,
  "text": "Текст сообщения"
}
```

---

## 2. Потоки данных по функциям

### 2.1 Загрузка страницы редактирования агента

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Backend API
    participant DB as Database
    participant CRM as CRM API
    
    UI->>API: GET /api/agents/{id}
    API->>DB: SELECT * FROM agents WHERE id = ?
    DB-->>API: Agent data
    API->>DB: SELECT * FROM agent_crm_access WHERE agent_id = ?
    DB-->>API: CRM access data
    API-->>UI: Agent + CRM access
    
    UI->>API: GET /api/crm/fields/leads
    API->>CRM: GET /api/v4/leads/custom_fields
    CRM-->>API: Lead fields
    API-->>UI: Lead fields
    
    UI->>API: GET /api/crm/fields/contacts
    API->>CRM: GET /api/v4/contacts/custom_fields
    CRM-->>API: Contact fields
    API-->>UI: Contact fields
```

---

### 2.2 Сохранение настроек агента

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Backend API
    participant DB as Database
    
    UI->>API: PUT /api/agents/{id}
    Note over UI,API: {name, active, instructions, ai_model, etc.}
    
    API->>DB: UPDATE agents SET ... WHERE id = ?
    DB-->>API: Success
    
    API->>DB: UPDATE agent_crm_access SET ... WHERE agent_id = ?
    DB-->>API: Success
    
    API-->>UI: Updated agent data
```

---

### 2.3 Срабатывание триггера

```mermaid
sequenceDiagram
    participant CRM as CRM Webhook
    participant API as Backend API
    participant DB as Database
    participant Action as Action Service
    participant Msg as Messaging API
    
    CRM->>API: POST /api/webhooks/crm
    Note over CRM,API: Event: lead status changed
    
    API->>DB: SELECT * FROM triggers WHERE active = true
    DB-->>API: Active triggers
    
    API->>API: Check conditions
    Note over API: If conditions match...
    
    API->>Action: Execute actions
    
    alt Action: Send message
        Action->>Msg: Send WhatsApp message
        Msg-->>Action: Message sent
    else Action: Create task
        Action->>CRM: POST /api/v4/tasks
        CRM-->>Action: Task created
    else Action: Change stage
        Action->>CRM: PATCH /api/v4/leads/{id}
        CRM-->>Action: Lead updated
    end
    
    API->>DB: INSERT INTO execution_logs
    DB-->>API: Logged
```

---

### 2.4 Выполнение цепочки

```mermaid
sequenceDiagram
    participant Trigger as Trigger Event
    participant API as Backend API
    participant DB as Database
    participant Queue as Job Queue
    participant Worker as Worker Process
    participant AI as AI API
    participant CRM as CRM API
    
    Trigger->>API: Start sequence
    API->>DB: SELECT * FROM sequences WHERE id = ?
    DB-->>API: Sequence data
    
    API->>Queue: Enqueue sequence job
    Queue-->>API: Job queued
    
    Queue->>Worker: Process job
    
    loop For each step
        alt Step: Delay
            Worker->>Worker: Wait X minutes/hours/days
        else Step: Generate message
            Worker->>AI: Generate message
            AI-->>Worker: Generated text
        else Step: Send message
            Worker->>CRM: Send message
            CRM-->>Worker: Sent
        else Step: Create task
            Worker->>CRM: Create task
            CRM-->>Worker: Created
        end
        
        Worker->>DB: UPDATE execution log
    end
    
    Worker->>DB: Mark sequence as completed
```

---

### 2.5 Обработка сообщения пользователя агентом

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant Msg as Мессенджер
    participant API as Backend API
    participant DB as Database
    participant CRM as CRM API
    participant AI as AI Model
    
    User->>Msg: Отправляет сообщение
    Msg->>API: Webhook: new message
    
    API->>DB: Get agent config
    DB-->>API: Agent data
    
    API->>DB: Get CRM access settings
    DB-->>API: Allowed fields
    
    API->>CRM: Get lead/contact data
    CRM-->>API: Lead/contact info
    
    API->>AI: Generate response
    Note over API,AI: Context: instructions + CRM data + message
    AI-->>API: Generated response
    
    API->>Msg: Send response
    Msg->>User: Получает ответ
    
    API->>DB: Log conversation
```

---

## 3. Кэширование и оптимизация

### 3.1 Кэшируемые данные

**CRM поля** (TTL: 1 час):
- Список полей сделок
- Список полей контактов
- Воронки и этапы
- Список пользователей

**AI модели** (TTL: 24 часа):
- Список доступных моделей
- Описания моделей

**Интеграции** (TTL: 1 час):
- Список доступных интеграций

### 3.2 Real-time обновления

**WebSocket соединения** для:
- Статус выполнения цепочек
- Уведомления о срабатывании триггеров
- Обновления статуса интеграций

---

## 4. Безопасность данных

### 4.1 Хранение учетных данных

**OAuth токены**:
- Хранятся в зашифрованном виде (AES-256)
- Автоматическое обновление refresh tokens
- Ротация токенов каждые 30 дней

**API ключи**:
- Хранятся в environment variables
- Не передаются на frontend
- Маскируются в логах

### 4.2 Права доступа

**Row Level Security (RLS)** в Supabase:
```sql
CREATE POLICY "Users can only access their own agents"
ON agents FOR ALL
USING (user_id = auth.uid());
```

---

## 5. Мониторинг и логирование

### 5.1 Логируемые события

- Все API запросы
- Срабатывания триггеров
- Выполнение цепочек
- Ошибки интеграций
- AI запросы и ответы

### 5.2 Метрики

- Количество активных агентов
- Среднее время ответа
- Успешность выполнения триггеров/цепочек
- Использование AI токенов
- Ошибки API
