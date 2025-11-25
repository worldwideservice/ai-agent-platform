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

  findUnique({ where }: any) {
    return this.findFirst({ where });
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

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.password !== undefined) {
      updates.push('password = ?');
      params.push(data.password);
    }
    if (data.responsesUsed !== undefined) {
      if (data.responsesUsed.increment !== undefined) {
        updates.push('responsesUsed = responsesUsed + ?');
        params.push(data.responsesUsed.increment);
      } else {
        updates.push('responsesUsed = ?');
        params.push(data.responsesUsed);
      }
    }
    if (data.responsesLimit !== undefined) {
      updates.push('responsesLimit = ?');
      params.push(data.responsesLimit);
    }
    if (data.currentPlan !== undefined) {
      updates.push('currentPlan = ?');
      params.push(data.currentPlan);
    }
    if (data.trialEndsAt !== undefined) {
      updates.push('trialEndsAt = ?');
      params.push(data.trialEndsAt);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    return this.findUnique({ where: { id: where.id } });
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

  findMany({ where, select }: any = {}) {
    let query = 'SELECT * FROM chat_logs WHERE 1=1';
    const params: any[] = [];

    if (where?.userId) {
      query += ' AND userId = ?';
      params.push(where.userId);
    }

    if (where?.createdAt?.gte) {
      query += ' AND createdAt >= ?';
      params.push(where.createdAt.gte.toISOString());
    }

    query += ' ORDER BY createdAt DESC';

    const rows = db.prepare(query).all(...params);

    if (select?.createdAt) {
      return rows.map(row => ({ createdAt: row.createdAt }));
    }

    return rows;
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

// Trigger model operations
export const trigger = {
  findMany({ where, include, orderBy }: any = {}) {
    let query = 'SELECT * FROM triggers WHERE 1=1';
    const params: any[] = [];

    if (where?.agentId) {
      query += ' AND agentId = ?';
      params.push(where.agentId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(query).all(...params);
    const triggers = rows.map(row => convertBooleanFields(row, ['isActive']));

    // Include actions if requested
    if (include?.actions) {
      return triggers.map((trigger: any) => ({
        ...trigger,
        actions: db.prepare('SELECT * FROM trigger_actions WHERE triggerId = ? ORDER BY "order" ASC').all(trigger.id),
      }));
    }

    return triggers;
  },

  findUnique({ where, include }: any) {
    const row = db.prepare('SELECT * FROM triggers WHERE id = ?').get(where.id);
    if (!row) return null;

    const trigger = convertBooleanFields(row, ['isActive']);

    if (include?.actions) {
      trigger.actions = db.prepare('SELECT * FROM trigger_actions WHERE triggerId = ? ORDER BY "order" ASC').all(trigger.id);
    }

    return trigger;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO triggers (id, agentId, name, isActive, condition, cancelMessage, runLimit, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.agentId, data.name, data.isActive ? 1 : 0, data.condition, data.cancelMessage || null, data.runLimit || null, now, now);

    // Create actions
    if (data.actions?.create) {
      const actionsStmt = db.prepare('INSERT INTO trigger_actions (id, triggerId, action, "order", createdAt) VALUES (?, ?, ?, ?, ?)');
      for (const action of data.actions.create) {
        actionsStmt.run(randomUUID(), id, action.action, action.order, now);
      }
    }

    return this.findUnique({ where: { id }, include: { actions: true } });
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
    if (data.condition !== undefined) {
      updates.push('condition = ?');
      params.push(data.condition);
    }
    if (data.cancelMessage !== undefined) {
      updates.push('cancelMessage = ?');
      params.push(data.cancelMessage);
    }
    if (data.runLimit !== undefined) {
      updates.push('runLimit = ?');
      params.push(data.runLimit);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    if (updates.length > 1) {
      db.prepare(`UPDATE triggers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // Update actions if provided
    if (data.actions?.create) {
      const now = new Date().toISOString();
      const actionsStmt = db.prepare('INSERT INTO trigger_actions (id, triggerId, action, "order", createdAt) VALUES (?, ?, ?, ?, ?)');
      for (const action of data.actions.create) {
        actionsStmt.run(randomUUID(), where.id, action.action, action.order, now);
      }
    }

    return this.findUnique({ where: { id: where.id }, include: { actions: true } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM triggers WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

export const triggerAction = {
  deleteMany({ where }: any) {
    db.prepare('DELETE FROM trigger_actions WHERE triggerId = ?').run(where.triggerId);
    return {};
  },
};

export const chain = {
  findMany({ where, include, orderBy }: any = {}) {
    let query = 'SELECT * FROM chains WHERE 1=1';
    const params: any[] = [];

    if (where?.agentId) {
      query += ' AND agentId = ?';
      params.push(where.agentId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const rows = db.prepare(query).all(...params);
    const chains = rows.map(row => convertBooleanFields(row, ['isActive']));

    if (include) {
      return chains.map((chain: any) => this._includeRelations(chain, include));
    }

    return chains;
  },

  findUnique({ where, include }: any) {
    const row = db.prepare('SELECT * FROM chains WHERE id = ?').get(where.id);
    if (!row) return null;

    const chain = convertBooleanFields(row, ['isActive']);

    if (include) {
      return this._includeRelations(chain, include);
    }

    return chain;
  },

  _includeRelations(chain: any, include: any) {
    if (include.conditions) {
      chain.conditions = db.prepare('SELECT * FROM chain_conditions WHERE chainId = ?').all(chain.id);
    }
    if (include.steps) {
      const steps = db.prepare('SELECT * FROM chain_steps WHERE chainId = ? ORDER BY stepOrder ASC').all(chain.id);
      if (include.steps.include?.actions) {
        chain.steps = steps.map((step: any) => ({
          ...step,
          actions: db.prepare('SELECT * FROM chain_step_actions WHERE stepId = ? ORDER BY actionOrder ASC').all(step.id),
        }));
      } else {
        chain.steps = steps;
      }
    }
    if (include.schedules) {
      const schedules = db.prepare('SELECT * FROM chain_schedules WHERE chainId = ? ORDER BY dayOfWeek ASC').all(chain.id);
      chain.schedules = schedules.map(row => convertBooleanFields(row, ['enabled']));
    }
    return chain;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO chains (id, agentId, name, isActive, conditionType, conditionExclude, runLimit, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.agentId, data.name, data.isActive ? 1 : 0, data.conditionType, data.conditionExclude || null, data.runLimit || null, now, now);

    // Create conditions
    if (data.conditions?.create) {
      const condStmt = db.prepare('INSERT INTO chain_conditions (id, chainId, stageId, createdAt) VALUES (?, ?, ?, ?)');
      for (const cond of data.conditions.create) {
        condStmt.run(randomUUID(), id, cond.stageId, now);
      }
    }

    // Create steps with actions
    if (data.steps?.create) {
      const stepStmt = db.prepare('INSERT INTO chain_steps (id, chainId, stepOrder, delayValue, delayUnit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const actionStmt = db.prepare('INSERT INTO chain_step_actions (id, stepId, actionType, instruction, actionOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)');

      for (const step of data.steps.create) {
        const stepId = randomUUID();
        stepStmt.run(stepId, id, step.stepOrder, step.delayValue, step.delayUnit, now, now);

        if (step.actions?.create) {
          for (const action of step.actions.create) {
            actionStmt.run(randomUUID(), stepId, action.actionType, action.instruction, action.actionOrder, now);
          }
        }
      }
    }

    // Create schedules
    if (data.schedules?.create) {
      const schedStmt = db.prepare('INSERT INTO chain_schedules (id, chainId, dayOfWeek, enabled, startTime, endTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const sched of data.schedules.create) {
        schedStmt.run(randomUUID(), id, sched.dayOfWeek, sched.enabled ? 1 : 0, sched.startTime, sched.endTime, now, now);
      }
    }

    return this.findUnique({ where: { id }, include: { conditions: true, steps: { include: { actions: { orderBy: { actionOrder: 'asc' } } } }, schedules: true } });
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
    if (data.conditionType !== undefined) {
      updates.push('conditionType = ?');
      params.push(data.conditionType);
    }
    if (data.conditionExclude !== undefined) {
      updates.push('conditionExclude = ?');
      params.push(data.conditionExclude);
    }
    if (data.runLimit !== undefined) {
      updates.push('runLimit = ?');
      params.push(data.runLimit);
    }

    updates.push('updatedAt = ?');
    const now = new Date().toISOString();
    params.push(now);
    params.push(where.id);

    if (updates.length > 1) {
      db.prepare(`UPDATE chains SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // Update nested relations if provided
    if (data.conditions?.create) {
      const condStmt = db.prepare('INSERT INTO chain_conditions (id, chainId, stageId, createdAt) VALUES (?, ?, ?, ?)');
      for (const cond of data.conditions.create) {
        condStmt.run(randomUUID(), where.id, cond.stageId, now);
      }
    }

    if (data.steps?.create) {
      const stepStmt = db.prepare('INSERT INTO chain_steps (id, chainId, stepOrder, delayValue, delayUnit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const actionStmt = db.prepare('INSERT INTO chain_step_actions (id, stepId, actionType, instruction, actionOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?)');

      for (const step of data.steps.create) {
        const stepId = randomUUID();
        stepStmt.run(stepId, where.id, step.stepOrder, step.delayValue, step.delayUnit, now, now);

        if (step.actions?.create) {
          for (const action of step.actions.create) {
            actionStmt.run(randomUUID(), stepId, action.actionType, action.instruction, action.actionOrder, now);
          }
        }
      }
    }

    if (data.schedules?.create) {
      const schedStmt = db.prepare('INSERT INTO chain_schedules (id, chainId, dayOfWeek, enabled, startTime, endTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const sched of data.schedules.create) {
        schedStmt.run(randomUUID(), where.id, sched.dayOfWeek, sched.enabled ? 1 : 0, sched.startTime, sched.endTime, now, now);
      }
    }

    return this.findUnique({ where: { id: where.id }, include: { conditions: true, steps: { include: { actions: { orderBy: { actionOrder: 'asc' } } } }, schedules: true } });
  },

  delete({ where }: any) {
    db.prepare('DELETE FROM chains WHERE id = ?').run(where.id);
    return { id: where.id };
  },
};

export const chainCondition = {
  deleteMany({ where }: any) {
    db.prepare('DELETE FROM chain_conditions WHERE chainId = ?').run(where.chainId);
    return {};
  },
};

export const chainStep = {
  deleteMany({ where }: any) {
    db.prepare('DELETE FROM chain_steps WHERE chainId = ?').run(where.chainId);
    return {};
  },
};

export const chainStepAction = {
  deleteMany({ where }: any) {
    if (where.step?.chainId) {
      // Delete actions for all steps of the chain
      db.prepare(`
        DELETE FROM chain_step_actions
        WHERE stepId IN (SELECT id FROM chain_steps WHERE chainId = ?)
      `).run(where.step.chainId);
    }
    return {};
  },
};

export const chainSchedule = {
  deleteMany({ where }: any) {
    db.prepare('DELETE FROM chain_schedules WHERE chainId = ?').run(where.chainId);
    return {};
  },
};

export const integration = {
  findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM integrations WHERE 1=1';
    const params: any[] = [];

    if (where?.agentId) {
      query += ' AND agentId = ?';
      params.push(where.agentId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY createdAt ${orderBy.createdAt === 'asc' ? 'ASC' : 'DESC'}`;
    }

    const rows = db.prepare(query).all(...params);
    return rows.map(row => convertBooleanFields(row, ['isActive', 'isConnected']));
  },

  findFirst({ where }: any) {
    let query = 'SELECT * FROM integrations WHERE 1=1';
    const params: any[] = [];

    if (where?.id) {
      query += ' AND id = ?';
      params.push(where.id);
    }
    if (where?.agentId) {
      query += ' AND agentId = ?';
      params.push(where.agentId);
    }
    if (where?.integrationType) {
      query += ' AND integrationType = ?';
      params.push(where.integrationType);
    }

    query += ' LIMIT 1';
    const row = db.prepare(query).get(...params);
    return row ? convertBooleanFields(row, ['isActive', 'isConnected']) : null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO integrations (id, agentId, integrationType, isActive, isConnected, connectedAt, lastSynced, settings, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.agentId,
      data.integrationType,
      data.isActive ? 1 : 0,
      data.isConnected ? 1 : 0,
      data.connectedAt ? (data.connectedAt instanceof Date ? data.connectedAt.toISOString() : data.connectedAt) : null,
      data.lastSynced ? (data.lastSynced instanceof Date ? data.lastSynced.toISOString() : data.lastSynced) : null,
      data.settings || null,
      now,
      now
    );

    return this.findFirst({ where: { id } });
  },

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.isActive !== undefined) {
      updates.push('isActive = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.isConnected !== undefined) {
      updates.push('isConnected = ?');
      params.push(data.isConnected ? 1 : 0);
    }
    if (data.connectedAt !== undefined) {
      updates.push('connectedAt = ?');
      params.push(data.connectedAt ? (data.connectedAt instanceof Date ? data.connectedAt.toISOString() : data.connectedAt) : null);
    }
    if (data.lastSynced !== undefined) {
      updates.push('lastSynced = ?');
      params.push(data.lastSynced ? (data.lastSynced instanceof Date ? data.lastSynced.toISOString() : data.lastSynced) : null);
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?');
      params.push(data.settings);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.id);

    if (updates.length > 1) {
      db.prepare(`UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return this.findFirst({ where: { id: where.id } });
  },
};

export const agentAdvancedSettings = {
  findUnique({ where }: any) {
    const row = db.prepare('SELECT * FROM agent_advanced_settings WHERE agentId = ?').get(where.agentId);
    return row ? convertBooleanFields(row, ['autoDetectLanguage', 'scheduleEnabled']) : null;
  },

  create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO agent_advanced_settings (id, agentId, model, autoDetectLanguage, responseLanguage, scheduleEnabled, creativity, responseDelaySeconds, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.agentId,
      data.model,
      data.autoDetectLanguage ? 1 : 0,
      data.responseLanguage || null,
      data.scheduleEnabled ? 1 : 0,
      data.creativity,
      data.responseDelaySeconds,
      now,
      now
    );

    return this.findUnique({ where: { agentId: data.agentId } });
  },

  update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.model !== undefined) {
      updates.push('model = ?');
      params.push(data.model);
    }
    if (data.autoDetectLanguage !== undefined) {
      updates.push('autoDetectLanguage = ?');
      params.push(data.autoDetectLanguage ? 1 : 0);
    }
    if (data.responseLanguage !== undefined) {
      updates.push('responseLanguage = ?');
      params.push(data.responseLanguage);
    }
    if (data.scheduleEnabled !== undefined) {
      updates.push('scheduleEnabled = ?');
      params.push(data.scheduleEnabled ? 1 : 0);
    }
    if (data.creativity !== undefined) {
      updates.push('creativity = ?');
      params.push(data.creativity);
    }
    if (data.responseDelaySeconds !== undefined) {
      updates.push('responseDelaySeconds = ?');
      params.push(data.responseDelaySeconds);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(where.agentId);

    if (updates.length > 1) {
      db.prepare(`UPDATE agent_advanced_settings SET ${updates.join(', ')} WHERE agentId = ?`).run(...params);
    }

    return this.findUnique({ where: { agentId: where.agentId } });
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
  trigger,
  triggerAction,
  chain,
  chainCondition,
  chainStep,
  chainStepAction,
  chainSchedule,
  integration,
  agentAdvancedSettings,
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
