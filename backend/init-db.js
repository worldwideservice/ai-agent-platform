const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);

// SQL для создания таблиц на основе Prisma schema
const schema = `
-- Таблица users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Таблица agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'Google Gemini 2.5 Flash',
  systemInstructions TEXT,
  pipelineSettings TEXT,
  channelSettings TEXT,
  kbSettings TEXT,
  crmType TEXT,
  crmConnected INTEGER NOT NULL DEFAULT 0,
  crmData TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS agents_userId_idx ON agents(userId);
CREATE INDEX IF NOT EXISTS agents_isActive_idx ON agents(isActive);

-- Таблица kb_categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parentId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES kb_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS kb_categories_userId_idx ON kb_categories(userId);
CREATE INDEX IF NOT EXISTS kb_categories_parentId_idx ON kb_categories(parentId);

-- Таблица kb_articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  relatedArticles TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS kb_articles_userId_idx ON kb_articles(userId);
CREATE INDEX IF NOT EXISTS kb_articles_isActive_idx ON kb_articles(isActive);

-- Таблица article_categories
CREATE TABLE IF NOT EXISTS article_categories (
  articleId INTEGER NOT NULL,
  categoryId TEXT NOT NULL,
  PRIMARY KEY (articleId, categoryId),
  FOREIGN KEY (articleId) REFERENCES kb_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES kb_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS article_categories_articleId_idx ON article_categories(articleId);
CREATE INDEX IF NOT EXISTS article_categories_categoryId_idx ON article_categories(categoryId);

-- Таблица user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  stopOnReply INTEGER NOT NULL DEFAULT 0,
  resumeTime INTEGER NOT NULL DEFAULT 30,
  resumeUnit TEXT NOT NULL DEFAULT 'дней',
  userId TEXT NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Таблица chat_logs
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  agentId TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_logs_userId_idx ON chat_logs(userId);
CREATE INDEX IF NOT EXISTS chat_logs_agentId_idx ON chat_logs(agentId);
CREATE INDEX IF NOT EXISTS chat_logs_createdAt_idx ON chat_logs(createdAt);
`;

try {
  // Выполняем каждую команду отдельно
  const statements = schema.split(';').filter(s => s.trim());
  statements.forEach(statement => {
    if (statement.trim()) {
      db.exec(statement);
    }
  });

  console.log('✅ Database initialized successfully at:', dbPath);
  console.log('📊 Tables created');
} catch (error) {
  console.error('❌ Error initializing database:', error);
  process.exit(1);
} finally {
  db.close();
}
