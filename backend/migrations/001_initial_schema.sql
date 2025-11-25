-- AI Agent Platform - PostgreSQL Migration
-- Created: 2025-01-23

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Billing
  current_plan TEXT DEFAULT 'trial' NOT NULL,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  responses_used INTEGER DEFAULT 0 NOT NULL,
  responses_limit INTEGER DEFAULT 5000 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  model TEXT DEFAULT 'Google Gemini 2.5 Flash' NOT NULL,
  system_instructions TEXT,

  -- Settings (JSON)
  pipeline_settings JSONB,
  channel_settings JSONB,
  kb_settings JSONB,

  -- CRM
  crm_type TEXT,
  crm_connected BOOLEAN DEFAULT false NOT NULL,
  crm_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- KB Categories table
CREATE TABLE IF NOT EXISTS kb_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES kb_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_categories_user_id ON kb_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_categories_parent_id ON kb_categories(parent_id);

-- KB Articles table
CREATE TABLE IF NOT EXISTS kb_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  related_articles TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_user_id ON kb_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_is_active ON kb_articles(is_active);

-- Article Categories (many-to-many)
CREATE TABLE IF NOT EXISTS article_categories (
  article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,

  PRIMARY KEY (article_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_article_categories_article_id ON article_categories(article_id);
CREATE INDEX IF NOT EXISTS idx_article_categories_category_id ON article_categories(category_id);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags JSONB,
  custom_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  amount DECIMAL(10, 2),
  stage TEXT NOT NULL,
  pipeline TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stop_on_reply BOOLEAN DEFAULT false NOT NULL,
  resume_time INTEGER DEFAULT 30 NOT NULL,
  resume_unit TEXT DEFAULT 'дней' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_agent_id ON chat_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);

-- Triggers table
CREATE TABLE IF NOT EXISTS triggers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  condition TEXT NOT NULL,
  cancel_message TEXT,
  run_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_triggers_agent_id ON triggers(agent_id);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);

-- Trigger Actions table
CREATE TABLE IF NOT EXISTS trigger_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trigger_id TEXT NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trigger_actions_trigger_id ON trigger_actions(trigger_id);

-- Chains table
CREATE TABLE IF NOT EXISTS chains (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  condition_type TEXT NOT NULL,
  condition_exclude TEXT,
  run_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chains_agent_id ON chains(agent_id);
CREATE INDEX IF NOT EXISTS idx_chains_is_active ON chains(is_active);

-- Chain Conditions table
CREATE TABLE IF NOT EXISTS chain_conditions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_conditions_chain_id ON chain_conditions(chain_id);

-- Chain Steps table
CREATE TABLE IF NOT EXISTS chain_steps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_value INTEGER NOT NULL,
  delay_unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_steps_chain_id ON chain_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_steps_step_order ON chain_steps(step_order);

-- Chain Step Actions table
CREATE TABLE IF NOT EXISTS chain_step_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  step_id TEXT NOT NULL REFERENCES chain_steps(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  instruction TEXT NOT NULL,
  action_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_step_actions_step_id ON chain_step_actions(step_id);

-- Chain Schedules table
CREATE TABLE IF NOT EXISTS chain_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_schedules_chain_id ON chain_schedules(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_schedules_day_of_week ON chain_schedules(day_of_week);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  is_connected BOOLEAN DEFAULT false NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_synced TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_integrations_agent_id ON integrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_integrations_integration_type ON integrations(integration_type);

-- Agent Advanced Settings table
CREATE TABLE IF NOT EXISTS agent_advanced_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT UNIQUE NOT NULL,
  model TEXT DEFAULT 'OpenAI GPT-4.1' NOT NULL,
  auto_detect_language BOOLEAN DEFAULT false NOT NULL,
  response_language TEXT,
  schedule_enabled BOOLEAN DEFAULT false NOT NULL,
  creativity TEXT DEFAULT 'balanced' NOT NULL,
  response_delay_seconds INTEGER DEFAULT 45 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_advanced_settings_agent_id ON agent_advanced_settings(agent_id);

-- ==========================================
-- KNOWLEDGE GRAPH & EMBEDDINGS (Phase 4)
-- ==========================================

-- Embeddings table for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  source_type TEXT NOT NULL, -- 'kb_article', 'chat_log', 'crm_note'
  source_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
-- Vector similarity search index (cosine distance)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Memory nodes for Knowledge Graph
CREATE TABLE IF NOT EXISTS memory_nodes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  node_type TEXT NOT NULL, -- 'entity', 'event', 'concept'
  name TEXT NOT NULL,
  content TEXT,
  properties JSONB,
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5, -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id ON memory_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_agent_id ON memory_nodes(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_type ON memory_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_vector ON memory_nodes USING ivfflat (embedding vector_cosine_ops);

-- Memory edges for Knowledge Graph relationships
CREATE TABLE IF NOT EXISTS memory_edges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_node_id TEXT NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'mentions', 'related_to', 'caused_by', 'leads_to'
  weight FLOAT DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_edges_from ON memory_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_to ON memory_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_type ON memory_edges(relationship_type);

-- Kommo OAuth tokens storage
CREATE TABLE IF NOT EXISTS kommo_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integration_id TEXT UNIQUE NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  base_domain TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kommo_tokens_integration_id ON kommo_tokens(integration_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at auto-update
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_categories_updated_at BEFORE UPDATE ON kb_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_nodes_updated_at BEFORE UPDATE ON memory_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
