-- Migration: Add internal AI models settings to agent_advanced_settings
-- Purpose: Allow configuring AI models for internal operations (fact extraction, triggers, etc.)
-- Created: 2025-01-27

-- Модель для извлечения фактов о клиенте
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS fact_extraction_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Модель для оценки триггеров
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS trigger_evaluation_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Модель для AI сообщений в цепочках
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS chain_message_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Модель для генерации email
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS email_generation_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Модель для парсинга инструкций этапов
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS instruction_parsing_model TEXT DEFAULT 'openai/gpt-4o-mini';

-- Модель для анализа контента базы знаний
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS kb_analysis_model TEXT DEFAULT 'anthropic/claude-3.5-sonnet';

-- Update existing rows with default values
UPDATE agent_advanced_settings
SET
  fact_extraction_model = COALESCE(fact_extraction_model, 'openai/gpt-4o-mini'),
  trigger_evaluation_model = COALESCE(trigger_evaluation_model, 'openai/gpt-4o-mini'),
  chain_message_model = COALESCE(chain_message_model, 'openai/gpt-4o-mini'),
  email_generation_model = COALESCE(email_generation_model, 'openai/gpt-4o-mini'),
  instruction_parsing_model = COALESCE(instruction_parsing_model, 'openai/gpt-4o-mini'),
  kb_analysis_model = COALESCE(kb_analysis_model, 'anthropic/claude-3.5-sonnet')
WHERE fact_extraction_model IS NULL;
