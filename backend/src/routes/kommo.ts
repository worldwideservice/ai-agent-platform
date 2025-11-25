import { Router } from 'express';
import {
  initiateOAuth,
  handleOAuthCallback,
  handleWebhook,
  syncCRMData,
  connectWithToken,
} from '../controllers/kommo';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/kommo/auth
 * Initiate Kommo OAuth flow
 * Requires: integrationId, baseDomain in query params
 */
router.get('/auth', authenticateToken, initiateOAuth);

/**
 * GET /api/kommo/callback
 * Handle OAuth callback from Kommo
 * Receives: code, state, referer in query params
 */
router.get('/callback', handleOAuthCallback);

/**
 * POST /api/kommo/connect-with-token
 * Connect Kommo using long-lived token
 * Requires: integrationId, accessToken in body
 */
router.post('/connect-with-token', authenticateToken, connectWithToken);

/**
 * POST /api/kommo/sync
 * Synchronize CRM data (pipelines, stages, channels) from Kommo
 * Requires: integrationId in body
 */
router.post('/sync', authenticateToken, syncCRMData);

/**
 * POST /api/kommo/webhook
 * Receive webhooks from Kommo
 * No authentication required (webhooks come from Kommo)
 */
router.post('/webhook', handleWebhook);

export default router;
