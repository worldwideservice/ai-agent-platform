# Дорожная карта реализации AI Agent Platform

## Текущий статус проекта

### ✅ Что уже готово:

1. **Frontend (React + TypeScript + Tailwind CSS)**
   - ✅ Полная UI/UX верстка всех 11 страниц
   - ✅ Компоненты: Sidebar, Header, Toast, Modal
   - ✅ Формы создания/редактирования
   - ✅ Таблицы с фильтрацией и сортировкой
   - ✅ Dark mode поддержка
   - ✅ Responsive дизайн
   - ✅ LocalStorage для хранения данных

2. **Документация**
   - ✅ Полное описание UI элементов
   - ✅ Спецификация бэкенда
   - ✅ Структура БД (23 таблицы)
   - ✅ API endpoints (60+ endpoints)

3. **Демо-функционал**
   - ✅ Чат с Gemini AI (реальная интеграция)
   - ✅ CRUD операции через localStorage
   - ✅ Навигация между страницами

---

## Что нужно реализовать

### PHASE 1: Backend Foundation (4-6 недель)

#### 1.1 Setup Infrastructure
**Задачи:**
- [ ] Выбрать стек: Node.js/Express или Python/FastAPI или Go
- [ ] Setup PostgreSQL database
- [ ] Setup Redis для кэширования и очередей
- [ ] Setup S3/CloudStorage для файлов
- [ ] Настроить Docker + docker-compose
- [ ] CI/CD pipeline (GitHub Actions)

**Технологии:**
```yaml
Backend: Node.js + Express + TypeScript
Database: PostgreSQL 15+
Cache/Queue: Redis
File Storage: AWS S3 / MinIO
Search: PostgreSQL + pgvector extension
```

**Файлы для создания:**
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── s3.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.ts
├── migrations/
├── seeds/
├── docker-compose.yml
└── Dockerfile
```

---

#### 1.2 Authentication System
**Задачи:**
- [ ] JWT token generation/validation
- [ ] Register endpoint
- [ ] Login endpoint
- [ ] Password reset flow
- [ ] Refresh token mechanism
- [ ] Email verification

**Endpoints:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
```

**Примерная оценка:** 1 неделя

---

#### 1.3 User Management
**Задачи:**
- [ ] User model + migrations
- [ ] Profile CRUD operations
- [ ] Avatar upload
- [ ] Settings management
- [ ] Notifications system

**Endpoints:**
```
GET    /api/user/profile
PATCH  /api/user/profile
POST   /api/user/avatar
PATCH  /api/user/settings
GET    /api/notifications
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
```

**Примерная оценка:** 1 неделя

---

#### 1.4 Database Migrations
**Задачи:**
- [ ] Создать все 23 таблицы
- [ ] Создать индексы
- [ ] Настроить внешние ключи
- [ ] Seed данные для тестирования

**Файлы:**
```
migrations/
├── 001_create_users.sql
├── 002_create_agents.sql
├── 003_create_agent_pipelines.sql
├── 004_create_agent_channels.sql
├── 005_create_agent_knowledge_base.sql
├── 006_create_agent_crm_access.sql
├── 007_create_agent_update_rules.sql
├── 008_create_triggers.sql
├── 009_create_trigger_actions.sql
├── 010_create_chains.sql
├── 011_create_chain_steps.sql
├── 012_create_chain_step_actions.sql
├── 013_create_integrations.sql
├── 014_create_kb_categories.sql
├── 015_create_kb_articles.sql
├── 016_create_kb_article_categories.sql
├── 017_create_kb_article_relations.sql
├── 018_create_kb_article_files.sql
├── 019_create_conversations.sql
├── 020_create_messages.sql
├── 021_create_notifications.sql
├── 022_create_audit_log.sql
└── 023_create_usage_statistics.sql
```

**Примерная оценка:** 1-2 недели

---

### PHASE 2: Core Features (6-8 недель)

#### 2.1 Agents Management
**Задачи:**
- [ ] Agents CRUD
- [ ] Agent activation/deactivation
- [ ] Agent duplication
- [ ] Agent pipelines management
- [ ] Agent channels configuration
- [ ] Agent KB configuration
- [ ] Agent CRM access settings
- [ ] Update rules CRUD

**Endpoints:**
```
# Agents
GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id
POST   /api/agents/:id/duplicate
PATCH  /api/agents/:id/toggle

# Pipelines
GET    /api/agents/:id/pipelines
PUT    /api/agents/:id/pipelines

# Channels
GET    /api/agents/:id/channels
PUT    /api/agents/:id/channels

# Knowledge Base
GET    /api/agents/:id/knowledge-base
PUT    /api/agents/:id/knowledge-base

# CRM Access
GET    /api/agents/:id/crm-access
PUT    /api/agents/:id/crm-access

# Update Rules
GET    /api/agents/:id/update-rules
POST   /api/agents/:id/update-rules
PATCH  /api/agents/:id/update-rules/:ruleId
DELETE /api/agents/:id/update-rules/:ruleId
```

**Примерная оценка:** 2 недели

---

#### 2.2 Triggers System
**Задачи:**
- [ ] Triggers CRUD
- [ ] Trigger condition evaluation engine
- [ ] Trigger actions execution
- [ ] Trigger run limit tracking
- [ ] Trigger logging

**Компоненты:**
```typescript
// Trigger Engine
class TriggerEngine {
  async evaluateCondition(condition: string, context: any): Promise<boolean>
  async executeActions(actions: TriggerAction[], context: any): Promise<void>
  async checkRunLimit(triggerId: string): Promise<boolean>
}
```

**Примерная оценка:** 2 недели

---

#### 2.3 Chains System
**Задачи:**
- [ ] Chains CRUD
- [ ] Chain scheduling logic
- [ ] Chain execution engine
- [ ] Working hours validation
- [ ] Chain steps queue management

**Компоненты:**
```typescript
// Chain Scheduler
class ChainScheduler {
  async scheduleStep(chainId: string, stepId: string, delay: number): Promise<void>
  async executeStep(stepId: string): Promise<void>
  async checkWorkingHours(schedule: WorkingDay[]): Promise<boolean>
}
```

**Примерная оценка:** 2 недели

---

#### 2.4 Knowledge Base
**Задачи:**
- [ ] Categories CRUD с иерархией
- [ ] Articles CRUD
- [ ] File upload для статей
- [ ] Full-text search (PostgreSQL)
- [ ] Semantic search (embeddings)
- [ ] Article relations

**Ключевой функционал:**
```typescript
// Semantic Search
class KnowledgeBaseService {
  async generateEmbedding(text: string): Promise<number[]>
  async searchArticles(query: string, categoryIds?: string[]): Promise<Article[]>
  async getRelatedArticles(articleId: number): Promise<Article[]>
}
```

**Примерная оценка:** 2 недели

---

### PHASE 3: AI Integration (4-6 недель)

#### 3.1 AI Models Integration
**Задачи:**
- [ ] OpenAI API integration
- [ ] Google Gemini API integration
- [ ] Claude API integration (опционально)
- [ ] Model selection logic
- [ ] Token usage tracking
- [ ] Cost calculation

**Файлы:**
```
src/services/ai/
├── openai.service.ts
├── gemini.service.ts
├── claude.service.ts
├── model-selector.ts
└── token-tracker.ts
```

**Примерная оценка:** 2 недели

---

#### 3.2 Message Processing Engine
**Задачи:**
- [ ] Incoming message handler
- [ ] Context builder (история + CRM + KB)
- [ ] Prompt engineering
- [ ] Response generation
- [ ] Message approval workflow
- [ ] Response delay implementation

**Ключевой компонент:**
```typescript
class MessageProcessor {
  async processIncomingMessage(message: Message): Promise<void> {
    // 1. Get conversation context
    const context = await this.buildContext(message);

    // 2. Check triggers
    const triggeredAction = await this.checkTriggers(message);
    if (triggeredAction) return;

    // 3. Search knowledge base
    const kbArticles = await this.searchKB(message.content);

    // 4. Build prompt
    const prompt = await this.buildPrompt(message, context, kbArticles);

    // 5. Generate AI response
    const response = await this.generateResponse(prompt);

    // 6. Apply update rules
    await this.applyUpdateRules(message, response);

    // 7. Send or queue for approval
    if (agent.checkBeforeSend) {
      await this.queueForApproval(response);
    } else {
      await this.sendMessage(response);
    }

    // 8. Check chains
    await this.checkChains(message);
  }
}
```

**Примерная оценка:** 2-3 недели

---

#### 3.3 Knowledge Base Search
**Задачи:**
- [ ] Embeddings generation для всех статей
- [ ] Semantic search implementation
- [ ] Hybrid search (semantic + full-text)
- [ ] Relevance scoring
- [ ] Context window optimization

**Примерная оценка:** 1 неделя

---

### PHASE 4: CRM Integration (4-5 недель)

#### 4.1 Kommo Integration
**Задачи:**
- [ ] OAuth flow
- [ ] Webhook registration
- [ ] Webhook handlers
- [ ] API methods (leads, contacts, messages)
- [ ] Data sync
- [ ] Field mapping

**Endpoints:**
```
POST   /api/integrations/kommo/connect
DELETE /api/integrations/kommo/disconnect
POST   /api/webhooks/kommo/message
POST   /api/webhooks/kommo/lead-status-changed
POST   /api/webhooks/kommo/contact-updated
```

**Примерная оценка:** 2-3 недели

---

#### 4.2 Update Rules Engine
**Задачи:**
- [ ] Rule evaluation with AI
- [ ] Value extraction from messages
- [ ] CRM field update logic
- [ ] Overwrite handling
- [ ] Error handling и rollback

**Компонент:**
```typescript
class UpdateRulesEngine {
  async evaluateRule(rule: UpdateRule, message: string): Promise<{
    matched: boolean;
    extractedValue: any;
  }>

  async applyRule(rule: UpdateRule, value: any, dealId: string): Promise<void>
}
```

**Примерная оценка:** 1-2 недели

---

### PHASE 5: Additional Features (3-4 недели)

#### 5.1 Billing & Subscriptions
**Задачи:**
- [ ] Stripe integration
- [ ] Plans management
- [ ] Subscription flow
- [ ] Usage tracking
- [ ] Quota enforcement
- [ ] Invoice generation

**Endpoints:**
```
GET  /api/billing/subscription
POST /api/billing/subscribe
POST /api/billing/cancel
POST /api/billing/change-plan
GET  /api/billing/invoices
```

**Примерная оценка:** 2 недели

---

#### 5.2 Statistics & Analytics
**Задачи:**
- [ ] Dashboard metrics aggregation
- [ ] Chart data generation
- [ ] Usage statistics collection
- [ ] Agent performance metrics
- [ ] Conversation analytics

**Endpoints:**
```
GET /api/statistics/dashboard
GET /api/statistics/usage
GET /api/statistics/agents/:id
```

**Примерная оценка:** 1 неделя

---

#### 5.3 Notifications System
**Задачи:**
- [ ] In-app notifications
- [ ] Email notifications
- [ ] Push notifications (опционально)
- [ ] Notification templates
- [ ] Notification preferences

**Примерная оценка:** 1 неделя

---

### PHASE 6: Real-time & Performance (2-3 недели)

#### 6.1 WebSocket Implementation
**Задачи:**
- [ ] Socket.io setup
- [ ] Real-time message updates
- [ ] Agent status updates
- [ ] Notification push
- [ ] Conversation updates

**Примерная оценка:** 1 неделя

---

#### 6.2 Queue System
**Задачи:**
- [ ] Bull/BullMQ setup
- [ ] Message processing queue
- [ ] AI generation queue
- [ ] Chain execution queue
- [ ] KB indexing queue
- [ ] Notification queue

**Примерная оценка:** 1 неделя

---

#### 6.3 Caching Layer
**Задачи:**
- [ ] Redis caching strategy
- [ ] Cache invalidation
- [ ] Cache warming
- [ ] Performance optimization

**Примерная оценка:** 1 неделя

---

### PHASE 7: Frontend-Backend Integration (2-3 недели)

#### 7.1 API Client
**Задачи:**
- [ ] Axios configuration
- [ ] API client service
- [ ] Error handling
- [ ] Request/response interceptors
- [ ] Token refresh logic

**Файл:**
```typescript
// src/services/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401, refresh token, retry
  }
);
```

---

#### 7.2 State Management
**Задачи:**
- [ ] Переход с localStorage на API
- [ ] Context API или Redux/Zustand
- [ ] Loading states
- [ ] Error handling
- [ ] Optimistic updates

**Примерная оценка:** 1 неделя

---

#### 7.3 Real-time Updates
**Задачи:**
- [ ] Socket.io client
- [ ] Real-time message rendering
- [ ] Notification updates
- [ ] Agent status updates

**Примерная оценка:** 1 неделя

---

### PHASE 8: Testing & Quality (3-4 недели)

#### 8.1 Backend Testing
**Задачи:**
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing
- [ ] Security testing

**Примерная оценка:** 2 недели

---

#### 8.2 Frontend Testing
**Задачи:**
- [ ] Component tests (React Testing Library)
- [ ] Integration tests
- [ ] E2E tests (Playwright/Cypress)

**Примерная оценка:** 1-2 недели

---

### PHASE 9: Deployment & DevOps (2-3 недели)

#### 9.1 Infrastructure Setup
**Задачи:**
- [ ] Production server setup
- [ ] Database setup + backups
- [ ] Redis cluster
- [ ] S3 buckets
- [ ] CDN configuration
- [ ] SSL certificates
- [ ] Domain setup

**Примерная оценка:** 1 неделя

---

#### 9.2 Monitoring & Logging
**Задачи:**
- [ ] Logging system (Winston/Pino)
- [ ] Error tracking (Sentry)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Alerts setup
- [ ] Performance monitoring

**Примерная оценка:** 1 неделя

---

#### 9.3 CI/CD Pipeline
**Задачи:**
- [ ] GitHub Actions workflows
- [ ] Automated tests
- [ ] Automated deployment
- [ ] Database migrations
- [ ] Rollback strategy

**Примерная оценка:** 1 неделя

---

## Приоритизация функционала

### MVP (Minimum Viable Product) - 12-16 недель

**Must Have:**
1. ✅ Authentication (register, login, JWT)
2. ✅ User management (profile, settings)
3. ✅ Agents CRUD
4. ✅ Basic agent configuration (instructions, model)
5. ✅ Chat with AI (OpenAI/Gemini)
6. ✅ Knowledge Base (categories + articles)
7. ✅ Simple semantic search
8. ✅ Message processing engine
9. ✅ Basic CRM integration (Kommo)
10. ✅ Billing (Stripe + plans)

**Can Wait:**
- Triggers system
- Chains system
- Advanced analytics
- Multiple integrations
- Real-time updates

---

## Технический стек

### Backend
```yaml
Runtime: Node.js 20+
Framework: Express.js + TypeScript
Database: PostgreSQL 15+ (с pgvector extension)
Cache: Redis 7+
Queue: Bull/BullMQ
File Storage: AWS S3 / MinIO
Search: PostgreSQL Full-text + pgvector
Authentication: JWT + bcrypt
Validation: Zod / Joi
ORM: Prisma / TypeORM
Testing: Jest + Supertest
```

### Frontend (уже реализовано)
```yaml
Framework: React 18 + TypeScript
Styling: Tailwind CSS
Icons: Lucide React
Charts: Recharts
State: Context API (или Zustand)
API Client: Axios
Real-time: Socket.io-client
Testing: React Testing Library + Playwright
```

### DevOps
```yaml
Containerization: Docker + docker-compose
CI/CD: GitHub Actions
Hosting: AWS / DigitalOcean / Vercel
Monitoring: Prometheus + Grafana
Logging: Winston + CloudWatch
Error Tracking: Sentry
```

---

## Оценка времени и ресурсов

### Команда (идеально):
- 1 Backend Developer (Senior)
- 1 Frontend Developer (Middle/Senior) - для интеграции
- 1 DevOps Engineer (Part-time)
- 1 QA Engineer (Part-time)

### Timeline:

**MVP (Минимальный продукт):**
- Срок: 12-16 недель
- Функционал: Auth + Agents + Chat + KB + Basic CRM
- Стоимость: ~$40,000 - $60,000

**Full Platform (Полная версия):**
- Срок: 24-30 недель
- Функционал: MVP + Triggers + Chains + Analytics + Integrations
- Стоимость: ~$80,000 - $120,000

### Solo Developer (если делать одному):
- MVP: 6-9 месяцев
- Full: 12-18 месяцев

---

## Риски и вызовы

### Технические риски:
1. **AI API costs** - может быть дорого при масштабировании
   - Решение: Кэширование ответов, оптимизация промптов
2. **Performance** - обработка большого количества сообщений
   - Решение: Queue system, horizontal scaling
3. **CRM integration complexity** - разные CRM имеют разные API
   - Решение: Adapter pattern, тестирование

### Бизнес-риски:
1. **Competition** - много подобных решений
   - Решение: Уникальные фичи, лучший UX
2. **Customer acquisition** - как привлекать клиентов
   - Решение: Freemium модель, контент-маркетинг

---

## Следующие шаги

### Немедленно (эта неделя):
1. ✅ Выбрать backend стек
2. ✅ Setup project structure
3. ✅ Создать database schema
4. ✅ Настроить Docker environment
5. ✅ Начать с authentication

### Краткосрочно (2-4 недели):
1. ✅ Завершить authentication
2. ✅ Реализовать User management
3. ✅ Создать Agents CRUD
4. ✅ Интеграция с OpenAI API
5. ✅ Базовый chat функционал

### Среднесрочно (1-3 месяца):
1. ✅ Knowledge Base implementation
2. ✅ Message processing engine
3. ✅ CRM integration (Kommo)
4. ✅ Billing system
5. ✅ Frontend-backend integration

---

## Чек-лист для старта разработки

### Infrastructure:
- [ ] Создать GitHub repository
- [ ] Setup Docker + docker-compose
- [ ] Настроить PostgreSQL database
- [ ] Настроить Redis
- [ ] Setup S3/MinIO для файлов
- [ ] Создать .env.example

### Backend Setup:
- [ ] Initialize Node.js project
- [ ] Install dependencies
- [ ] Setup TypeScript
- [ ] Configure ESLint + Prettier
- [ ] Setup project structure
- [ ] Create first migration (users table)

### API Development:
- [ ] Implement auth endpoints
- [ ] Implement user endpoints
- [ ] Create API documentation (Swagger)
- [ ] Setup rate limiting
- [ ] Setup error handling

### Testing:
- [ ] Write first unit test
- [ ] Setup test database
- [ ] Configure Jest
- [ ] Add test scripts to package.json

### Documentation:
- [ ] README.md с setup instructions
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide

---

## Полезные ресурсы

### API Documentation:
- OpenAI API: https://platform.openai.com/docs
- Gemini API: https://ai.google.dev/docs
- Kommo API: https://www.amocrm.ru/developers/content/api/api
- Stripe API: https://stripe.com/docs/api

### Libraries:
- Bull Queue: https://github.com/OptimalBits/bull
- Prisma ORM: https://www.prisma.io/
- Socket.io: https://socket.io/
- pgvector: https://github.com/pgvector/pgvector

### Tutorials:
- JWT Authentication: https://jwt.io/introduction
- PostgreSQL Full-text: https://www.postgresql.org/docs/current/textsearch.html
- Vector Search: https://github.com/pgvector/pgvector#getting-started

---

**Создано:** 21 ноября 2025
**Версия:** 1.0
**Автор:** Claude Code

---

## Резюме

У вас есть **полностью готовый frontend** и **детальная спецификация backend**.

Для запуска полноценной платформы нужно:
1. Выбрать backend стек (рекомендую Node.js + Express + TypeScript)
2. Создать базу данных (23 таблицы уже спроектированы)
3. Реализовать API (60+ endpoints уже спроектированы)
4. Интегрировать frontend с backend (заменить localStorage на API)
5. Добавить AI processing engine
6. Настроить integrations (CRM, AI models)
7. Deploy и тестирование

**Оценка для MVP: 12-16 недель** с командой или **6-9 месяцев** solo.
