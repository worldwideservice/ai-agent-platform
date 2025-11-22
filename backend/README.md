# 🚀 AI Agent Platform - Backend API

Backend API для платформы управления AI агентами.

## 📋 **Технологический стек**

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: express-validator

---

## ⚙️ **Установка и настройка**

### 1. Установить зависимости

```bash
cd backend
npm install
```

### 2. Настроить PostgreSQL

Установите PostgreSQL если еще не установлен:

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Скачайте с https://www.postgresql.org/download/windows/

### 3. Создать базу данных

```bash
# Войти в psql
psql postgres

# Создать базу данных
CREATE DATABASE ai_agent_platform;

# Создать пользователя (опционально)
CREATE USER aiagent WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_agent_platform TO aiagent;

# Выйти
\q
```

### 4. Настроить .env

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_agent_platform?schema=public"
JWT_SECRET=your_super_secret_key_here
PORT=3001
```

### 5. Запустить миграции Prisma

```bash
# Создать клиент Prisma
npm run prisma:generate

# Запустить миграции
npm run prisma:migrate

# Или просто push схему (для разработки)
npm run db:push
```

### 6. Запустить сервер

```bash
# Development (с hot reload)
npm run dev

# Production build
npm run build
npm start
```

Сервер запустится на `http://localhost:3001`

---

## 📚 **API Endpoints**

### **Authentication** ✅

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Логин
- `GET /api/auth/me` - Текущий пользователь (требует JWT токен)

### **Agents** ✅

- `GET /api/agents` - Получить всех агентов
- `GET /api/agents/:id` - Получить агента по ID
- `POST /api/agents` - Создать агента
- `PUT /api/agents/:id` - Обновить агента
- `DELETE /api/agents/:id` - Удалить агента
- `PATCH /api/agents/:id/toggle` - Переключить статус

### **KB Categories** ✅

- `GET /api/kb/categories` - Получить все категории (с иерархией)
- `GET /api/kb/categories/:id` - Получить категорию по ID
- `POST /api/kb/categories` - Создать категорию
- `PUT /api/kb/categories/:id` - Обновить категорию
- `DELETE /api/kb/categories/:id` - Удалить категорию

### **KB Articles** ✅

- `GET /api/kb/articles` - Получить статьи (с фильтрацией)
- `GET /api/kb/articles/:id` - Получить статью по ID
- `POST /api/kb/articles` - Создать статью
- `PUT /api/kb/articles/:id` - Обновить статью
- `DELETE /api/kb/articles/:id` - Удалить статью
- `PATCH /api/kb/articles/:id/toggle` - Переключить активность

---

## 🗄️ **Структура базы данных**

```sql
User {
  id, email, password, name, role
}

Agent {
  id, name, isActive, model, systemInstructions
  pipelineSettings, channelSettings, kbSettings (JSON)
}

KbCategory {
  id, name, parentId (иерархия)
}

KbArticle {
  id, title, content, isActive, relatedArticles[]
}
```

---

## 🛠️ **Команды разработки**

```bash
# Запуск dev сервера
npm run dev

# Билд
npm run build

# Prisma Studio (GUI для БД)
npm run prisma:studio

# Создать миграцию
npm run prisma:migrate

# Seeding БД (TODO)
npm run db:seed
```

---

## ✅ **TODO**

- [x] Базовая структура Express
- [x] Prisma schema (с поддержкой иерархии и many-to-many)
- [x] Agents CRUD (полная реализация)
- [x] Auth endpoints (register, login, me)
- [x] KB Categories CRUD (с иерархией)
- [x] KB Articles CRUD (с категориями и связями)
- [x] JWT аутентификация и middleware
- [ ] Настройка PostgreSQL базы данных
- [ ] Prisma миграции
- [ ] Validation middleware (express-validator)
- [ ] Error handling middleware
- [ ] Rate limiting
- [ ] Tests
- [ ] Docker setup

---

**Создано для AI Agent Platform** 🤖
