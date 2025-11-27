import { Router } from 'express';
import {
  initiateGoogleOAuth,
  handleGoogleCallback,
  disconnectGoogle,
  getGoogleCalendars,
  getGoogleStatus,
} from '../controllers/google';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/google/auth
 * Initiate Google OAuth flow
 * Requires: integrationId in query params
 */
router.get('/auth', authenticateToken, initiateGoogleOAuth);

/**
 * GET /api/google/callback
 * Handle OAuth callback from Google
 * Receives: code, state in query params
 */
router.get('/callback', handleGoogleCallback);

/**
 * POST /api/google/disconnect
 * Disconnect Google Calendar integration
 * Requires: integrationId in body
 */
router.post('/disconnect', authenticateToken, disconnectGoogle);

/**
 * GET /api/google/calendars
 * Get list of user's calendars
 * Requires: integrationId in query params
 */
router.get('/calendars', authenticateToken, getGoogleCalendars);

/**
 * GET /api/google/status
 * Check if Google Calendar is connected
 * Requires: integrationId in query params
 */
router.get('/status', authenticateToken, getGoogleStatus);

export default router;
