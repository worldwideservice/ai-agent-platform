import { google } from 'googleapis';
import { prisma } from '../config/database';

// Google OAuth2 client configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Separate OAuth2 client for employee calendar connections
const employeeOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL || 'http://localhost:3001'}/api/google-calendar/callback`
);

// Scopes needed for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Additional scopes for employee calendars (need email for display)
const EMPLOYEE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(integrationId: string): string {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: integrationId,
    prompt: 'consent',
  });
  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt,
  };
}

/**
 * Store Google tokens in database
 */
export async function storeGoogleTokens(
  integrationId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  await prisma.googleToken.upsert({
    where: { integrationId },
    create: {
      integrationId,
      accessToken,
      refreshToken,
      expiresAt,
    },
    update: {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get Google tokens for integration and refresh if needed
 */
export async function getGoogleTokens(integrationId: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const tokens = await prisma.googleToken.findUnique({
    where: { integrationId },
  });

  if (!tokens) {
    return null;
  }

  // Check if token is expired or about to expire (5 min buffer)
  if (tokens.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    // Refresh the token
    try {
      oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        const expiresAt = credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000);

        await prisma.googleToken.update({
          where: { integrationId },
          data: {
            accessToken: credentials.access_token,
            expiresAt,
            updatedAt: new Date(),
          },
        });

        return {
          accessToken: credentials.access_token,
          refreshToken: tokens.refreshToken,
        };
      }
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Get Google Calendar client with valid tokens
 */
export async function getCalendarClient(integrationId: string) {
  const tokens = await getGoogleTokens(integrationId);

  if (!tokens) {
    throw new Error('No Google tokens found for integration');
  }

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Get list of user's calendars
 */
export async function getCalendars(integrationId: string) {
  const calendar = await getCalendarClient(integrationId);

  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

/**
 * Get free/busy times for a calendar
 */
export async function getFreeBusy(
  integrationId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = await getCalendarClient(integrationId);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  return response.data.calendars?.[calendarId]?.busy || [];
}

/**
 * Create a calendar event
 */
export async function createEvent(
  integrationId: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }
) {
  const calendar = await getCalendarClient(integrationId);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      attendees: event.attendees?.map((email) => ({ email })),
    },
  });

  return response.data;
}

/**
 * Get events from calendar
 */
export async function getEvents(
  integrationId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = await getCalendarClient(integrationId);

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  integrationId: string,
  calendarId: string,
  eventId: string
) {
  const calendar = await getCalendarClient(integrationId);

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

/**
 * Check if Google Calendar is connected for integration
 */
export async function isGoogleCalendarConnected(
  integrationId: string
): Promise<boolean> {
  const tokens = await prisma.googleToken.findUnique({
    where: { integrationId },
  });

  return !!tokens;
}

// ===================================
// EMPLOYEE CALENDAR FUNCTIONS
// ===================================

/**
 * Generate Google OAuth authorization URL for employee invite
 */
export function getEmployeeAuthUrl(inviteToken: string): string {
  const url = employeeOauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: EMPLOYEE_SCOPES,
    state: inviteToken,
    prompt: 'consent',
  });
  return url;
}

/**
 * Exchange authorization code for employee tokens
 */
export async function exchangeEmployeeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const { tokens } = await employeeOauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  // Get user email
  employeeOauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  const oauth2 = google.oauth2({ version: 'v2', auth: employeeOauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || '';

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt,
    email,
  };
}

/**
 * Get employee tokens and refresh if needed
 */
export async function getEmployeeTokens(employeeId: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const employee = await prisma.googleCalendarEmployee.findUnique({
    where: { id: employeeId },
  });

  if (!employee || !employee.accessToken || !employee.refreshToken) {
    return null;
  }

  // Check if token is expired or about to expire (5 min buffer)
  if (employee.expiresAt && employee.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    // Refresh the token
    try {
      employeeOauth2Client.setCredentials({
        refresh_token: employee.refreshToken,
      });

      const { credentials } = await employeeOauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        const expiresAt = credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000);

        await prisma.googleCalendarEmployee.update({
          where: { id: employeeId },
          data: {
            accessToken: credentials.access_token,
            expiresAt,
            updatedAt: new Date(),
          },
        });

        return {
          accessToken: credentials.access_token,
          refreshToken: employee.refreshToken,
        };
      }
    } catch (error) {
      console.error('Error refreshing employee token:', error);
      return null;
    }
  }

  return {
    accessToken: employee.accessToken,
    refreshToken: employee.refreshToken,
  };
}

/**
 * Refresh employee tokens
 */
export async function refreshEmployeeTokens(employeeId: string): Promise<boolean> {
  const tokens = await getEmployeeTokens(employeeId);
  return !!tokens;
}

/**
 * Get Google Calendar client for employee
 */
export async function getEmployeeCalendarClient(employeeId: string) {
  const tokens = await getEmployeeTokens(employeeId);

  if (!tokens) {
    throw new Error('No Google tokens found for employee');
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: client });
}

/**
 * Get employee calendar by CRM user ID
 */
export async function getEmployeeByCrmUserId(
  agentId: string,
  crmUserId: string
): Promise<{
  id: string;
  crmUserName: string;
  googleEmail: string | null;
} | null> {
  const employee = await prisma.googleCalendarEmployee.findFirst({
    where: {
      agentId,
      crmUserId: crmUserId.toString(),
      status: 'connected',
    },
  });

  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    crmUserName: employee.crmUserName,
    googleEmail: employee.googleEmail,
  };
}

/**
 * Check employee free/busy times
 */
export async function getEmployeeFreeBusy(
  employeeId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: string; end: string }>> {
  const calendar = await getEmployeeCalendarClient(employeeId);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  return (response.data.calendars?.primary?.busy || []).map((slot) => ({
    start: slot.start || '',
    end: slot.end || '',
  }));
}

/**
 * Create event in employee calendar with Google Meet
 */
export async function createEmployeeEvent(
  employeeId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendeeEmail?: string;
  }
): Promise<{
  id: string;
  htmlLink: string;
  meetLink?: string;
}> {
  const calendar = await getEmployeeCalendarClient(employeeId);
  const { v4: uuidv4 } = await import('uuid');

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    },
  });

  const eventData = response.data;

  return {
    id: eventData.id || '',
    htmlLink: eventData.htmlLink || '',
    meetLink: eventData.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri ?? undefined,
  };
}
