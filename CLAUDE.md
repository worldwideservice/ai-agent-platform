# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Core commands

### Frontend (Vite + React, root directory)

**Install dependencies**

```bash
npm install
```

**Run dev server (frontend only)**

```bash
npm run dev
```

- Default dev server runs on port `3000` (configured in `vite.config.ts`).
- API requests to `/api` are proxied to `VITE_API_URL` (defaults to `http://localhost:3001`).

**Build frontend**

```bash
npm run build
```

- Outputs a static bundle to `dist/`.
- This bundle is used by `Dockerfile.frontend` and the multi-stage `Dockerfile`.

### Backend (Express + TypeScript, `backend/`)

All backend commands are run from `backend/`.

**Install dependencies**

```bash
cd backend
npm install
```

**Local environment setup**

1. Copy and edit environment variables:

   ```bash
   cd backend
   cp .env.example .env
   ```

   Typical variables (see `backend/README.md` and `docker-compose.yml`):
   - `DATABASE_URL` – PostgreSQL connection string
   - `JWT_SECRET` – secret for JWT auth
   - `PORT` – backend HTTP port (defaults to `3001`)
   - Optional integration keys: `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `KOMMO_*`, `SMTP_*`, etc.

2. Start PostgreSQL and Redis:

   - **Via Docker Compose (recommended for dev):**

     ```bash
     cd <repo-root>
     docker compose up postgres redis
     ```

   - Or use a locally installed PostgreSQL as described in `backend/README.md`.

**Database / Prisma tooling**

From `backend/`:

```bash
# Generate Prisma client (if schema is used)
npm run prisma:generate

# Run development migrations
npm run prisma:migrate

# Push schema (development only)
npm run db:push

# Open Prisma Studio
npm run prisma:studio
```

> Note: many database access paths have been migrated to raw `pg` queries via `src/config/database.ts`. Prisma is still used primarily for schema/migration tooling.

**Run backend in dev mode**

```bash
cd backend
npm run dev
```

- Starts `src/index.ts` via `tsx` with hot reload.
- On startup it:
  - Boots Express from `src/app.ts` on `PORT`.
  - Attempts to start Redis-backed webhook workers.
  - Schedules hourly subscription checks.

**Build and run backend in production mode**

```bash
cd backend
npm run build
npm start
```

- `npm run build` runs `tsc` and outputs to `dist/`.
- `npm start` runs `node dist/index.js`.

### Docker / Compose

The project includes two Dockerfiles and a `docker-compose.yml` for local and production-like environments.

**Key services in `docker-compose.yml`**

- `postgres` – PostgreSQL 16 with persistent volume `postgres_data`.
- `redis` – Redis 7 with AOF and memory limits, volume `redis_data`.
- `backend` – Backend API container built from `backend/Dockerfile`.
- `frontend` – Nginx-based frontend serving the built SPA (`Dockerfile.frontend`).
- `app` – Combined image (backend + static frontend) built from root `Dockerfile` (enabled via the `full` profile).

**Run full stack (separate frontend + backend)**

```bash
cd <repo-root>
docker compose up --build postgres redis backend frontend
```

- Frontend exposed on `${FRONTEND_PORT:-3000}` (default `3000`).
- Backend exposed on `${BACKEND_PORT:-3001}` (default `3001`).

**Run all-in-one app image**

```bash
cd <repo-root>
docker compose --profile full up --build
```

- Uses the multi-stage `Dockerfile` to build frontend + backend into a single container `app` on port `3001`.

### Linting and tests

- As of this snapshot, neither the root `package.json` nor `backend/package.json` define `lint` or `test` scripts.
- Before running linting or tests, add the appropriate scripts (for example, using ESLint/Vitest/Jest) to the relevant `package.json`.

## High-level architecture

### Overview

This repository implements a full-stack AI agent management platform with:

- A **SPA frontend** (Vite + React + TypeScript) in the repo root.
- An **Express + TypeScript backend** in `backend/`.
- A **PostgreSQL** database (with pgvector and Supabase-compatible migrations) and **Redis** for queues.
- A domain model centered around **agents**, **knowledge base (KB)**, **CRM entities**, **training library**, **conversations**, **subscriptions/billing**, and **integrations** (Kommo, Google, email).

The frontend and backend are tightly aligned by feature: for most route modules under `backend/src/routes`, there is a corresponding service module under `src/services/api` on the frontend.

### Frontend architecture

**Directory structure (mixed layout)**

The frontend uses a mixed directory structure:
- **Root directory**: `index.tsx`, `App.tsx`, `pages/`, `components/`, `types.ts`, `index.css`
- **`src/` directory**: `contexts/`, `services/`, `i18n/`, `types/`

**Entry point and providers**

- `index.tsx` (in root) is the main entry point:
  - Initializes global styles (`index.css`) and i18n (`src/i18n`).
  - Wraps the app with providers:
    - `AuthProvider` (`src/contexts/AuthContext.tsx`) for authentication and JWT handling.
    - `SubscriptionProvider` (`src/contexts/SubscriptionContext.tsx`) for plan/limits.
    - `ToastProvider` (`src/contexts/ToastContext.tsx`) for global toast notifications.
  - Renders `<App />` inside a `ToastWrapper` that attaches the `ToastContainer`.

**Application shell and navigation**

- `App.tsx` (in root) implements the overall application shell:
  - Renders `Sidebar` and `Header` from `components/`.
  - Maintains `currentPage` state (type `Page` from `types.ts`) and manually switches views with a `switch` instead of using a router library.
  - Persists some navigation state (current page, selected entities) in `localStorage`.
  - Orchestrates data loading for key domains:
    - Agents (via `agentService`).
    - Knowledge base categories and articles (via `kbService`).
    - Billing/subscription (via `billingService`).
    - Notifications (via `notificationsService`).
  - Handles creation/editing/deletion flows for agents, KB categories, KB articles, and ties them to toast notifications and confirmation modals.

**Pages and components**

- High-level pages live in `pages/` (root directory) and reflect main navigation entries:
  - Core user flows: `Dashboard`, `Agents`, `AgentCreate`, `AgentEditor`, `Chat`, `Settings`, `Billing`.
  - Knowledge base: `KbCategories`, `KbCategoryCreate`, `KbArticles`, `KbArticleCreate`.
  - Training library: `TrainingRoles`, `TrainingSources`.
  - Admin area: `AdminDashboard`, `AdminUsers`, `AdminAgents`, `AdminSystem`.
  - Auth page: `src/pages/Auth.tsx` (exception - located in src/).
- Shared/layout components live in `components/` (root directory):
  - Shell: `Sidebar`, `Header`, `PlanRestriction`.
  - Agent-related UI: `AgentBasicSettings`, `AgentAdvancedSettings`, `AgentDealsContacts`.
  - Chat and UI primitives: `components/chat`, `components/ui`, `Toast`, `ConfirmationModal`.

**API layer and data flow**

- All HTTP access is centralized in `src/services/api`:
  - `apiClient.ts` sets up the HTTP client (typically Axios) with base URL and interceptors.
  - Feature-specific services map to backend REST endpoints, for example:
    - `agent.service.ts` → `/api/agents` routes.
    - `kb.service.ts` → `/api/kb/categories`, `/api/kb/articles`, `/api/kb/import`.
    - `crm.service.ts`, `contacts.service.ts`, `deals.service.ts` → `/api/contacts`, `/api/deals`, `/api/crm`.
    - `billing.service.ts`, `subscription.service.ts` → `/api/billing` and subscription limits.
    - `integrations.service.ts`, `kommo.service.ts`, `google.service.ts`, `google-calendar.service.ts` → `/api/kommo`, `/api/google`, `/api/google-calendar`.
    - `memory.service.ts` → `/api/agents/.../memory` endpoints.
    - `training.service.ts` → `/api/training`.
    - `notifications.service.ts` → `/api/notifications`.
    - `test-chat.service.ts`, `test.service.ts` → `/api/test-chat`, `/api/test` (development/testing helpers).
- Frontend **never talks directly to external providers** (OpenAI/OpenRouter/Gemini/Kommo/Google); those are handled server-side. The client strictly uses the backend API.

**State and UX concerns**

- `AuthContext` manages login, stores user/token, and exposes `isAuthenticated`/`isLoading` used in `App.tsx` to decide between `<Auth />` and the main app.
- `SubscriptionContext` exposes the current plan and remaining quota; `App.tsx` uses this to show trial expiration toasts.
- `ToastContext` provides `showToast`, `toasts`, and `removeToast`, used across pages and services for user feedback.
- `i18n` (via `react-i18next`) is used throughout; many user-facing strings are in Russian, and toast/notification payloads often pass translation keys instead of plain text.

### Backend architecture

**Process entrypoint and lifecycle**

- `backend/src/index.ts` is the main entrypoint:
  - Loads environment via `dotenv/config`.
  - Imports the configured Express app from `src/app.ts`.
  - Starts the HTTP server on `PORT` (default `3001`).
  - Attempts to start webhook workers via `startWebhookWorkers` from `src/workers/webhook.worker.ts` (using Redis and BullMQ).
  - Schedules an hourly job that runs `subscriptionService.processExpiredSubscriptions()` to manage:
    - Moving users into grace periods.
    - Expiring subscriptions.
    - Ending trials.
  - Sets up graceful shutdown handlers for `SIGTERM` and `SIGINT`, stopping workers and clearing timers.

**Express app configuration (`backend/src/app.ts`)**

- **Security and infrastructure**
  - `app.set('trust proxy', 1)` for correct IP detection behind reverse proxies.
  - CORS configured using `CORS_ORIGIN` or defaults to local dev hosts (5173, 3000, 3002); allows credentials and standard HTTP methods.
  - Adds basic security headers (no-sniff, frame options, XSS protection, referrer policy) and removes `X-Powered-By`.
  - Global rate limiting via `globalLimiter`, with specialized limiters for auth (`authLimiter`), generic API calls (`apiLimiter`), chat (`chatLimiter`), and webhooks (`webhookLimiter`).
  - Logging:
    - `morgan("combined")` with a custom logger stream in production.
    - `morgan("dev")` in development.
    - Additional structured logging of request duration via `logRequest`, excluding `/health`.
  - Body parsing with size limits (JSON and URL-encoded, 10MB).

- **Health and monitoring**
  - `GET /health` – basic liveness check with status, timestamp, uptime, and version.
  - `GET /health/stats` – extended stats including process memory, queue stats (`getQueueStats`), and OpenRouter usage metrics (`getOpenRouterStats`).

- **Route registration** (core structure)

  All API routes are mounted under `/api/...` and commonly wrapped with `apiLimiter` and `authMiddleware` (inside route modules). Key groupings:

  - **Authentication & user profile**
    - `/api/auth` → `routes/auth.ts` (login, registration, `me`, etc.) with stricter `authLimiter`.
    - `/api/profile` → `routes/profile.ts` for user profile and settings.
    - `/api/models` → `routes/models.ts` exposes available LLM models and providers.

  - **Agents and automation**
    - `/api/agents` → `routes/agents.ts` for agent CRUD (all protected by `authMiddleware`).
    - `/api/agents` (additional routes):
      - `routes/triggers.ts` – trigger rules per agent.
      - `routes/chains.ts` – multi-step chains / workflows.
      - `routes/integrations.ts` – per-agent integration settings.
      - `routes/agent-settings.ts` – advanced agent-level settings.
      - `routes/memory.ts` – semantic memory / knowledge graph.
      - `routes/agent-documents.ts` – file uploads and document management per agent.

  - **Knowledge Base**
    - `/api/kb/categories` → `routes/kb-categories.ts` for hierarchical categories.
    - `/api/kb/articles` → `routes/kb-articles.ts` for articles with many-to-many relations to categories.
    - `/api/kb/import` → `routes/kb-import.ts` for importing KB content from documents.

  - **CRM and sales data**
    - `/api/contacts` → `routes/contacts.ts` for contacts.
    - `/api/deals` → `routes/deals.ts` for deals / opportunities.
    - `/api/crm` → `routes/crm.ts` for higher-level CRM actions and sync.

  - **Other application features**
    - `/api/settings` → `routes/settings.ts` for user/platform settings.
    - `/api/analytics` → `routes/analytics.ts` for metrics and reports.
    - `/api/billing` → `routes/billing.ts` for subscription plans, usage, trial logic.
    - `/api/training` → `routes/training.ts` for training sources and roles.
    - `/api/notifications` → `routes/notifications.ts` for in-app notifications.
    - `/api/conversations` → `routes/conversations.ts` for long-lived conversations with leads.

  - **Chat API**
    - `/api/chat` → `routes/chat.ts` for main chat interactions (with `chatLimiter`).
    - `/api/test-chat` → `routes/test-chat.ts` for test/sandbox chats.

  - **Integrations**
    - `/api/kommo` → `routes/kommo.ts` for Kommo CRM OAuth, webhooks, and data sync.
    - `/api/google` → `routes/google.ts` for Google OAuth tokens.
    - `/api/google-calendar` → `routes/google-calendar.ts` for meeting scheduling, employee calendars, etc.

  - **Admin & diagnostics**
    - `/api/admin` → `routes/admin.ts` for admin dashboards and management endpoints.
    - `/api/test` → `routes/test.ts` – enabled only when `NODE_ENV !== 'production'`.

  - **Public file access**
    - `GET /api/public/documents/:documentId` → `getPublicDocumentFile` in `controllers/agent-documents.ts` for serving publicly accessible documents (e.g., Kommo file links).

  - After all routes:
    - `notFoundHandler` returns 404 JSON for unknown routes.
    - `errorHandler` centralizes error formatting and logging.

**Persistence and data access (`backend/src/config/database.ts`)**

- Defines a shared `pg.Pool` using `DATABASE_URL`.
- Provides a set of repository-like objects for each domain entity, each exposing methods like `findMany`, `findFirst`, `create`, `update`, `delete`, `count`, and sometimes `upsert` or relation-loading helpers.
- Notable models include:
  - **Core auth + usage**: `user`, `userSettings`, `notification`.
  - **Agents and chat**: `agent`, `chatLog`, `testConversation` (and nested `test_conversation_messages`).
  - **Knowledge base**: `kbCategory`, `kbArticle` (with optional `articleCategories` join).
  - **CRM**: `contact`, `deal`, `leadConversation`, `leadMessage`.
  - **Automations & integrations**: `trigger`, `triggerAction`, `integration`, `kommoToken`, `googleToken`, `googleCalendarEmployee`.
  - **Training**: `trainingSource`, `trainingRole`.
- A helper `toCamelCase` converts snake_case DB columns to camelCase properties, ensuring the backend and frontend share consistent naming conventions.

**Services, workers, and background tasks**

- `src/services` builds business logic on top of the repositories, including:
  - Chat orchestration across OpenRouter/OpenAI/Gemini providers.
  - Webhook queue management (`webhook-queue.service`), including statistics used by `/health/stats`.
  - Chain execution (`chain-executor.service`) for scheduled automation steps.
  - Billing and subscription management (`subscription.service`).

- `src/workers/webhook.worker.ts` defines BullMQ workers consuming jobs (typically Kommo/CRM-related webhooks) from Redis. `startWebhookWorkers` attempts to connect to Redis and start workers; `stopWebhookWorkers` handles graceful shutdown.

- `src/controllers` implement request-level logic (validation, calling services, shaping responses). `src/routes` modules are intentionally thin glue between Express and controllers.

### Data model and feature alignment

At a high level, the platform’s features align across frontend and backend as follows:

- **Users & Auth**: JWT-based authentication, roles, and plan/usage limits. Frontend uses `AuthContext`; backend uses `user`/`userSettings`/`subscriptionService` and `/api/auth`, `/api/profile`, `/api/billing`.
- **Agents**: Configurable AI agents with per-agent settings (models, instructions, CRM bindings, KB preferences). Managed via `/api/agents` and associated subroutes, with frontend UIs in `pages/Agents.tsx`, `pages/AgentCreate.tsx`, `pages/AgentEditor.tsx` and `components/Agent*` (all in root directory).
- **Knowledge Base**: Hierarchical categories and articles, article attachments, active flags, and relations. Frontend management in `KbCategories`, `KbCategoryCreate`, `KbArticles`, `KbArticleCreate`; backend via `kbCategory`/`kbArticle` repos and `/api/kb/*` routes.
- **CRM & Leads**: Contacts and deals (with fields such as pipeline, stage, tags), lead conversations and messages, plus integrations to external CRMs (Kommo). Used by agents to automate outreach and follow-up.
- **Training Library**: `trainingSource` and `trainingRole` entities define reusable content and roles that inform agent behavior. Managed via `/api/training` and corresponding training pages.
- **Conversations & Chat**: Normal user chat and test chat flows persist messages and logs for analysis and debugging.
- **Notifications & Settings**: Server-side notifications and per-user settings feed into frontend toast and badge UIs, particularly around trial/billing and agent operations.

This alignment means that when adding or modifying a feature, you will usually need to touch:

1. One or more **backend route + controller + repository** combinations.
2. The corresponding **frontend service module** in `src/services/api`.
3. One or more **pages/components** that consume that service.

Keeping these three layers in sync is key to successfully extending the platform.
