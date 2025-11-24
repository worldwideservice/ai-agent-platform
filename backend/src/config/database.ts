import { Pool, QueryResult } from 'pg';
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

// Helper to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

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
        crm_type, crm_connected, crm_data, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
  async findUnique({ where, select }: any) {
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

    return row;
  },

  async create({ data }: any) {
    const id = randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO users (
        id, email, password, name, role,
        current_plan, trial_ends_at, responses_used, responses_limit,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      data.responsesLimit || 5000,
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

// Simplified stubs for other models (to be fully implemented as needed)
export const kbCategory = {
  async findMany() { return []; },
  async create() { return null; },
};

export const kbArticle = {
  async findMany({ where, include }: any = {}) {
    let query = 'SELECT * FROM kb_articles WHERE 1=1';
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
};

export const contact = {
  async findMany() { return []; },
  async create() { return null; },
};

export const deal = {
  async findMany() { return []; },
  async create() { return null; },
};

export const userSettings = {
  async findUnique() { return null; },
  async create() { return null; },
};

export const trigger = {
  async findMany() { return []; },
  async findUnique() { return null; },
  async create() { return null; },
  async update() { return null; },
  async delete() { return null; },
};

export const triggerAction = {
  async deleteMany() { return {}; },
};

export const chain = {
  async findMany() { return []; },
  async findUnique() { return null; },
  async create() { return null; },
  async update() { return null; },
  async delete() { return null; },
};

export const chainCondition = {
  async deleteMany() { return {}; },
};

export const chainStep = {
  async deleteMany() { return {}; },
};

export const chainStepAction = {
  async deleteMany() { return {}; },
};

export const chainSchedule = {
  async deleteMany() { return {}; },
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
  async findUnique() { return null; },
  async create() { return null; },
  async update() { return null; },
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
  chain,
  chainCondition,
  chainStep,
  chainStepAction,
  chainSchedule,
  integration,
  agentAdvancedSettings,
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
