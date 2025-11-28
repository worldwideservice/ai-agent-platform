import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import * as adminController from '../controllers/admin';

const router = Router();

// Все роуты требуют авторизации и админских прав
router.use(authMiddleware);
router.use(adminMiddleware);

// ==================== DASHBOARD ====================
router.get('/dashboard', adminController.getDashboardStats);

// ==================== USERS ====================
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId', adminController.updateUser);
router.post('/users/:userId/action', adminController.userQuickAction);
router.delete('/users/:userId', adminController.deleteUser);

// ==================== AGENTS ====================
router.get('/agents', adminController.getAllAgents);
router.patch('/agents/:agentId/toggle', adminController.toggleAgentStatus);

// ==================== INTEGRATIONS ====================
router.get('/integrations', adminController.getAllIntegrations);

// ==================== KNOWLEDGE BASE ====================
router.get('/kb/stats', adminController.getKnowledgeBaseStats);

// ==================== SYSTEM ====================
router.get('/system', adminController.getSystemInfo);
router.get('/activity', adminController.getActivityLogs);

// ==================== CONVERSATIONS ====================
router.get('/conversations', adminController.getAllConversations);

// ==================== TRAINING ====================
router.get('/training', adminController.getTrainingData);

export default router;
