-- Migration: Add memory settings to agent_advanced_settings
-- Purpose: Toggle memory, graph, semantic search per agent
-- Created: 2025-01-27

-- Add memory_enabled column (долгосрочная память - факты о клиенте)
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT true;

-- Add graph_enabled column (граф связей между фактами)
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS graph_enabled BOOLEAN DEFAULT true;

-- Add context_window column (количество фактов для контекста)
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS context_window INTEGER DEFAULT 20;

-- Add semantic_search_enabled column (поиск по смыслу)
ALTER TABLE agent_advanced_settings
ADD COLUMN IF NOT EXISTS semantic_search_enabled BOOLEAN DEFAULT true;

-- Update existing rows with default values
UPDATE agent_advanced_settings
SET
  memory_enabled = COALESCE(memory_enabled, true),
  graph_enabled = COALESCE(graph_enabled, true),
  context_window = COALESCE(context_window, 20),
  semantic_search_enabled = COALESCE(semantic_search_enabled, true)
WHERE memory_enabled IS NULL OR graph_enabled IS NULL;
