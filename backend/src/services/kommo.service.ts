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

export interface KommoSalesbot {
  id: number;
  name: string;
  pipeline_id: number;
  status_id: number | null;
  is_active: boolean;
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
 * Fetch a specific contact by ID from Kommo
 */
export async function fetchContactById(
  integrationId: string,
  contactId: number
): Promise<KommoContact> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<KommoContact>(
    apiDomain,
    token,
    `/api/v4/contacts/${contactId}`,
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
 * Kommo Source/Channel interface
 */
export interface KommoSource {
  id: number;
  name: string;
  pipeline_id: number;
  external_id?: string;
  default?: boolean;
  origin_code?: string;
  type?: string;
  services?: Array<{
    type: string;
    pages?: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

/**
 * Fetch sources/channels from Kommo (WhatsApp, Telegram, etc.)
 * Tries multiple endpoints: /api/v4/sources, /api/v4/account with amojo
 */
export async function fetchSources(
  integrationId: string
): Promise<{ _embedded: { sources: KommoSource[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  console.log(`🔍 Fetching sources/channels from Kommo`);

  // Try 1: Get account info with amojo_id (chat system)
  try {
    const accountUrl = `https://${apiDomain}/api/v4/account?with=amojo_id,amojo_rights`;
    console.log(`📡 Trying account endpoint: ${accountUrl}`);

    const accountResponse = await fetch(accountUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (accountResponse.ok) {
      const accountData = await accountResponse.json() as { amojo_id?: string };
      console.log(`📊 Account data:`, JSON.stringify(accountData, null, 2));

      // If account has amojo_id, try to get chat channels
      if (accountData.amojo_id) {
        console.log(`🔗 Found amojo_id: ${accountData.amojo_id}`);

        // Try amojo API for chat sources
        console.log(`📡 Amojo endpoint: https://amojo.kommo.com/v2/origin/custom/${accountData.amojo_id}/connect`);
        console.log(`📡 Checking amojo channels...`);
      }
    }
  } catch (accountError: any) {
    console.log(`⚠️ Account endpoint error: ${accountError.message}`);
  }

  // Try 2: Direct sources endpoint
  try {
    const sourcesUrl = `https://${apiDomain}/api/v4/sources`;
    const response = await fetch(sourcesUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Sources response status: ${response.status}`);

    if (response.ok && response.status !== 204) {
      const text = await response.text();
      if (text && text.trim()) {
        const result = JSON.parse(text);
        console.log(`✅ Found ${result._embedded?.sources?.length || 0} sources from /api/v4/sources`);
        return result;
      }
    }
  } catch (error: any) {
    console.log(`⚠️ Sources endpoint error: ${error.message}`);
  }

  // Try 3: Get pipelines with sources (sources can be attached to pipelines)
  try {
    const pipelinesUrl = `https://${apiDomain}/api/v4/leads/pipelines?with=sources`;
    const response = await fetch(pipelinesUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const sources: KommoSource[] = [];
      const seenIds = new Set<number>();

      // Extract sources from pipelines
      for (const pipeline of data._embedded?.pipelines || []) {
        if (pipeline._embedded?.sources) {
          for (const source of pipeline._embedded.sources) {
            if (!seenIds.has(source.id)) {
              seenIds.add(source.id);
              sources.push({
                id: source.id,
                name: source.name,
                pipeline_id: pipeline.id,
                external_id: source.external_id,
                origin_code: source.origin_code,
                type: source.type,
                services: source.services,
              });
            }
          }
        }
      }

      if (sources.length > 0) {
        console.log(`✅ Found ${sources.length} sources from pipelines`);
        return { _embedded: { sources } };
      }
    }
  } catch (error: any) {
    console.log(`⚠️ Pipelines with sources error: ${error.message}`);
  }

  // Try 4: Get chats and extract unique channel types
  try {
    const chatsUrl = `https://${apiDomain}/api/v4/chats?limit=50`;
    console.log(`📡 Trying chats endpoint: ${chatsUrl}`);

    const response = await fetch(chatsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const chats = data._embedded?.chats || [];
      console.log(`💬 Found ${chats.length} chats`);

      // Extract unique channel types from chats
      const channelMap = new Map<string, { id: string; name: string; type: string }>();

      for (const chat of chats) {
        // Each chat has origin info
        const origin = chat.origin || {};
        const sourceId = origin.source_id || chat.source_id;
        const sourceName = origin.source_name || chat.source_name || origin.origin || 'Unknown';
        const sourceType = origin.origin || chat.origin_type || 'unknown';

        if (sourceId && !channelMap.has(sourceId)) {
          channelMap.set(sourceId, {
            id: sourceId,
            name: sourceName,
            type: sourceType,
          });
        }
      }

      if (channelMap.size > 0) {
        const sources: KommoSource[] = Array.from(channelMap.values()).map(ch => ({
          id: parseInt(ch.id) || 0,
          name: ch.name,
          pipeline_id: 0,
          origin_code: ch.type,
          type: ch.type,
        }));
        console.log(`✅ Found ${sources.length} unique channels from chats:`, sources.map(s => s.name));
        return { _embedded: { sources } };
      }
    }
  } catch (error: any) {
    console.log(`⚠️ Chats endpoint error: ${error.message}`);
  }

  console.log(`⚠️ No sources found from any endpoint`);
  return { _embedded: { sources: [] } };
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
 * Fetch salesbots from Kommo
 * Endpoint: /api/v4/bots (согласно библиотеке ufee/amoapi)
 * Структура ответа: { _embedded: { items: [...] } }
 */
export async function fetchSalesbots(
  integrationId: string
): Promise<{ _embedded: { bots: KommoSalesbot[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  try {
    console.log(`🔍 Fetching salesbots from /api/v4/bots`);
    const result = await kommoApiRequest<any>(
      apiDomain,
      token,
      '/api/v4/bots',
      { method: 'GET', query: { page: 1, limit: 250 } }
    );

    console.log('🤖 Salesbots raw response:', JSON.stringify(result, null, 2));

    // Согласно библиотеке ufee/amoapi, данные в _embedded.items
    const bots = result?._embedded?.items || result?._embedded?.bots || [];

    console.log(`✅ Salesbots loaded: ${bots.length}`);
    return { _embedded: { bots } };
  } catch (error: any) {
    console.log('⚠️ Salesbots endpoint error:', error?.message || error);
    return { _embedded: { bots: [] } };
  }
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
// Trigger Action Functions
// ============================================================================

/**
 * Update a contact in Kommo
 */
export async function updateContact(
  integrationId: string,
  contactId: number,
  contactData: Partial<any>
): Promise<{ _embedded: { contacts: any[] } }> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest<{ _embedded: { contacts: any[] } }>(
    apiDomain,
    token,
    `/api/v4/contacts/${contactId}`,
    {
      method: 'PATCH',
      body: contactData,
    }
  );
}

/**
 * Create a note for a contact
 */
export async function createContactNote(
  integrationId: string,
  contactId: number,
  noteText: string
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/contacts/${contactId}/notes`,
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

/**
 * Create a task in Kommo
 */
export async function createTask(
  integrationId: string,
  taskData: {
    text: string;
    complete_till: number; // Unix timestamp
    entity_id: number;
    entity_type: 'leads' | 'contacts' | 'companies';
    responsible_user_id?: number;
    task_type_id?: number;
  }
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    '/api/v4/tasks',
    {
      method: 'POST',
      body: [taskData],
    }
  );
}

/**
 * Add tags to a lead/deal in Kommo
 */
export async function addLeadTags(
  integrationId: string,
  leadId: number,
  tags: string[]
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  // Kommo expects tags as array of objects with name
  const tagsData = tags.map(tag => ({ name: tag }));

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}`,
    {
      method: 'PATCH',
      body: {
        _embedded: {
          tags: tagsData,
        },
      },
    }
  );
}

/**
 * Add tags to a contact in Kommo
 */
export async function addContactTags(
  integrationId: string,
  contactId: number,
  tags: string[]
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  const tagsData = tags.map(tag => ({ name: tag }));

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/contacts/${contactId}`,
    {
      method: 'PATCH',
      body: {
        _embedded: {
          tags: tagsData,
        },
      },
    }
  );
}

/**
 * Run a salesbot for a lead
 * Note: This uses the Salesbot API which may require specific permissions
 */
export async function runSalesbot(
  integrationId: string,
  salesbotId: number,
  leadId: number
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/bots/${salesbotId}/trigger`,
    {
      method: 'POST',
      body: {
        entity_id: leadId,
        entity_type: 'lead',
      },
    }
  );
}

/**
 * Send a message via Kommo Chat API
 * Note: This requires the Chats API and a connected chat channel
 */
export async function sendChatMessage(
  integrationId: string,
  chatId: string,
  message: string
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/chats/${chatId}/messages`,
    {
      method: 'POST',
      body: {
        text: message,
      },
    }
  );
}

/**
 * Send a file message via Kommo Chat API
 * @param integrationId ID интеграции
 * @param chatId ID чата
 * @param fileUrl Публичный URL файла (доступный Kommo серверам)
 * @param fileName Имя файла
 * @param fileSize Размер файла в байтах
 * @param mimeType MIME тип файла
 */
export async function sendChatFileMessage(
  integrationId: string,
  chatId: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  // Определяем тип сообщения на основе MIME типа
  let messageType: 'file' | 'picture' | 'video' = 'file';
  if (mimeType.startsWith('image/')) {
    messageType = 'picture';
  } else if (mimeType.startsWith('video/')) {
    messageType = 'video';
  }

  console.log(`📤 Sending ${messageType} message to chat ${chatId}: ${fileName}`);
  console.log(`   URL: ${fileUrl}`);
  console.log(`   Size: ${fileSize} bytes, Type: ${mimeType}`);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/chats/${chatId}/messages`,
    {
      method: 'POST',
      body: {
        type: messageType,
        media: fileUrl,
        file_name: fileName,
        file_size: fileSize,
      },
    }
  );
}

/**
 * Get contact's email from lead's linked contacts
 */
export async function getLeadContactEmail(
  integrationId: string,
  leadId: number
): Promise<string | null> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  try {
    // Fetch lead with contacts
    const lead = await kommoApiRequest<any>(
      apiDomain,
      token,
      `/api/v4/leads/${leadId}`,
      { query: { with: 'contacts' } }
    );

    const contacts = lead._embedded?.contacts || [];
    if (contacts.length === 0) {
      console.log(`⚠️ Lead ${leadId} has no linked contacts`);
      return null;
    }

    // Get first contact's details
    const contactId = contacts[0].id;
    const contact = await kommoApiRequest<KommoContact>(
      apiDomain,
      token,
      `/api/v4/contacts/${contactId}`
    );

    // Find email in custom fields
    const emailField = contact.custom_fields_values?.find(
      (f: any) => f.field_code === 'EMAIL' || f.field_name?.toLowerCase().includes('email')
    );

    if (emailField && emailField.values?.[0]?.value) {
      return emailField.values[0].value;
    }

    console.log(`⚠️ Contact ${contactId} has no email field`);
    return null;
  } catch (error: any) {
    console.error('❌ Failed to get contact email:', error.message);
    return null;
  }
}

/**
 * Send an email via Kommo Notes API
 * Creates an outgoing email note attached to a lead or contact
 */
export async function sendEmail(
  integrationId: string,
  options: {
    entityId: number;
    entityType: 'leads' | 'contacts';
    to: string;
    subject: string;
    text: string;
    from?: string;
  }
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  // Kommo note types for email:
  // - 4 = incoming email
  // - 5 = outgoing email
  const noteData = {
    note_type: 'mail_message', // or use numeric type 5
    params: {
      text: options.text,
      subject: options.subject,
      to: options.to,
      from: options.from || '',
      service: 'email',
      content_summary: options.text.substring(0, 200),
    },
  };

  console.log(`📧 Sending email via Kommo to ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   Entity: ${options.entityType} #${options.entityId}`);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/${options.entityType}/${options.entityId}/notes`,
    {
      method: 'POST',
      body: [noteData],
    }
  );
}

/**
 * Change lead status/stage
 */
export async function changeLeadStage(
  integrationId: string,
  leadId: number,
  statusId: number,
  pipelineId?: number
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  const updateData: any = {
    status_id: statusId,
  };

  if (pipelineId) {
    updateData.pipeline_id = pipelineId;
  }

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}`,
    {
      method: 'PATCH',
      body: updateData,
    }
  );
}

/**
 * Change responsible user for a lead
 */
export async function changeLeadResponsible(
  integrationId: string,
  leadId: number,
  userId: number
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/leads/${leadId}`,
    {
      method: 'PATCH',
      body: {
        responsible_user_id: userId,
      },
    }
  );
}

/**
 * Change responsible user for a contact
 */
export async function changeContactResponsible(
  integrationId: string,
  contactId: number,
  userId: number
): Promise<any> {
  const { token, apiDomain } = await getValidAccessToken(integrationId);

  return kommoApiRequest(
    apiDomain,
    token,
    `/api/v4/contacts/${contactId}`,
    {
      method: 'PATCH',
      body: {
        responsible_user_id: userId,
      },
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
  _payload: string,
  _signature: string,
  _secret: string
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
