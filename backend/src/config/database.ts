import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Export pool for use in services (embeddings, knowledge base, etc.)
export { pool };

// Helper to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  // Preserve Date objects
  if (obj instanceof Date) return obj;

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = toCamelCase(obj[key]);
  }
  return converted;
}

// Helper to convert camelCase to snake_case (reserved for future use)
// function toSnakeCase(str: string): string {
//   return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
// }

// Agent model operations
export const agent = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    query += ' LIMIT 1';

    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO agents (
        id, name, is_active, model, system_instructions,
        pipeline_settings, channel_settings, kb_settings,
        crm_type, crm_connected, crm_data, training_role_id, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.name,
      data.isActive || false,
      data.model || 'Google Gemini 2.5 Flash',
      data.systemInstructions || null,
      data.pipelineSettings ? JSON.stringify(data.pipelineSettings) : null,
      data.channelSettings ? JSON.stringify(data.channelSettings) : null,
      data.kbSettings ? JSON.stringify(data.kbSettings) : null,
      data.crmType || null,
      data.crmConnected || false,
      data.crmData ? JSON.stringify(data.crmData) : null,
      data.trainingRoleId || null,
      data.userId,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.model !== undefined) {
      updates.push(`model = $${paramIndex++}`);
      params.push(data.model);
    }
    if (data.systemInstructions !== undefined) {
      updates.push(`system_instructions = $${paramIndex++}`);
      params.push(data.systemInstructions);
    }
    if (data.pipelineSettings !== undefined) {
      updates.push(`pipeline_settings = $${paramIndex++}`);
      params.push(JSON.stringify(data.pipelineSettings));
    }
    if (data.channelSettings !== undefined) {
      updates.push(`channel_settings = $${paramIndex++}`);
      params.push(JSON.stringify(data.channelSettings));
    }
    if (data.kbSettings !== undefined) {
      updates.push(`kb_settings = $${paramIndex++}`);
      params.push(JSON.stringify(data.kbSettings));
    }
    if (data.crmType !== undefined) {
      updates.push(`crm_type = $${paramIndex++}`);
      params.push(data.crmType);
    }
    if (data.crmConnected !== undefined) {
      updates.push(`crm_connected = $${paramIndex++}`);
      params.push(data.crmConnected);
    }
    if (data.crmData !== undefined) {
      updates.push(`crm_data = $${paramIndex++}`);
      params.push(JSON.stringify(data.crmData));
    }
    if (data.trainingRoleId !== undefined) {
      updates.push(`training_role_id = $${paramIndex++}`);
      params.push(data.trainingRoleId);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    await pool.query('DELETE FROM agents WHERE id = $1', [where.id]);
    return { id: where.id };
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  },

  async count({ where }: any = {}) {
    let query = 'SELECT COUNT(*)::int as count FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(where.isActive);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  },
};

// User model operations
export const user = {
  async findUnique({ where, select, includePassword = false }: any) {
    let query = 'SELECT * FROM users WHERE ';
    let param: any;

    if (where.id) {
      query += 'id = $1';
      param = where.id;
    } else if (where.email) {
      query += 'email = $1';
      param = where.email;
    }

    const result = await pool.query(query, [param]);
    if (!result.rows[0]) return null;

    const row = toCamelCase(result.rows[0]);

    if (select) {
      const filtered: any = {};
      for (const key in select) {
        if (select[key] && row[key] !== undefined) {
          filtered[key] = row[key];
        }
      }
      return filtered;
    }

    // For internal auth checks, we need password - use includePassword flag
    if (includePassword) {
      return row;
    }

    // By default, never return password
    const { password: _password, ...safeUser } = row;
    return safeUser;
  },

  async create({ data, select }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO users (
        id, email, password, name, role,
        current_plan, trial_ends_at, responses_used, responses_limit,
        agents_limit, kb_articles_limit, instructions_limit,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.email,
      data.password,
      data.name || null,
      data.role || 'USER',
      data.currentPlan || 'trial',
      data.trialEndsAt || null,
      data.responsesUsed || 0,
      data.responsesLimit || 500,
      data.agentsLimit || 3,
      data.kbArticlesLimit || 50,
      data.instructionsLimit || 10,
      now,
      now
    ]);

    const row = toCamelCase(result.rows[0]);

    // Handle select parameter - filter fields
    if (select) {
      const filtered: any = {};
      for (const key in select) {
        if (select[key] && row[key] !== undefined) {
          filtered[key] = row[key];
        }
      }
      return filtered;
    }

    // By default, never return password
    const { password: _password, ...safeUser } = row;
    return safeUser;
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.password !== undefined) {
      updates.push(`password = $${paramIndex++}`);
      params.push(data.password);
    }
    if (data.currentPlan !== undefined) {
      updates.push(`current_plan = $${paramIndex++}`);
      params.push(data.currentPlan);
    }
    if (data.responsesUsed !== undefined) {
      if (data.responsesUsed.increment) {
        updates.push(`responses_used = responses_used + $${paramIndex++}`);
        params.push(data.responsesUsed.increment);
      } else {
        updates.push(`responses_used = $${paramIndex++}`);
        params.push(data.responsesUsed);
      }
    }
    if (data.responsesLimit !== undefined) {
      updates.push(`responses_limit = $${paramIndex++}`);
      params.push(data.responsesLimit);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },
};

// ChatLog model operations
export const chatLog = {
  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO chat_logs (id, agent_id, message, response, model, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.message,
      data.response,
      data.model,
      data.userId,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async findMany({ where, orderBy, take }: any = {}) {
    let query = 'SELECT * FROM chat_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    if (take) {
      query += ` LIMIT ${take}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async count({ where }: any = {}) {
    let query = 'SELECT COUNT(*)::int as count FROM chat_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  },
};

// KbCategory model operations
export const kbCategory = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM kb_categories WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.parentId !== undefined) {
      if (where.parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ` AND parent_id = $${paramIndex++}`;
        params.push(where.parentId);
      }
    }

    if (orderBy?.name) {
      query += ` ORDER BY name ${orderBy.name === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM kb_categories WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.name) {
      query += ` AND name = $${paramIndex++}`;
      params.push(where.name);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO kb_categories (id, name, parent_id, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.name,
      data.parentId || null,
      data.userId,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.parentId !== undefined) {
      updates.push(`parent_id = $${paramIndex++}`);
      params.push(data.parentId);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE kb_categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM kb_categories WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM kb_categories WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },
};

export const kbArticle = {
  async findFirst({ where }: any = {}) {
    let query = 'SELECT * FROM kb_articles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(where.isActive);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows.length > 0 ? toCamelCase(result.rows[0]) : null;
  },

  async findMany({ where, include, select, orderBy, take }: any = {}) {
    let selectClause = '*';
    if (select) {
      const columns = Object.keys(select).filter(k => select[k]).map(k => {
        // Convert camelCase to snake_case
        return k.replace(/([A-Z])/g, '_$1').toLowerCase();
      });
      if (columns.length > 0) {
        selectClause = columns.join(', ');
      }
    }

    let query = `SELECT ${selectClause} FROM kb_articles WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id?.in) {
      const ids = where.id.in;
      query += ` AND id = ANY($${paramIndex++}::int[])`;
      params.push(ids);
    }
    if (where?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(where.isActive);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    // Order by
    if (orderBy) {
      const orderKey = Object.keys(orderBy)[0];
      const orderDir = orderBy[orderKey] === 'desc' ? 'DESC' : 'ASC';
      const snakeKey = orderKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      query += ` ORDER BY ${snakeKey} ${orderDir}`;
    }

    // Limit
    if (take) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(take);
    }

    const result = await pool.query(query, params);
    const articles = result.rows.map(toCamelCase);

    // If include is specified, fetch related data
    if (include?.articleCategories) {
      for (const article of articles) {
        // Fetch article categories
        const catQuery = `
          SELECT ac.*, c.id as category_id, c.name as category_name
          FROM article_categories ac
          LEFT JOIN kb_categories c ON c.id = ac.category_id
          WHERE ac.article_id = $1
        `;
        const catResult = await pool.query(catQuery, [article.id]);
        article.articleCategories = catResult.rows.map((row: any) => ({
          ...toCamelCase(row),
          category: {
            id: row.category_id,
            name: row.category_name,
          },
        }));
      }
    }

    return articles;
  },
  async create() { return null; },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM kb_articles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async count({ where }: any = {}) {
    let query = 'SELECT COUNT(*)::int as count FROM kb_articles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(where.isActive);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  },
};

export const contact = {
  async findFirst({ where }: any = {}) {
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.crmId) {
      query += ` AND crm_id = $${paramIndex++}`;
      params.push(where.crmId);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows.length > 0 ? toCamelCase(result.rows[0]) : null;
  },

  async findMany({ where }: any = {}) {
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async create({ data }: any) {
    const result = await pool.query(
      `INSERT INTO contacts (name, phone, email, company, position, tags, crm_id, crm_type, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [data.name, data.phone, data.email, data.company, data.position, data.tags, data.crmId, data.crmType, data.userId]
    );
    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      params.push(data.company);
    }
    if (data.position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      params.push(data.position);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.crmId !== undefined) {
      updates.push(`crm_id = $${paramIndex++}`);
      params.push(data.crmId);
    }
    if (data.crmType !== undefined) {
      updates.push(`crm_type = $${paramIndex++}`);
      params.push(data.crmType);
    }

    params.push(where.id);
    const query = `UPDATE contacts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM contacts WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },
};

export const deal = {
  async findFirst({ where }: any = {}) {
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.crmId) {
      query += ` AND crm_id = $${paramIndex++}`;
      params.push(where.crmId);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows.length > 0 ? toCamelCase(result.rows[0]) : null;
  },

  async findMany({ where }: any = {}) {
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async create({ data }: any) {
    const result = await pool.query(
      `INSERT INTO deals (name, price, currency, status, stage, pipeline_id, pipeline_name, contact_id, tags, crm_id, crm_type, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [data.name, data.price, data.currency, data.status, data.stage, data.pipelineId, data.pipelineName, data.contactId, data.tags, data.crmId, data.crmType, data.userId]
    );
    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(data.price);
    }
    if (data.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      params.push(data.currency);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.stage !== undefined) {
      updates.push(`stage = $${paramIndex++}`);
      params.push(data.stage);
    }
    if (data.pipelineId !== undefined) {
      updates.push(`pipeline_id = $${paramIndex++}`);
      params.push(data.pipelineId);
    }
    if (data.pipelineName !== undefined) {
      updates.push(`pipeline_name = $${paramIndex++}`);
      params.push(data.pipelineName);
    }
    if (data.contactId !== undefined) {
      updates.push(`contact_id = $${paramIndex++}`);
      params.push(data.contactId);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.crmId !== undefined) {
      updates.push(`crm_id = $${paramIndex++}`);
      params.push(data.crmId);
    }
    if (data.crmType !== undefined) {
      updates.push(`crm_type = $${paramIndex++}`);
      params.push(data.crmType);
    }

    params.push(where.id);
    const query = `UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM deals WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },
};

export const userSettings = {
  async findUnique({ where }: any) {
    let query = 'SELECT * FROM user_settings WHERE ';
    let param: any;

    if (where.userId) {
      query += 'user_id = $1';
      param = where.userId;
    } else if (where.id) {
      query += 'id = $1';
      param = where.id;
    }

    const result = await pool.query(query, [param]);
    if (!result.rows[0]) return null;

    return {
      id: result.rows[0].id,
      stopOnReply: result.rows[0].stop_on_reply,
      resumeTime: result.rows[0].resume_time,
      resumeUnit: result.rows[0].resume_unit,
      userId: result.rows[0].user_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  },

  async findFirst({ where }: any) {
    return this.findUnique({ where });
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO user_settings (id, user_id, stop_on_reply, resume_time, resume_unit, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.userId,
      data.stopOnReply ?? false,
      data.resumeTime ?? 30,
      data.resumeUnit ?? 'дней',
      now,
      now
    ]);

    return {
      id: result.rows[0].id,
      stopOnReply: result.rows[0].stop_on_reply,
      resumeTime: result.rows[0].resume_time,
      resumeUnit: result.rows[0].resume_unit,
      userId: result.rows[0].user_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  },

  async upsert({ where, create, update }: any) {
    const existing = await this.findUnique({ where });

    if (existing) {
      const now = new Date().toISOString();
      const query = `
        UPDATE user_settings
        SET stop_on_reply = $1, resume_time = $2, resume_unit = $3, updated_at = $4
        WHERE user_id = $5
        RETURNING *
      `;
      const result = await pool.query(query, [
        update.stopOnReply,
        update.resumeTime,
        update.resumeUnit,
        now,
        where.userId
      ]);

      return {
        id: result.rows[0].id,
        stopOnReply: result.rows[0].stop_on_reply,
        resumeTime: result.rows[0].resume_time,
        resumeUnit: result.rows[0].resume_unit,
        userId: result.rows[0].user_id,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };
    } else {
      return this.create({ data: create });
    }
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM user_settings WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },
};

export const trigger = {
  async findMany({ where, include, orderBy }: any = {}) {
    let query = 'SELECT * FROM triggers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }
    if (where?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(where.isActive);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    const triggers = result.rows.map(toCamelCase);

    // Include actions if requested
    if (include?.actions) {
      for (const trigger of triggers) {
        const actionsQuery = `
          SELECT * FROM trigger_actions
          WHERE trigger_id = $1
          ORDER BY "order" ASC
        `;
        const actionsResult = await pool.query(actionsQuery, [trigger.id]);
        trigger.actions = actionsResult.rows.map(toCamelCase);
      }
    }

    return triggers;
  },

  async findUnique({ where }: any) {
    const query = 'SELECT * FROM triggers WHERE id = $1 LIMIT 1';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO triggers (
        id, agent_id, name, is_active, condition, cancel_message, run_limit, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.name,
      data.isActive !== undefined ? data.isActive : true,
      data.condition,
      data.cancelMessage || null,
      data.runLimit || null,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.condition !== undefined) {
      updates.push(`condition = $${paramIndex++}`);
      params.push(data.condition);
    }
    if (data.cancelMessage !== undefined) {
      updates.push(`cancel_message = $${paramIndex++}`);
      params.push(data.cancelMessage);
    }
    if (data.runLimit !== undefined) {
      updates.push(`run_limit = $${paramIndex++}`);
      params.push(data.runLimit);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE triggers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    await pool.query('DELETE FROM triggers WHERE id = $1', [where.id]);
    return { id: where.id };
  },
};

export const triggerAction = {
  async deleteMany({ where }: any = {}) {
    if (where?.triggerId) {
      await pool.query('DELETE FROM trigger_actions WHERE trigger_id = $1', [where.triggerId]);
    }
    return {};
  },

  async create({ data }: any) {
    const id = randomUUID();
    const query = `
      INSERT INTO trigger_actions (id, trigger_id, action, params, "order")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      data.triggerId,
      data.action,
      data.params || null,
      data.order || 0
    ]);
    return toCamelCase(result.rows[0]);
  },
};

export const integration = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM integrations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }
    if (where?.integrationType) {
      query += ` AND integration_type = $${paramIndex++}`;
      params.push(where.integrationType);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM integrations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }
    if (where?.integrationType) {
      query += ` AND integration_type = $${paramIndex++}`;
      params.push(where.integrationType);
    }
    if (where?.isConnected !== undefined) {
      query += ` AND is_connected = $${paramIndex++}`;
      params.push(where.isConnected);
    }

    query += ' LIMIT 1';

    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO integrations (
        id, agent_id, integration_type, is_active, is_connected,
        connected_at, last_synced, settings, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.integrationType,
      data.isActive !== undefined ? data.isActive : true,
      data.isConnected !== undefined ? data.isConnected : false,
      data.connectedAt || null,
      data.lastSynced || null,
      data.settings || null,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.isConnected !== undefined) {
      updates.push(`is_connected = $${paramIndex++}`);
      params.push(data.isConnected);
    }
    if (data.connectedAt !== undefined) {
      updates.push(`connected_at = $${paramIndex++}`);
      params.push(data.connectedAt);
    }
    if (data.lastSynced !== undefined) {
      updates.push(`last_synced = $${paramIndex++}`);
      params.push(data.lastSynced);
    }
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      params.push(data.settings);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE integrations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },
};

export const agentAdvancedSettings = {
  async findUnique({ where }: any) {
    let query = 'SELECT * FROM agent_advanced_settings WHERE ';
    let param: any;

    if (where.agentId) {
      query += 'agent_id = $1';
      param = where.agentId;
    } else if (where.id) {
      query += 'id = $1';
      param = where.id;
    }

    const result = await pool.query(query, [param]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async findFirst({ where }: any) {
    return this.findUnique({ where });
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO agent_advanced_settings (
        id, agent_id, model, auto_detect_language, response_language,
        schedule_enabled, schedule_data, response_delay_seconds,
        memory_enabled, graph_enabled, context_window, semantic_search_enabled,
        fact_extraction_model, trigger_evaluation_model, chain_message_model,
        email_generation_model, instruction_parsing_model, kb_analysis_model,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.model ?? 'OpenAI GPT-4.1',
      data.autoDetectLanguage ?? false,
      data.responseLanguage ?? null,
      data.scheduleEnabled ?? false,
      data.scheduleData ?? null,
      data.responseDelaySeconds ?? 45,
      data.memoryEnabled ?? true,
      data.graphEnabled ?? true,
      data.contextWindow ?? 20,
      data.semanticSearchEnabled ?? true,
      data.factExtractionModel ?? 'openai/gpt-4o-mini',
      data.triggerEvaluationModel ?? 'openai/gpt-4o-mini',
      data.chainMessageModel ?? 'openai/gpt-4o-mini',
      data.emailGenerationModel ?? 'openai/gpt-4o-mini',
      data.instructionParsingModel ?? 'openai/gpt-4o-mini',
      data.kbAnalysisModel ?? 'anthropic/claude-3.5-sonnet',
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fields = [
      ['model', 'model'],
      ['autoDetectLanguage', 'auto_detect_language'],
      ['responseLanguage', 'response_language'],
      ['scheduleEnabled', 'schedule_enabled'],
      ['scheduleData', 'schedule_data'],
      ['responseDelaySeconds', 'response_delay_seconds'],
      ['memoryEnabled', 'memory_enabled'],
      ['graphEnabled', 'graph_enabled'],
      ['contextWindow', 'context_window'],
      ['semanticSearchEnabled', 'semantic_search_enabled'],
      ['factExtractionModel', 'fact_extraction_model'],
      ['triggerEvaluationModel', 'trigger_evaluation_model'],
      ['chainMessageModel', 'chain_message_model'],
      ['emailGenerationModel', 'email_generation_model'],
      ['instructionParsingModel', 'instruction_parsing_model'],
      ['kbAnalysisModel', 'kb_analysis_model'],
    ];

    for (const [camel, snake] of fields) {
      if (data[camel] !== undefined) {
        updates.push(`${snake} = $${paramIndex++}`);
        params.push(data[camel]);
      }
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.agentId);

    const query = `UPDATE agent_advanced_settings SET ${updates.join(', ')} WHERE agent_id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async upsert({ where, create, update }: any) {
    const existing = await this.findUnique({ where });

    if (existing) {
      return this.update({ where, data: update });
    } else {
      return this.create({ data: { ...create, agentId: where.agentId } });
    }
  },
};

// KommoToken model operations
export const kommoToken = {
  async findFirst({ where }: any) {
    let query = 'SELECT * FROM kommo_tokens WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.integrationId) {
      query += ` AND integration_id = $${paramIndex++}`;
      params.push(where.integrationId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO kommo_tokens (
        id, integration_id, access_token, refresh_token,
        expires_at, base_domain, api_domain, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.integrationId,
      data.accessToken,
      data.refreshToken,
      data.expiresAt,
      data.baseDomain,
      data.apiDomain || 'api-g.kommo.com',
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.accessToken !== undefined) {
      updates.push(`access_token = $${paramIndex++}`);
      params.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push(`refresh_token = $${paramIndex++}`);
      params.push(data.refreshToken);
    }
    if (data.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(data.expiresAt);
    }
    if (data.baseDomain !== undefined) {
      updates.push(`base_domain = $${paramIndex++}`);
      params.push(data.baseDomain);
    }
    if (data.apiDomain !== undefined) {
      updates.push(`api_domain = $${paramIndex++}`);
      params.push(data.apiDomain);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.integrationId);

    const query = `UPDATE kommo_tokens SET ${updates.join(', ')} WHERE integration_id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async upsert({ where, create, update }: any) {
    // First try to find existing
    const existing = await this.findFirst({ where });

    if (existing) {
      // Update existing
      return this.update({ where, data: update });
    } else {
      // Create new
      return this.create({ data: create });
    }
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM kommo_tokens WHERE integration_id = $1';
    await pool.query(query, [where.integrationId]);
    return { integrationId: where.integrationId };
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  }
};

// GoogleToken model operations
export const googleToken = {
  async findFirst({ where }: any) {
    let query = 'SELECT * FROM google_tokens WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.integrationId) {
      query += ` AND integration_id = $${paramIndex++}`;
      params.push(where.integrationId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO google_tokens (
        id, integration_id, access_token, refresh_token,
        expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.integrationId,
      data.accessToken,
      data.refreshToken,
      data.expiresAt,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.accessToken !== undefined) {
      updates.push(`access_token = $${paramIndex++}`);
      params.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push(`refresh_token = $${paramIndex++}`);
      params.push(data.refreshToken);
    }
    if (data.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(data.expiresAt);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.integrationId);

    const query = `UPDATE google_tokens SET ${updates.join(', ')} WHERE integration_id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async upsert({ where, create, update }: any) {
    const existing = await this.findFirst({ where });

    if (existing) {
      return this.update({ where, data: update });
    } else {
      return this.create({ data: create });
    }
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM google_tokens WHERE integration_id = $1';
    await pool.query(query, [where.integrationId]);
    return { integrationId: where.integrationId };
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM google_tokens WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.integrationId) {
      query += ` AND integration_id = $${paramIndex++}`;
      params.push(where.integrationId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  }
};

// LeadConversation model operations
export const leadConversation = {
  async findUnique({ where }: any) {
    let query = 'SELECT * FROM lead_conversations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.leadId_integrationId) {
      query += ` AND lead_id = $${paramIndex++} AND integration_id = $${paramIndex++}`;
      params.push(where.leadId_integrationId.leadId);
      params.push(where.leadId_integrationId.integrationId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO lead_conversations (
        id, agent_id, integration_id, lead_id,
        last_message_at, message_count, summary,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.integrationId,
      data.leadId,
      data.lastMessageAt || null,
      data.messageCount || 0,
      data.summary || null,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.lastMessageAt !== undefined) {
      updates.push(`last_message_at = $${paramIndex++}`);
      params.push(data.lastMessageAt);
    }
    if (data.messageCount !== undefined) {
      if (typeof data.messageCount === 'object' && data.messageCount.increment) {
        updates.push(`message_count = message_count + $${paramIndex++}`);
        params.push(data.messageCount.increment);
      } else {
        updates.push(`message_count = $${paramIndex++}`);
        params.push(data.messageCount);
      }
    }
    if (data.summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      params.push(data.summary);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE lead_conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async upsert({ where, create, update }: any) {
    const existing = await this.findUnique({ where });

    if (existing) {
      return this.update({ where: { id: existing.id }, data: update });
    } else {
      return this.create({ data: create });
    }
  },

  async updateMany({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.pausedAt !== undefined) {
      updates.push(`paused_at = $${paramIndex++}`);
      params.push(data.pausedAt);
    }
    if (data.pausedByUserId !== undefined) {
      updates.push(`paused_by_user_id = $${paramIndex++}`);
      params.push(data.pausedByUserId);
    }
    if (data.lastMessageAt !== undefined) {
      updates.push(`last_message_at = $${paramIndex++}`);
      params.push(data.lastMessageAt);
    }

    if (updates.length === 0) {
      return { count: 0 };
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    let query = `UPDATE lead_conversations SET ${updates.join(', ')} WHERE 1=1`;

    if (where?.integrationId) {
      query += ` AND integration_id = $${paramIndex++}`;
      params.push(where.integrationId);
    }
    if (where?.leadId) {
      query += ` AND lead_id = $${paramIndex++}`;
      params.push(where.leadId);
    }

    const result = await pool.query(query);
    return { count: result.rowCount || 0 };
  },
};

// LeadMessage model operations
export const leadMessage = {
  async findMany({ where, orderBy, take, select: _select }: any) {
    let query = 'SELECT * FROM lead_messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.conversationId) {
      query += ` AND conversation_id = $${paramIndex++}`;
      params.push(where.conversationId);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    if (take) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(take);
    }

    const result = await pool.query(query, params);
    return result.rows.map((row: any) => toCamelCase(row));
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO lead_messages (
        id, conversation_id, channel, role, content,
        email_subject, email_from, email_to, chat_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.conversationId,
      data.channel,
      data.role,
      data.content,
      data.emailSubject || null,
      data.emailFrom || null,
      data.emailTo || null,
      data.chatId || null,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },
};

// GoogleCalendarEmployee model operations
export const googleCalendarEmployee = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM google_calendar_employees WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }
    if (where?.crmUserId) {
      query += ` AND crm_user_id = $${paramIndex++}`;
      params.push(where.crmUserId);
    }
    if (where?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(where.status);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM google_calendar_employees WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }
    if (where?.crmUserId) {
      query += ` AND crm_user_id = $${paramIndex++}`;
      params.push(where.crmUserId);
    }
    if (where?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(where.status);
    }
    if (where?.inviteToken) {
      query += ` AND invite_token = $${paramIndex++}`;
      params.push(where.inviteToken);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async findUnique({ where }: any) {
    let query = 'SELECT * FROM google_calendar_employees WHERE ';
    let param: any;

    if (where.id) {
      query += 'id = $1';
      param = where.id;
    } else if (where.inviteToken) {
      query += 'invite_token = $1';
      param = where.inviteToken;
    }

    const result = await pool.query(query, [param]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO google_calendar_employees (
        id, agent_id, crm_user_id, crm_user_name, google_email,
        access_token, refresh_token, expires_at, invite_token,
        invite_expires_at, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.agentId,
      data.crmUserId,
      data.crmUserName,
      data.googleEmail || null,
      data.accessToken || null,
      data.refreshToken || null,
      data.expiresAt || null,
      data.inviteToken,
      data.inviteExpiresAt,
      data.status || 'pending',
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.googleEmail !== undefined) {
      updates.push(`google_email = $${paramIndex++}`);
      params.push(data.googleEmail);
    }
    if (data.accessToken !== undefined) {
      updates.push(`access_token = $${paramIndex++}`);
      params.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push(`refresh_token = $${paramIndex++}`);
      params.push(data.refreshToken);
    }
    if (data.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      params.push(data.expiresAt);
    }
    if (data.inviteToken !== undefined) {
      updates.push(`invite_token = $${paramIndex++}`);
      params.push(data.inviteToken);
    }
    if (data.inviteExpiresAt !== undefined) {
      updates.push(`invite_expires_at = $${paramIndex++}`);
      params.push(data.inviteExpiresAt);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.updatedAt !== undefined) {
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(data.updatedAt);
    } else {
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
    }

    params.push(where.id);

    const query = `UPDATE google_calendar_employees SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM google_calendar_employees WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },
};

// TrainingSource model operations
export const trainingSource = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM training_sources WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isBuiltIn !== undefined) {
      query += ` AND is_built_in = $${paramIndex++}`;
      params.push(where.isBuiltIn);
    }
    if (where?.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(where.category);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (orderBy?.name) {
      query += ` ORDER BY name ${orderBy.name === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM training_sources WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isBuiltIn !== undefined) {
      query += ` AND is_built_in = $${paramIndex++}`;
      params.push(where.isBuiltIn);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  },

  async create({ data }: any) {
    const id = data.id || randomUUID(); // Allow custom ID for built-in copies
    const now = new Date().toISOString();

    const query = `
      INSERT INTO training_sources (
        id, name, author, description, category, content,
        is_built_in, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.name,
      data.author || null,
      data.description || null,
      data.category,
      data.content,
      data.isBuiltIn || false,
      data.userId || null,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.author !== undefined) {
      updates.push(`author = $${paramIndex++}`);
      params.push(data.author);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(data.content);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE training_sources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM training_sources WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM training_sources WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },
};

// TrainingRole model operations
export const trainingRole = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM training_roles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isBuiltIn !== undefined) {
      query += ` AND is_built_in = $${paramIndex++}`;
      params.push(where.isBuiltIn);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (orderBy?.name) {
      query += ` ORDER BY name ${orderBy.name === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async findFirst({ where }: any) {
    let query = 'SELECT * FROM training_roles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isBuiltIn !== undefined) {
      query += ` AND is_built_in = $${paramIndex++}`;
      params.push(where.isBuiltIn);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async findUnique({ where }: any) {
    return this.findFirst({ where });
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO training_roles (
        id, name, description, icon, source_ids,
        is_built_in, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.name,
      data.description || null,
      data.icon || 'briefcase',
      data.sourceIds || '[]',
      data.isBuiltIn || false,
      data.userId || null,
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      params.push(data.icon);
    }
    if (data.sourceIds !== undefined) {
      updates.push(`source_ids = $${paramIndex++}`);
      params.push(data.sourceIds);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(where.id);

    const query = `UPDATE training_roles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM training_roles WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM training_roles WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },
};

// Notification model operations
export const notification = {
  async findMany({ where, orderBy, take }: any = {}) {
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isRead !== undefined) {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(where.isRead);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    if (take) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(take);
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at, title_key, message_key, params)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.userId,
      data.type,
      data.title,
      data.message,
      data.isRead !== undefined ? data.isRead : true,
      now,
      data.titleKey || null,
      data.messageKey || null,
      data.params || null
    ]);

    return toCamelCase(result.rows[0]);
  },

  async updateMany({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.isRead !== undefined) {
      updates.push(`is_read = $${paramIndex++}`);
      params.push(data.isRead);
    }

    if (updates.length === 0) {
      return { count: 0 };
    }

    let query = `UPDATE notifications SET ${updates.join(', ')} WHERE 1=1`;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isRead !== undefined) {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(where.isRead);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM notifications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async count({ where }: any = {}) {
    let query = 'SELECT COUNT(*)::int as count FROM notifications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.isRead !== undefined) {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(where.isRead);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  },
};

// TestConversation model operations
export const testConversation = {
  async findMany({ where, orderBy, include }: any = {}) {
    let query = 'SELECT * FROM test_conversations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }

    if (orderBy?.updatedAt) {
      query += ` ORDER BY updated_at ${orderBy.updatedAt === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    const conversations = result.rows.map(toCamelCase);

    // Include messages if requested
    if (include?.messages) {
      for (const conv of conversations) {
        const msgQuery = `
          SELECT * FROM test_conversation_messages
          WHERE conversation_id = $1
          ORDER BY created_at ${include.messages.orderBy?.createdAt === 'desc' ? 'DESC' : 'ASC'}
          ${include.messages.take ? `LIMIT ${include.messages.take}` : ''}
        `;
        const msgResult = await pool.query(msgQuery, [conv.id]);
        conv.messages = msgResult.rows.map(toCamelCase);
      }
    }

    return conversations;
  },

  async findFirst({ where, include }: any) {
    let query = 'SELECT * FROM test_conversations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }
    if (where?.agentId) {
      query += ` AND agent_id = $${paramIndex++}`;
      params.push(where.agentId);
    }

    query += ' LIMIT 1';
    const result = await pool.query(query, params);

    if (!result.rows[0]) return null;

    const conv = toCamelCase(result.rows[0]);

    // Include messages if requested
    if (include?.messages) {
      const msgQuery = `
        SELECT * FROM test_conversation_messages
        WHERE conversation_id = $1
        ORDER BY created_at ${include.messages.orderBy?.createdAt === 'desc' ? 'DESC' : 'ASC'}
      `;
      const msgResult = await pool.query(msgQuery, [conv.id]);
      conv.messages = msgResult.rows.map(toCamelCase);
    }

    return conv;
  },

  async findUnique({ where, include }: any) {
    return this.findFirst({ where, include });
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO test_conversations (id, user_id, agent_id, title, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.userId,
      data.agentId,
      data.title || 'Новый разговор',
      now,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async update({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.updatedAt !== undefined) {
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(data.updatedAt);
    } else {
      updates.push(`updated_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
    }

    params.push(where.id);

    const query = `UPDATE test_conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async updateMany({ where, data }: any) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }

    if (updates.length === 0) {
      return { count: 0 };
    }

    let query = `UPDATE test_conversations SET ${updates.join(', ')} WHERE 1=1`;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },

  async delete({ where }: any) {
    const query = 'DELETE FROM test_conversations WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [where.id]);
    return result.rows[0] ? toCamelCase(result.rows[0]) : null;
  },

  async deleteMany({ where }: any) {
    let query = 'DELETE FROM test_conversations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.id) {
      query += ` AND id = $${paramIndex++}`;
      params.push(where.id);
    }
    if (where?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(where.userId);
    }

    const result = await pool.query(query, params);
    return { count: result.rowCount || 0 };
  },
};

// TestConversationMessage model operations
export const testConversationMessage = {
  async findMany({ where, orderBy }: any = {}) {
    let query = 'SELECT * FROM test_conversation_messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.conversationId) {
      query += ` AND conversation_id = $${paramIndex++}`;
      params.push(where.conversationId);
    }
    if (where?.role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(where.role);
    }

    if (orderBy?.createdAt) {
      query += ` ORDER BY created_at ${orderBy.createdAt === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map(toCamelCase);
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO test_conversation_messages (id, conversation_id, role, content, sources, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.conversationId,
      data.role,
      data.content,
      data.sources || null,
      now
    ]);

    return toCamelCase(result.rows[0]);
  },

  async count({ where }: any = {}) {
    let query = 'SELECT COUNT(*)::int as count FROM test_conversation_messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (where?.conversationId) {
      query += ` AND conversation_id = $${paramIndex++}`;
      params.push(where.conversationId);
    }
    if (where?.role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(where.role);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  },
};

// Export as prisma-like object
export const prisma = {
  agent: { ...agent, count: agent.count },
  user,
  kbCategory,
  kbArticle,
  contact,
  deal,
  userSettings,
  chatLog,
  trigger,
  triggerAction,
  integration,
  agentAdvancedSettings,
  kommoToken,
  googleToken,
  leadConversation,
  leadMessage,
  googleCalendarEmployee,
  trainingSource,
  trainingRole,
  notification,
  testConversation,
  testConversationMessage,
  $connect: async () => {
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully (PostgreSQL on Supabase)');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  },
  $disconnect: async () => {
    await pool.end();
    console.log('👋 Database disconnected');
  },
};

// Initialize connection
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
