import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  storeGoogleTokens,
  getCalendars,
  isGoogleCalendarConnected,
} from '../services/google-calendar.service';

/**
 * GET /api/google/auth
 * Initiate Google OAuth flow
 */
export async function initiateGoogleOAuth(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.query;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'integrationId is required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId as string },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate Google authorization URL
    const authUrl = getGoogleAuthUrl(integrationId as string);

    return res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize',
    });
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    return res.status(500).json({
      error: 'Failed to initiate OAuth',
      message: error.message,
    });
  }
}

/**
 * GET /api/google/callback
 * Handle OAuth callback from Google
 */
export async function handleGoogleCallback(req: Request, res: Response) {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.send(renderErrorPage(`OAuth error: ${oauthError}`));
    }

    if (!code || !state) {
      return res.status(400).send(renderErrorPage('Missing code or state parameter'));
    }

    // State contains integrationId
    const integrationId = state as string;

    // Verify integration exists
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId },
    });

    if (!integration) {
      return res.status(404).send(renderErrorPage('Integration not found'));
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code as string);

    // Store tokens in database
    await storeGoogleTokens(
      integrationId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt
    );

    // Update integration status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        isConnected: true,
        connectedAt: new Date(),
        lastSynced: new Date(),
      },
    });

    // Return success page
    return res.send(renderSuccessPage());
  } catch (error: any) {
    console.error('Error handling Google OAuth callback:', error);
    return res.status(500).send(renderErrorPage(error.message));
  }
}

/**
 * POST /api/google/disconnect
 * Disconnect Google Calendar integration
 */
export async function disconnectGoogle(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.body;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'integrationId is required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete tokens
    await prisma.googleToken.deleteMany({
      where: { integrationId },
    });

    // Update integration status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        isConnected: false,
        connectedAt: null,
      },
    });

    return res.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting Google:', error);
    return res.status(500).json({
      error: 'Failed to disconnect',
      message: error.message,
    });
  }
}

/**
 * GET /api/google/calendars
 * Get list of user's calendars
 */
export async function getGoogleCalendars(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.query;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'integrationId is required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId as string },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get agent to verify user ownership
    const agent = await prisma.agent.findFirst({
      where: {
        id: integration.agentId,
        userId: req.userId!,
      },
    });

    if (!agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if connected
    const isConnected = await isGoogleCalendarConnected(integrationId as string);
    if (!isConnected) {
      return res.status(400).json({
        error: 'Not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Get calendars
    const calendars = await getCalendars(integrationId as string);

    return res.json({
      success: true,
      calendars,
    });
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    return res.status(500).json({
      error: 'Failed to fetch calendars',
      message: error.message,
    });
  }
}

/**
 * GET /api/google/status
 * Check if Google Calendar is connected
 */
export async function getGoogleStatus(req: AuthRequest, res: Response) {
  try {
    const { integrationId } = req.query;

    if (!integrationId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'integrationId is required',
      });
    }

    // Verify integration belongs to user
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId as string },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Check if connected
    const isConnected = await isGoogleCalendarConnected(integrationId as string);

    return res.json({
      success: true,
      isConnected,
      integration: {
        id: integration.id,
        isActive: integration.isActive,
        isConnected: integration.isConnected,
        connectedAt: integration.connectedAt,
      },
    });
  } catch (error: any) {
    console.error('Error checking Google status:', error);
    return res.status(500).json({
      error: 'Failed to check status',
      message: error.message,
    });
  }
}

// Helper functions for rendering HTML pages

function renderSuccessPage(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Calendar Connected</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #4285F4 0%, #34A853 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 48px;
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
        button {
          background: #4285F4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background: #3367D6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Google Calendar подключен!</h1>
        <p>Ваш Google Calendar успешно подключен к агенту. Можете закрыть это окно и вернуться в приложение.</p>
        <button onclick="window.close()">Закрыть окно</button>
      </div>
      <script>
        // Post message to parent window if opened in popup
        if (window.opener) {
          window.opener.postMessage({ type: 'google_oauth_success' }, '*');
          setTimeout(() => window.close(), 2000);
        }
      </script>
    </body>
    </html>
  `;
}

function renderErrorPage(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connection Failed</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #EA4335 0%, #FBBC05 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 48px;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>Ошибка подключения</h1>
        <p>${errorMessage}</p>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google_oauth_error', error: '${errorMessage}' }, '*');
        }
      </script>
    </body>
    </html>
  `;
}
