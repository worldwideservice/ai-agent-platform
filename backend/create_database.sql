-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER' CHECK(role IN ('USER', 'ADMIN')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  isActive INTEGER DEFAULT 0,
  model TEXT DEFAULT 'Google Gemini 2.5 Flash',
  systemInstructions TEXT,
  pipelineSettings TEXT,
  channelSettings TEXT,
  kbSettings TEXT,
  crmType TEXT,
  crmConnected INTEGER DEFAULT 0,
  crmData TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agents_userId ON agents(userId);
CREATE INDEX IF NOT EXISTS idx_agents_isActive ON agents(isActive);

-- KB Categories table
CREATE TABLE IF NOT EXISTS kb_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parentId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES kb_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_categories_userId ON kb_categories(userId);
CREATE INDEX IF NOT EXISTS idx_kb_categories_parentId ON kb_categories(parentId);

-- KB Articles table
CREATE TABLE IF NOT EXISTS kb_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  relatedArticles TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_userId ON kb_articles(userId);
CREATE INDEX IF NOT EXISTS idx_kb_articles_isActive ON kb_articles(isActive);

-- Article Categories junction table
CREATE TABLE IF NOT EXISTS article_categories (
  articleId INTEGER NOT NULL,
  categoryId TEXT NOT NULL,
  PRIMARY KEY (articleId, categoryId),
  FOREIGN KEY (articleId) REFERENCES kb_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES kb_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_categories_articleId ON article_categories(articleId);
CREATE INDEX IF NOT EXISTS idx_article_categories_categoryId ON article_categories(categoryId);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  stopOnReply INTEGER DEFAULT 0,
  resumeTime INTEGER DEFAULT 30,
  resumeUnit TEXT DEFAULT 'дней',
  userId TEXT UNIQUE NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat Logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  agentId TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_userId ON chat_logs(userId);
CREATE INDEX IF NOT EXISTS idx_chat_logs_agentId ON chat_logs(agentId);
CREATE INDEX IF NOT EXISTS idx_chat_logs_createdAt ON chat_logs(createdAt);
