import fetch from 'node-fetch';
import { Pool } from 'pg';

// Kommo OAuth Configuration
const KOMMO_CLIENT_ID = process.env.KOMMO_CLIENT_ID || '';
const KOMMO_CLIENT_SECRET = process.env.KOMMO_CLIENT_SECRET || '';
const KOMMO_REDIRECT_URI = process.env.KOMMO_REDIRECT_URI || 'http://localhost:3001/api/kommo/callback';

// Rate Limiting: 7 requests per second
const RATE_LIMIT_REQUESTS = 7;
const RATE_LIMIT_WINDOW = 1000; // 1 second in ms
let requestQueue: Array<() => void> = [];
let requestsInWindow = 0;
let windowStartTime = Date.now();

/**
 * Rate limiter for Kommo API (7 req/sec)
 */
async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      const now = Date.now();

      // Reset window if 1 second has passed
      if (now - windowStartTime >= RATE_LIMIT_WINDOW) {
        requestsInWindow = 0;
        windowStartTime = now;
      }

      // If under limit, execute immediately
      if (requestsInWindow < RATE_LIMIT_REQUESTS) {
        requestsInWindow++;
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        // Process next queued request
        if (requestQueue.length > 0) {
          const nextRequest = requestQueue.shift();
          if (nextRequest) {
            setTimeout(nextRequest, Math.ceil(RATE_LIMIT_WINDOW / RATE_LIMIT_REQUESTS));
          }
        }
      } else {
        // Queue the request
        requestQueue.push(executeRequest);
      }
    };

    executeRequest();
  });
}

// ============================================================================
// Token Management
// ============================================================================

export interface KommoTokens {
  id: string;
  integrationId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  baseDomain: string;
  apiDomain?: string; // Added for api-g.kommo.com
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store Kommo OAuth tokens in database
 */
export async function storeTokens(
  pool: Pool,
  integrationId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number, // seconds
  baseDomain: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const query = `
    INSERT INTO kommo_tokens (id, integration_id, access_token, refresh_token, expires_at, base_domain, created_at, updated_at)
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (integration_id)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      base_domain = EXCLUDED.base_domain,
      updated_at = NOW()
  `;

  await pool.query(query, [integrationId, accessToken, refreshToken, expiresAt, baseDomain]);
}

/**
 * Get stored tokens for integration
 */
export async function getTokens(pool: Pool, integrationId: string): Promise<KommoTokens | null> {
  const result = await pool.query(
    'SELECT * FROM kommo_tokens WHERE integration_id = $1',
    [integrationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    integrationId: row.integration_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: new Date(row.expires_at),
    baseDomain: row.base_domain,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Check if access token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: KommoTokens): boolean {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return tokens.expiresAt.getTime() < fiveMinutesFromNow;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  pool: Pool,
  tokens: KommoTokens
): Promise<KommoTokens> {
  const response = await fetch(`https://${tokens.baseDomain}/oauth2/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: KOMMO_CLIENT_ID,
      client_secret: KOMMO_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      redirect_uri: KOMMO_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data: any = await response.json();

  // Store new tokens
  await storeTokens(
    pool,
    tokens.integrationId,
    data.access_token,
    data.refresh_token,
    data.expires_in,
    tokens.baseDomain
  );

  // Return updated tokens
  return {
    ...tokens,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    updatedAt: new Date(),
  };
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(
  pool: Pool,
  integrationId: string
): Promise<{ token: string; baseDomain: string; apiDomain: string }> {
  let tokens = await getTokens(pool, integrationId);

  if (!tokens) {
    throw new Error('No tokens found for integration');
  }

  // Refresh if expired
  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken(pool, tokens);
  }

  // Use api-g.kommo.com for all API requests (global API endpoint)
  const apiDomain = tokens.apiDomain || 'api-g.kommo.com';

  return {
    token: tokens.accessToken,
    baseDomain: tokens.baseDomain,
    apiDomain,
  };
}

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Generate Kommo OAuth authorization URL
 */
export function getAuthorizationUrl(baseDomain: string, state: string): string {
  const params = new URLSearchParams({
    client_id: KOMMO_CLIENT_ID,
    redirect_uri: KOMMO_REDIRECT_URI,
    response_type: 'code',
    state,
    mode: 'post_message', // or 'popup' or 'redirect'
  });

  return `https://${baseDomain}/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  referer: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  baseDomain: string;
}> {
  // Extract base domain from referer
  const baseDomain = new URL(referer).hostname;

  const response = await fetch(`https://${baseDomain}/oauth2/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: KOMMO_CLIENT_ID,
      client_secret: KOMMO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: KOMMO_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    baseDomain,
  };
}

// ============================================================================
// Kommo API Client
// ============================================================================

interface KommoApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  query?: Record<string, string | number>;
}

/**
 * Make authenticated request to Kommo API with rate limiting
 */
async function kommoApiRequest<T>(
  apiDomain: string,
  accessToken: string,
  endpoint: string,
  options: KommoApiOptions = {}
): Promise<T> {
  return rateLimitedRequest(async () => {
    const { method = 'GET', body, query } = options;

    // Build URL with query params (use apiDomain for all API requests)
    const url = new URL(`https://${apiDomain}${endpoint}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kommo API error: ${response.status} ${error}`);
    }

    return await response.json() as T;
  });
}

// ============================================================================
// Kommo API Methods
// ============================================================================

export interface KommoLead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  group_id: number;
  status_id: number;
  pipeline_id: number;
  loss_reason_id: number | null;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  closest_task_at: number | null;
  is_deleted: boolean;
  custom_fields_values: any[] | null;
  score: number | null;
  account_id: number;
  _embedded?: {
    contacts?: KommoContact[];
    companies?: KommoCompany[];
  };
}

export interface KommoContact {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  responsible_user_id: number;
  group_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  closest_task_at: number | null;
  custom_fields_values: any[] | null;
  account_id: number;
}

export interface KommoCompany {
  id: number;
  name: string;
  responsible_user_id: number;
  group_id: number;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  closest_task_at: number | null;
  custom_fields_values: any[] | null;
  account_id: number;
}

export interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded: {
    statuses: KommoStatus[];
  };
}

export interface KommoStatus {
  id: number;
  name: string;
  sort: number;
  is_editable: boolean;
  pipeline_id: number;
  color: string;
  type: number;
  account_id: number;
}

export interface KommoUser {
  id: number;
  name: string;
  email: string;
  lang: string;
  rights: {
    leads: any;
    contacts: any;
    companies: any;
    tasks: any;
    mail_access: boolean;
    catalog_access: boolean;
    is_admin: boolean;
    is_free: boolean;
    is_active: boolean;
    group_id: number | null;
  };
}

/**
 * Fetch a specific lead by ID from Kommo
 */
export async function fetchLeadById(
  pool: Pool,
  integrationId: string,
  leadId: number
): Promise<KommoLead> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest<KommoLead>(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}`,
    {}
  );
}

/**
 * Fetch leads from Kommo
 */
export async function fetchLeads(
  pool: Pool,
  integrationId: string,
  options: { limit?: number; page?: number; with?: string } = {}
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  const query: Record<string, string | number> = {};
  if (options.limit) query.limit = options.limit;
  if (options.page) query.page = options.page;
  if (options.with) query.with = options.with;

  return kommoApiRequest<{ _embedded: { leads: KommoLead[] } }>(
    apiDomain,
    token,
    '/api/v4/leads',
    { query }
  );
}

/**
 * Fetch contacts from Kommo
 */
export async function fetchContacts(
  pool: Pool,
  integrationId: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ _embedded: { contacts: KommoContact[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  const query: Record<string, string | number> = {};
  if (options.limit) query.limit = options.limit;
  if (options.page) query.page = options.page;

  return kommoApiRequest<{ _embedded: { contacts: KommoContact[] } }>(
    apiDomain,
    token,
    '/api/v4/contacts',
    { query }
  );
}

/**
 * Fetch companies from Kommo
 */
export async function fetchCompanies(
  pool: Pool,
  integrationId: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ _embedded: { companies: KommoCompany[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  const query: Record<string, string | number> = {};
  if (options.limit) query.limit = options.limit;
  if (options.page) query.page = options.page;

  return kommoApiRequest<{ _embedded: { companies: KommoCompany[] } }>(
    apiDomain,
    token,
    '/api/v4/companies',
    { query }
  );
}

/**
 * Fetch pipelines and stages from Kommo
 */
export async function fetchPipelines(
  pool: Pool,
  integrationId: string
): Promise<{ _embedded: { pipelines: KommoPipeline[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest<{ _embedded: { pipelines: KommoPipeline[] } }>(
    apiDomain,
    token,
    '/api/v4/leads/pipelines'
  );
}

/**
 * Fetch users from Kommo
 */
export async function fetchUsers(
  pool: Pool,
  integrationId: string
): Promise<{ _embedded: { users: KommoUser[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest<{ _embedded: { users: KommoUser[] } }>(
    apiDomain,
    token,
    '/api/v4/users'
  );
}

/**
 * Create a new lead in Kommo
 */
export async function createLead(
  pool: Pool,
  integrationId: string,
  leadData: Partial<KommoLead>
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest<{ _embedded: { leads: KommoLead[] } }>(
    apiDomain,
    token,
    '/api/v4/leads',
    {
      method: 'POST',
      body: [leadData],
    }
  );
}

/**
 * Update a lead in Kommo
 */
export async function updateLead(
  pool: Pool,
  integrationId: string,
  leadId: number,
  leadData: Partial<KommoLead>
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest<{ _embedded: { leads: KommoLead[] } }>(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}`,
    {
      method: 'PATCH',
      body: leadData,
    }
  );
}

/**
 * Create a note for a lead
 */
export async function createLeadNote(
  pool: Pool,
  integrationId: string,
  leadId: number,
  noteText: string
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(pool, integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}/notes`,
    {
      method: 'POST',
      body: [
        {
          note_type: 'common',
          params: {
            text: noteText,
          },
        },
      ],
    }
  );
}

// ============================================================================
// Webhook Helpers
// ============================================================================

/**
 * Verify webhook signature (if Kommo supports it)
 * Note: Kommo webhooks may not have signature verification,
 * so you may need to validate by IP or other means
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Implement if Kommo provides webhook signatures
  // For now, return true (no verification)
  return true;
}

/**
 * Parse webhook payload
 */
export interface KommoWebhookPayload {
  'leads[add]'?: Array<{ id: number; status_id: number }>;
  'leads[update]'?: Array<{ id: number; status_id: number }>;
  'leads[delete]'?: Array<{ id: number }>;
  'leads[status]'?: Array<{ id: number; status_id: number; old_status_id: number }>;
  'contacts[add]'?: Array<{ id: number }>;
  'contacts[update]'?: Array<{ id: number }>;
  'contacts[delete]'?: Array<{ id: number }>;
  'companies[add]'?: Array<{ id: number }>;
  'companies[update]'?: Array<{ id: number }>;
  'companies[delete]'?: Array<{ id: number }>;
}

export function parseWebhookPayload(body: any): KommoWebhookPayload {
  return body as KommoWebhookPayload;
}
