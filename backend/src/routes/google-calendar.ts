import { Router } from 'express';
import {
  getEmployees,
  createInvite,
  deleteEmployee,
  handleInvitePage,
  handleEmployeeOAuthCallback,
  checkFreeBusy,
  createMeetingEvent,
} from '../controllers/google-calendar';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/google-calendar/employees
 * Get list of employees for an agent
 * Requires: agentId in query params
 */
router.get('/employees', authenticateToken, getEmployees);

/**
 * POST /api/google-calendar/employees
 * Create invite for employee
 * Body: { agentId, crmUserId, crmUserName }
 */
router.post('/employees', authenticateToken, createInvite);

/**
 * DELETE /api/google-calendar/employees/:id
 * Delete employee and revoke tokens
 */
router.delete('/employees/:id', authenticateToken, deleteEmployee);

/**
 * GET /api/google-calendar/invite/:token
 * Invite page for employee to authorize Google Calendar
 * Public endpoint - no auth required
 */
router.get('/invite/:token', handleInvitePage);

/**
 * GET /api/google-calendar/callback
 * OAuth callback for employee authorization
 * Public endpoint - receives code and state from Google
 */
router.get('/callback', handleEmployeeOAuthCallback);

/**
 * POST /api/google-calendar/free-busy
 * Check free/busy times for employee's calendar
 * Body: { crmUserId, agentId, timeMin, timeMax }
 */
router.post('/free-busy', authenticateToken, checkFreeBusy);

/**
 * POST /api/google-calendar/create-event
 * Create meeting event with Google Meet
 * Body: { crmUserId, agentId, summary, description, start, end, attendeeEmail }
 */
router.post('/create-event', authenticateToken, createMeetingEvent);

export default router;
