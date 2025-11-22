import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(__dirname, '..', '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper to convert SQLite row to boolean fields
function convertBooleanFields<T extends Record<string, any>>(row: any, booleanFields: string[]): T {
  if (!row) return row;
  const result = { ...row };
  for (const field of booleanFields) {
    if (field in result) {
      result[field] = Boolean(result[field]);
    }
  }
  return result as T;
}

// Agent model operations
export const agent = {
  findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM agents';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(query).all(...params);
    return rows.map(row => convertBooleanFields(row, ['isActive', 'crmConnected']));
  },

  findFirst({ where }: any) {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }

    query += ' LIMIT 1';

    const row = db.prepare(query).get(...params);
    return row ? convertBooleanFields(row, ['isActive', 'crmConnected']) : null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO agents (
        id, name, isActive, model, systemInstructions,
        pipelineSettings, channelSettings, kbSettings,
        crmType, crmConnected, crmData, userId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.isActive ? 1 : 0,
      data.model || 'Google Gemini 2.5 Flash',
      data.systemInstructions || null,
      data.pipelineSettings || null,
      data.channelSettings || null,
      data.kbSettings || null,
      data.crmType || null,
      data.crmConnected ? 1 : 0,
      data.crmData || null,
      data.userId,
      now,
      now
    );

    return this.findFirst({ where: { id } });
  },

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.isActive !== undefined) {
      updates.push('isActive = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.model !== undefined) {
      updates.push('model = ?');
      params.push(data.model);
    }
    if (data.systemInstructions !== undefined) {
      updates.push('systemInstructions = ?');
      params.push(data.systemInstructions);
    }
    if (data.pipelineSettings !== undefined) {
      updates.push('pipelineSettings = ?');
      params.push(data.pipelineSettings);
    }
    if (data.channelSettings !== undefined) {
      updates.push('channelSettings = ?');
      params.push(data.channelSettings);
    }
    if (data.kbSettings !== undefined) {
      updates.push('kbSettings = ?');
      params.push(data.kbSettings);
    }
    if (data.crmType !== undefined) {
      updates.push('crmType = ?');
      params.push(data.crmType);
    }
    if (data.crmConnected !== undefined) {
      updates.push('crmConnected = ?');
      params.push(data.crmConnected ? 1 : 0);
    }
    if (data.crmData !== undefined) {
      updates.push('crmData = ?');
      params.push(data.crmData);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE agents SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    return this.findFirst({ where: { id: where.id } });
  },

  delete({ where }: any) {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    stmt.run(where.id);
    return { id: where.id };
  },
};

// User model operations
export const user = {
  findUnique({ where }: any) {
    let query = 'SELECT * FROM users WHERE ';
    let param: any;

    if (where.id) {
      query += 'id = ?';
      param = where.id;
    } else if (where.email) {
      query += 'email = ?';
      param = where.email;
    }

    const row = db.prepare(query).get(param);
    return row || null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.email,
      data.password,
      data.name || null,
      data.role || 'USER',
      now,
      now
    );

    return this.findUnique({ where: { id } });
  },
};

// KB Categories model operations
export const kbCategory = {
  findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM kb_categories';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (orderBy?.name) {
      query += ` ORDER BY name ${orderBy.name === 'desc' ? 'DESC' : 'ASC'}`;
    }

    return db.prepare(query).all(...params);
  },

  findFirst({ where }: any) {
    let query = 'SELECT * FROM kb_categories WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }

    query += ' LIMIT 1';
    return db.prepare(query).get(...params) || null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO kb_categories (id, name, parentId, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.parentId || null, data.userId, now, now);
    return this.findFirst({ where: { id } });
  },

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.parentId !== undefined) {
      updates.push('parentId = ?');
      params.push(data.parentId);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    const query = `UPDATE kb_categories SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    return this.findFirst({ where: { id: where.id } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM kb_categories WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

// KB Articles model operations
export const kbArticle = {
  findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM kb_articles';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(query).all(...params);
    return rows.map(row => convertBooleanFields(row, ['isActive']));
  },

  findFirst({ where }: any) {
    let query = 'SELECT * FROM kb_articles WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }

    query += ' LIMIT 1';
    const row = db.prepare(query).get(...params);
    return row ? convertBooleanFields(row, ['isActive']) : null;
  },

  create({ data }: any) {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO kb_articles (title, content, isActive, relatedArticles, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.title,
      data.content,
      data.isActive ? 1 : 0,
      data.relatedArticles || null,
      data.userId,
      now,
      now
    );

    return this.findFirst({ where: { id: info.lastInsertRowid } });
  },

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }
    if (data.isActive !== undefined) {
      updates.push('isActive = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.relatedArticles !== undefined) {
      updates.push('relatedArticles = ?');
      params.push(data.relatedArticles);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    const query = `UPDATE kb_articles SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    return this.findFirst({ where: { id: where.id } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM kb_articles WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

// Export as prisma-like object
export const prisma = {
  agent,
  user,
  kbCategory,
  kbArticle,
  $connect: async () => {
    console.log('✅ Database connected successfully (using better-sqlite3)');
  },
  $disconnect: async () => {
    db.close();
    console.log('👋 Database disconnected');
  },
};

// Connect function
export async function connectDatabase() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Graceful disconnect
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
