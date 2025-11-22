-- Add checkBeforeSend field to agents table
ALTER TABLE agents ADD COLUMN checkBeforeSend INTEGER DEFAULT 0;
