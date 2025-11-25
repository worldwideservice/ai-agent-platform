-- Создание таблицы для хранения токенов Kommo OAuth
CREATE TABLE IF NOT EXISTS kommo_tokens (
  id TEXT PRIMARY KEY,
  integration_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  base_domain TEXT NOT NULL,
  api_domain TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для быстрого поиска по integration_id
CREATE INDEX IF NOT EXISTS idx_kommo_tokens_integration_id ON kommo_tokens(integration_id);
