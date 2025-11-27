-- Migration: Add lead_id to memory_nodes
-- Purpose: Store facts per client (lead) instead of per organization
-- Created: 2025-01-27

-- Add lead_id column to memory_nodes
ALTER TABLE memory_nodes
ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Create index for faster queries by lead
CREATE INDEX IF NOT EXISTS idx_memory_nodes_lead_id ON memory_nodes(lead_id);

-- Create composite index for agent + lead queries
CREATE INDEX IF NOT EXISTS idx_memory_nodes_agent_lead ON memory_nodes(agent_id, lead_id);
