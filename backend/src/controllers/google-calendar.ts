import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  getEmployeeAuthUrl,
  exchangeEmployeeCode,
  getEmployeeCalendarClient,
  // refreshEmployeeTokens is called internally when tokens expire
} from '../services/google-calendar.service';

/**
 * GET /api/google-calendar/employees
 * Get list of employees for an agent
 */
export async function getEmployees(req: AuthRequest, res: Response) {
  try {
    const { agentId } = req.query;

    if (!agentId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'agentId is required',
      });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId as string,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get employees
    const employees = await prisma.googleCalendarEmployee.findMany({
      where: { agentId: agentId as string },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      employees: employees.map((emp) => ({
        id: emp.id,
        crmUserId: emp.crmUserId,
        crmUserName: emp.crmUserName,
        googleEmail: emp.googleEmail,
        status: emp.status,
        inviteExpiresAt: emp.inviteExpiresAt,
        createdAt: emp.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error getting employees:', error);
    return res.status(500).json({
      error: 'Failed to get employees',
      message: error.message,
    });
  }
}

/**
 * POST /api/google-calendar/employees
 * Create invite for employee
 */
export async function createInvite(req: AuthRequest, res: Response) {
  try {
    const { agentId, crmUserId, crmUserName } = req.body;

    if (!agentId || !crmUserId || !crmUserName) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'agentId, crmUserId, and crmUserName are required',
      });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if employee already exists for this CRM user
    const existingEmployee = await prisma.googleCalendarEmployee.findFirst({
      where: {
        agentId,
        crmUserId: crmUserId.toString(),
      },
    });

    if (existingEmployee) {
      // If already connected, return error
      if (existingEmployee.status === 'connected') {
        return res.status(400).json({
          error: 'Employee already connected',
          message: 'Этот сотрудник уже подключил Google Calendar',
        });
      }
      // If pending, regenerate invite token
      const inviteToken = uuidv4();
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.googleCalendarEmployee.update({
        where: { id: existingEmployee.id },
        data: {
          inviteToken,
          inviteExpiresAt,
          updatedAt: new Date(),
        },
      });

      const inviteUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/google-calendar/invite/${inviteToken}`;

      return res.json({
        success: true,
        inviteUrl,
        employeeId: existingEmployee.id,
        message: 'Invite token regenerated',
      });
    }

    // Create new employee with invite
    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const employee = await prisma.googleCalendarEmployee.create({
      data: {
        agentId,
        crmUserId: crmUserId.toString(),
        crmUserName,
        inviteToken,
        inviteExpiresAt,
        status: 'pending',
      },
    });

    const inviteUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/google-calendar/invite/${inviteToken}`;

    return res.json({
      success: true,
      inviteUrl,
      employeeId: employee.id,
      message: 'Invite created successfully',
    });
  } catch (error: any) {
    console.error('Error creating invite:', error);
    return res.status(500).json({
      error: 'Failed to create invite',
      message: error.message,
    });
  }
}

/**
 * DELETE /api/google-calendar/employees/:id
 * Delete employee and revoke tokens
 */
export async function deleteEmployee(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Get employee
    const employee = await prisma.googleCalendarEmployee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: employee.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete employee
    await prisma.googleCalendarEmployee.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({
      error: 'Failed to delete employee',
      message: error.message,
    });
  }
}

/**
 * GET /api/google-calendar/invite/:token
 * Invite page for employee to authorize Google Calendar
 */
export async function handleInvitePage(req: Request, res: Response) {
  try {
    const { token } = req.params;

    // Find employee by invite token
    const employee = await prisma.googleCalendarEmployee.findUnique({
      where: { inviteToken: token },
    });

    if (!employee) {
      return res.status(404).send(renderErrorPage('Ссылка недействительна или устарела'));
    }

    // Check if invite expired
    if (employee.inviteExpiresAt < new Date()) {
      return res.status(400).send(renderErrorPage('Срок действия ссылки истёк. Запросите новую ссылку у администратора.'));
    }

    // Check if already connected
    if (employee.status === 'connected') {
      return res.send(renderSuccessPage('Google Calendar уже подключен'));
    }

    // Get agent name for display
    const agent = await prisma.agent.findUnique({
      where: { id: employee.agentId },
    });

    const companyName = agent?.name || 'Компания';

    // Generate Google OAuth URL
    const authUrl = getEmployeeAuthUrl(token);

    return res.send(renderInvitePage(companyName, employee.crmUserName, authUrl));
  } catch (error: any) {
    console.error('Error handling invite page:', error);
    return res.status(500).send(renderErrorPage(error.message));
  }
}

/**
 * GET /api/google-calendar/callback
 * OAuth callback for employee authorization
 */
export async function handleEmployeeOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.send(renderErrorPage(`Ошибка авторизации: ${oauthError}`));
    }

    if (!code || !state) {
      return res.status(400).send(renderErrorPage('Отсутствуют необходимые параметры'));
    }

    // State contains inviteToken
    const inviteToken = state as string;

    // Find employee by invite token
    const employee = await prisma.googleCalendarEmployee.findUnique({
      where: { inviteToken },
    });

    if (!employee) {
      return res.status(404).send(renderErrorPage('Сотрудник не найден'));
    }

    // Exchange code for tokens
    const tokens = await exchangeEmployeeCode(code as string);

    // Update employee with tokens
    await prisma.googleCalendarEmployee.update({
      where: { id: employee.id },
      data: {
        googleEmail: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        status: 'connected',
        updatedAt: new Date(),
      },
    });

    return res.send(renderSuccessPage('Google Calendar успешно подключен!'));
  } catch (error: any) {
    console.error('Error handling OAuth callback:', error);
    return res.status(500).send(renderErrorPage(error.message));
  }
}

/**
 * POST /api/google-calendar/free-busy
 * Check free/busy times for employee's calendar
 */
export async function checkFreeBusy(req: AuthRequest, res: Response) {
  try {
    const { crmUserId, agentId, timeMin, timeMax } = req.body;

    if (!crmUserId || !agentId || !timeMin || !timeMax) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'crmUserId, agentId, timeMin, and timeMax are required',
      });
    }

    // Find employee
    const employee = await prisma.googleCalendarEmployee.findFirst({
      where: {
        agentId,
        crmUserId: crmUserId.toString(),
        status: 'connected',
      },
    });

    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        message: 'Сотрудник не подключил Google Calendar',
      });
    }

    // Get calendar client
    const calendar = await getEmployeeCalendarClient(employee.id);

    // Check free/busy
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busyTimes = response.data.calendars?.primary?.busy || [];

    return res.json({
      success: true,
      busyTimes,
    });
  } catch (error: any) {
    console.error('Error checking free/busy:', error);
    return res.status(500).json({
      error: 'Failed to check calendar',
      message: error.message,
    });
  }
}

/**
 * POST /api/google-calendar/create-event
 * Create meeting event with Google Meet
 */
export async function createMeetingEvent(req: AuthRequest, res: Response) {
  try {
    const { crmUserId, agentId, summary, description, start, end, attendeeEmail } = req.body;

    if (!crmUserId || !agentId || !summary || !start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'crmUserId, agentId, summary, start, and end are required',
      });
    }

    // Find employee
    const employee = await prisma.googleCalendarEmployee.findFirst({
      where: {
        agentId,
        crmUserId: crmUserId.toString(),
        status: 'connected',
      },
    });

    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        message: 'Сотрудник не подключил Google Calendar',
      });
    }

    // Get calendar client
    const calendar = await getEmployeeCalendarClient(employee.id);

    // Create event with Google Meet
    const eventResponse = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: new Date(start).toISOString(),
          timeZone: 'Europe/Moscow',
        },
        end: {
          dateTime: new Date(end).toISOString(),
          timeZone: 'Europe/Moscow',
        },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
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

    const event = eventResponse.data;

    return res.json({
      success: true,
      event: {
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        htmlLink: event.htmlLink,
        meetLink: event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri,
      },
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({
      error: 'Failed to create event',
      message: error.message,
    });
  }
}

// ======================
// HTML Page Renderers
// ======================

function renderInvitePage(companyName: string, employeeName: string, authUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Подключение Google Calendar</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 420px;
          width: 100%;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 8px;
          font-size: 24px;
        }
        .company-name {
          color: #667eea;
          font-weight: 600;
        }
        .employee-name {
          color: #666;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .info-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: left;
        }
        .info-box h3 {
          font-size: 14px;
          color: #333;
          margin-bottom: 12px;
        }
        .info-box ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .info-box li {
          font-size: 13px;
          color: #666;
          padding: 6px 0;
          padding-left: 24px;
          position: relative;
        }
        .info-box li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #4CAF50;
        }
        .google-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #4285f4;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
          width: 100%;
        }
        .google-btn:hover {
          background: #3367d6;
        }
        .google-btn svg {
          width: 20px;
          height: 20px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">📅</div>
        <h1>Подключение к <span class="company-name">${escapeHtml(companyName)}</span></h1>
        <p class="employee-name">${escapeHtml(employeeName)}</p>

        <div class="info-box">
          <h3>Что будет доступно:</h3>
          <ul>
            <li>Просмотр вашей занятости в календаре</li>
            <li>Создание встреч с клиентами</li>
            <li>Автоматическое создание Google Meet</li>
          </ul>
        </div>

        <a href="${authUrl}" class="google-btn">
          <svg viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </a>

        <p class="footer">Нажимая кнопку, вы соглашаетесь предоставить доступ к календарю</p>
      </div>
    </body>
    </html>
  `;
}

function renderSuccessPage(message: string = 'Google Calendar подключен!'): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Успешно подключено</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          margin-bottom: 20px;
        }
        .close-hint {
          background: #e8f5e9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          color: #2e7d32;
          font-size: 14px;
        }
        .close-hint strong {
          display: block;
          margin-bottom: 8px;
          font-size: 15px;
        }
        .keyboard-shortcut {
          background: #f5f5f5;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>${escapeHtml(message)}</h1>
        <p>Ваш календарь успешно подключен к системе.</p>
        <div class="close-hint">
          <strong>Теперь можете закрыть эту вкладку</strong>
          Нажмите <span class="keyboard-shortcut">Ctrl+W</span> (Windows) или <span class="keyboard-shortcut">Cmd+W</span> (Mac)
        </div>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google_calendar_employee_connected' }, '*');
          setTimeout(() => window.close(), 2000);
        }
      </script>
    </body>
    </html>
  `;
}

function renderErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ошибка</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>Ошибка</h1>
        <p>${escapeHtml(message)}</p>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google_calendar_employee_error', error: '${escapeHtml(message)}' }, '*');
        }
      </script>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
