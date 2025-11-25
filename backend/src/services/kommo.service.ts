import fetch from 'node-fetch';
import { prisma } from '../config/database';

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
  apiDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store Kommo OAuth tokens in database
 */
export async function storeTokens(
  integrationId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number, // seconds
  baseDomain: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.kommoToken.upsert({
    where: { integrationId },
    create: {
      integrationId,
      accessToken,
      refreshToken,
      expiresAt,
      baseDomain,
      apiDomain: baseDomain, // Use baseDomain from token, not hardcoded api-g.kommo.com
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
      baseDomain,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get stored tokens for integration
 */
export async function getTokens(integrationId: string): Promise<KommoTokens | null> {
  const token = await prisma.kommoToken.findUnique({
    where: { integrationId },
  });

  if (!token) {
    return null;
  }

  return {
    id: token.id,
    integrationId: token.integrationId,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    baseDomain: token.baseDomain,
    apiDomain: token.apiDomain || token.baseDomain, // Fallback to baseDomain
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
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
  integrationId: string
): Promise<{ token: string; baseDomain: string; apiDomain: string }> {
  console.log('🔍 Getting valid access token for integration:', integrationId);

  let tokens = await getTokens(integrationId);

  if (!tokens) {
    console.error('❌ No tokens found for integration:', integrationId);
    throw new Error('No tokens found for integration');
  }

  console.log('✅ Tokens found:', {
    integrationId: tokens.integrationId,
    baseDomain: tokens.baseDomain,
    apiDomain: tokens.apiDomain,
    expiresAt: tokens.expiresAt,
    isExpired: isTokenExpired(tokens),
  });

  // Refresh if expired
  if (isTokenExpired(tokens)) {
    console.log('⏰ Token expired, refreshing...');
    tokens = await refreshAccessToken(tokens);
  }

  // ВАЖНО: Используем apiDomain из БД, если нет - используем baseDomain
  // Некоторые Kommo аккаунты работают только с конкретным поддоменом
  const apiDomain = tokens.apiDomain || tokens.baseDomain;

  console.log('🎯 Returning valid token with apiDomain:', apiDomain);

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

export interface KommoCustomField {
  id: number;
  name: string;
  field_type: string;
  sort: number;
  code: string | null;
  is_multiple: boolean;
  is_system: boolean;
  is_editable: boolean;
  is_required: boolean;
  settings: any;
  remind: string | null;
  enums?: Array<{
    id: number;
    value: string;
    sort: number;
  }>;
}

export interface KommoTaskType {
  id: number;
  name: string;
  code: string | null;
  color: string | null;
  icon_id: number | null;
}

/**
 * Fetch a specific lead by ID from Kommo
 */
export async function fetchLeadById(
  integrationId: string,
  leadId: number
): Promise<KommoLead> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string,
  options: { limit?: number; page?: number; with?: string } = {}
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ _embedded: { contacts: KommoContact[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ _embedded: { companies: KommoCompany[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string
): Promise<{ _embedded: { pipelines: KommoPipeline[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string
): Promise<{ _embedded: { users: KommoUser[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<{ _embedded: { users: KommoUser[] } }>(
    apiDomain,
    token,
    '/api/v4/users'
  );
}

/**
 * Fetch lead custom fields from Kommo
 */
export async function fetchLeadsCustomFields(
  integrationId: string
): Promise<{ _embedded: { custom_fields: KommoCustomField[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<{ _embedded: { custom_fields: KommoCustomField[] } }>(
    apiDomain,
    token,
    '/api/v4/leads/custom_fields'
  );
}

/**
 * Fetch contact custom fields from Kommo
 */
export async function fetchContactsCustomFields(
  integrationId: string
): Promise<{ _embedded: { custom_fields: KommoCustomField[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<{ _embedded: { custom_fields: KommoCustomField[] } }>(
    apiDomain,
    token,
    '/api/v4/contacts/custom_fields'
  );
}

/**
 * Fetch task types from Kommo
 */
export async function fetchTaskTypes(
  integrationId: string
): Promise<{ _embedded: { task_types: KommoTaskType[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<{ _embedded: { task_types: KommoTaskType[] } }>(
    apiDomain,
    token,
    '/api/v4/tasks'
  );
}

/**
 * Create a new lead in Kommo
 */
export async function createLead(
  integrationId: string,
  leadData: Partial<KommoLead>
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string,
  leadId: number,
  leadData: Partial<KommoLead>
): Promise<{ _embedded: { leads: KommoLead[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
  integrationId: string,
  leadId: number,
  noteText: string
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

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
