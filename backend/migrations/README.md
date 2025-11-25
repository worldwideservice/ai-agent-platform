# Supabase Migration Guide

## Шаг 1: Создайте Supabase проект

1. Перейдите на https://supabase.com
2. Нажмите "New Project"
3. Выберите организацию и регион (например, Europe West - Frankfurt)
4. Создайте проект с надежным паролем

## Шаг 2: Получите Connection String

1. В панели Supabase перейдите в **Settings** → **Database**
2. Найдите **Connection string** → **URI**
3. Скопируйте строку подключения в формате:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

## Шаг 3: Получите API Keys

1. В панели Supabase перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **anon/public key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...` (используйте осторожно, только на backend!)

## Шаг 4: Обновите .env файл

Откройте `backend/.env` и обновите:

```bash
# Замените SQLite на PostgreSQL
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Supabase настройки
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...ваш_anon_key
SUPABASE_SERVICE_KEY=eyJhbGci...ваш_service_role_key
```

## Шаг 5: Запустите миграцию

В Supabase перейдите в **SQL Editor** и выполните:

1. Скопируйте содержимое `001_initial_schema.sql`
2. Вставьте в SQL Editor
3. Нажмите **RUN**

Миграция создаст:
- ✅ Все таблицы с правильными типами PostgreSQL
- ✅ Расширение **pgvector** для embeddings
- ✅ Индексы для быстрого поиска
- ✅ Таблицы для Knowledge Graph (memory_nodes, memory_edges)
- ✅ Таблицы для embeddings и semantic search
- ✅ Таблицу для OAuth токенов Kommo

## Шаг 6: Проверьте создание таблиц

В Supabase перейдите в **Table Editor** и убедитесь, что созданы таблицы:
- users
- agents
- kb_categories
- kb_articles
- contacts
- deals
- triggers
- chains
- integrations
- embeddings
- memory_nodes
- memory_edges
- kommo_tokens

## Шаг 7: Включите Row Level Security (опционально)

Для production рекомендуется настроить RLS:

```sql
-- Пример RLS для таблицы agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own agents"
  ON agents FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own agents"
  ON agents FOR DELETE
  USING (auth.uid()::text = user_id);
```

## Troubleshooting

### Ошибка: "extension vector does not exist"
В SQL Editor выполните:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Ошибка подключения
Проверьте:
1. Правильность DATABASE_URL
2. Замените `[password]` на ваш реальный пароль
3. Замените `[project-ref]` на reference вашего проекта

### Миграция данных из SQLite
Если у вас уже есть данные в SQLite, используйте:
```bash
# Экспорт из SQLite
sqlite3 dev.db .dump > dump.sql

# Затем адаптируйте для PostgreSQL и импортируйте
```

## Следующие шаги

После успешной миграции:
1. Обновится `backend/src/config/database.ts` для использования Supabase
2. Приложение автоматически переключится на PostgreSQL
3. Станет доступен pgvector для семантического поиска
4. Можно будет реализовать Knowledge Graph для агента
