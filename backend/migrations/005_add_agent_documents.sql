-- Миграция: Добавление таблицы agent_documents
-- Дата: 2025-11-27
-- Описание: Таблица для хранения документов агента, которые он может отправлять клиентам

-- Создаем таблицу agent_documents
CREATE TABLE IF NOT EXISTS agent_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    thumbnail_key TEXT,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_agent_documents_agent_id ON agent_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_documents_is_enabled ON agent_documents(is_enabled);

-- Добавляем поле allow_all_documents в настройки агента (kbSettings будет использоваться)
-- Структура kbSettings уже содержит JSON, туда добавим новые поля через код:
-- allowAllDocuments: boolean - разрешить все документы или выбранные
-- Это будет обрабатываться на уровне приложения

COMMENT ON TABLE agent_documents IS 'Документы агента для отправки клиентам (PDF, DOCX, изображения и т.д.)';
COMMENT ON COLUMN agent_documents.file_name IS 'Оригинальное имя файла';
COMMENT ON COLUMN agent_documents.file_type IS 'Расширение файла (pdf, docx, jpg и т.д.)';
COMMENT ON COLUMN agent_documents.mime_type IS 'MIME тип файла';
COMMENT ON COLUMN agent_documents.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN agent_documents.storage_key IS 'Уникальное имя файла на диске';
COMMENT ON COLUMN agent_documents.thumbnail_key IS 'Путь к миниатюре (для предпросмотра)';
COMMENT ON COLUMN agent_documents.is_enabled IS 'Доступен ли документ для отправки агентом';
