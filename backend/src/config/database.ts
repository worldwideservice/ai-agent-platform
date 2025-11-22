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
  findUnique({ where, select }: any) {
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

    if (!row) return null;

    // If select is specified, filter the fields
    if (select) {
      const filtered: any = {};
      Object.keys(select).forEach(key => {
        if (select[key] && key in row) {
          filtered[key] = row[key];
        }
      });
      return filtered;
    }

    return row;
  },

  create({ data, select }: any) {
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

    const user = this.findUnique({ where: { id } });

    // If select is specified, filter the fields
    if (select && user) {
      const filtered: any = {};
      Object.keys(select).forEach(key => {
        if (select[key] && key in user) {
          filtered[key] = user[key];
        }
      });
      return filtered;
    }

    return user;
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

// Contact model operations
export const contact = {
  findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM contacts';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    return db.prepare(query).all(...params);
  },

  findFirst({ where }: any) {
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }
    if (where?.crmId) {
      query += ' AND crmId = ?';
      params.push(where.crmId);
    }

    query += ' LIMIT 1';
    return db.prepare(query).get(...params) || null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO contacts (
        id, name, phone, email, company, position, tags,
        customFields, crmId, crmType, userId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.phone || null,
      data.email || null,
      data.company || null,
      data.position || null,
      data.tags || null,
      data.customFields || null,
      data.crmId || null,
      data.crmType || null,
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
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.company !== undefined) {
      updates.push('company = ?');
      params.push(data.company);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      params.push(data.position);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(data.tags);
    }
    if (data.customFields !== undefined) {
      updates.push('customFields = ?');
      params.push(data.customFields);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    const query = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    return this.findFirst({ where: { id: where.id } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

// Deal model operations
export const deal = {
  findMany({ where, orderBy, include }: any = {}) {
    let query = 'SELECT * FROM deals';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(query).all(...params);

    // If include contact, fetch contact data
    if (include?.contact) {
      return rows.map((row: any) => {
        if (row.contactId) {
          const contactRow = db.prepare('SELECT * FROM contacts WHERE id = ?').get(row.contactId);
          return { ...row, contact: contactRow };
        }
        return row;
      });
    }

    return rows;
  },

  findFirst({ where, include }: any) {
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }
    if (where?.crmId) {
      query += ' AND crmId = ?';
      params.push(where.crmId);
    }

    query += ' LIMIT 1';
    const row = db.prepare(query).get(...params);

    if (!row) return null;

    // If include contact, fetch contact data
    if (include?.contact && row.contactId) {
      const contactRow = db.prepare('SELECT * FROM contacts WHERE id = ?').get(row.contactId);
      return { ...row, contact: contactRow };
    }

    return row;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO deals (
        id, name, price, currency, status, stage, pipelineId, pipelineName,
        responsibleUserId, contactId, tags, customFields, crmId, crmType,
        closedAt, userId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.price || 0,
      data.currency || 'RUB',
      data.status || null,
      data.stage || null,
      data.pipelineId || null,
      data.pipelineName || null,
      data.responsibleUserId || null,
      data.contactId || null,
      data.tags || null,
      data.customFields || null,
      data.crmId || null,
      data.crmType || null,
      data.closedAt || null,
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
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.currency !== undefined) {
      updates.push('currency = ?');
      params.push(data.currency);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.stage !== undefined) {
      updates.push('stage = ?');
      params.push(data.stage);
    }
    if (data.pipelineId !== undefined) {
      updates.push('pipelineId = ?');
      params.push(data.pipelineId);
    }
    if (data.pipelineName !== undefined) {
      updates.push('pipelineName = ?');
      params.push(data.pipelineName);
    }
    if (data.contactId !== undefined) {
      updates.push('contactId = ?');
      params.push(data.contactId);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(data.tags);
    }
    if (data.customFields !== undefined) {
      updates.push('customFields = ?');
      params.push(data.customFields);
    }
    if (data.closedAt !== undefined) {
      updates.push('closedAt = ?');
      params.push(data.closedAt);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    const query = `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
    return this.findFirst({ where: { id: where.id } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM deals WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

// UserSettings model operations
export const userSettings = {
  findUnique({ where }: any) {
    let query = 'SELECT * FROM user_settings WHERE ';
    let param: any;

    if (where.userId) {
      query += 'userId = ?';
      param = where.userId;
    } else if (where.id) {
      query += 'id = ?';
      param = where.id;
    }

    const row = db.prepare(query).get(param);
    return row ? convertBooleanFields(row, ['stopOnReply']) : null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO user_settings (id, stopOnReply, resumeTime, resumeUnit, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.stopOnReply ? 1 : 0,
      data.resumeTime,
      data.resumeUnit,
      data.userId,
      now,
      now
    );

    return this.findUnique({ where: { id } });
  },

  upsert({ where, update, create }: any) {
    const existing = this.findUnique({ where });

    if (existing) {
      const updates: string[] = [];
      const params: any[] = [];

      if (update.stopOnReply !== undefined) {
        updates.push('stopOnReply = ?');
        params.push(update.stopOnReply ? 1 : 0);
      }
      if (update.resumeTime !== undefined) {
        updates.push('resumeTime = ?');
        params.push(update.resumeTime);
      }
      if (update.resumeUnit !== undefined) {
        updates.push('resumeUnit = ?');
        params.push(update.resumeUnit);
      }

      updates.push('updatedAt = ?');
      params.push(new Date().toISOString());
      params.push(where.userId);

      const query = `UPDATE user_settings SET ${updates.join(', ')} WHERE userId = ?`;
      db.prepare(query).run(...params);

      return this.findUnique({ where });
    } else {
      return this.create({ data: create });
    }
  },
};

// ChatLog model operations
export const chatLog = {
  count({ where }: any = {}) {
    let query = 'SELECT COUNT(*) as count FROM chat_logs';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    const result = db.prepare(query).get(...params) as any;
    return result.count;
  },

  groupBy({ by, where, _count }: any) {
    // Simplified groupBy for createdAt
    let query = 'SELECT createdAt, COUNT(*) as _count FROM chat_logs';
    const params: any[] = [];

    if (where?.userId) {
      query += ' WHERE userId = ?';
      params.push(where.userId);
    }

    if (where?.createdAt?.gte) {
      query += where?.userId ? ' AND' : ' WHERE';
      query += ' createdAt >= ?';
      params.push(where.createdAt.gte.toISOString());
    }

    query += ' GROUP BY DATE(createdAt)';

    return db.prepare(query).all(...params);
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO chat_logs (id, agentId, message, response, model, userId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.agentId,
      data.message,
      data.response,
      data.model,
      data.userId,
      now
    );

    return { id, ...data, createdAt: now };
  },
};

// Add count method to agent model
const agentWithCount = {
  ...agent,
  count({ where }: any = {}) {
    let query = 'SELECT COUNT(*) as count FROM agents WHERE 1=1';
    const params: any[] = [];

    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }
    if (where?.isActive !== undefined) {
      query += ' AND isActive = ?';
      params.push(where.isActive ? 1 : 0);
    }

    const result = db.prepare(query).get(...params) as any;
    return result.count;
  },
};

// Export as prisma-like object
export const prisma = {
  agent: agentWithCount,
  user,
  kbCategory,
  kbArticle,
  contact,
  deal,
  userSettings,
  chatLog,
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
