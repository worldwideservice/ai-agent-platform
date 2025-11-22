-- Contacts table (контакты из CRM)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  position TEXT,
  tags TEXT,
  customFields TEXT,
  crmId TEXT,
  crmType TEXT,
  userId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_userId ON contacts(userId);
CREATE INDEX IF NOT EXISTS idx_contacts_crmId ON contacts(crmId);

-- Deals table (сделки из CRM)
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'RUB',
  status TEXT,
  stage TEXT,
  pipelineId TEXT,
  pipelineName TEXT,
  responsibleUserId TEXT,
  contactId TEXT,
  tags TEXT,
  customFields TEXT,
  crmId TEXT,
  crmType TEXT,
  closedAt DATETIME,
  userId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_userId ON deals(userId);
CREATE INDEX IF NOT EXISTS idx_deals_contactId ON deals(contactId);
CREATE INDEX IF NOT EXISTS idx_deals_crmId ON deals(crmId);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
