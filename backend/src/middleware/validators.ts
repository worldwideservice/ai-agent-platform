import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

// Validation result handler
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
      value: (err as any).value,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  };
};

// ============================================================================
// Auth Validators
// ============================================================================

export const registerValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be at most 255 characters'),

  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be at most 200 characters'),
];

export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// ============================================================================
// Agent Validators
// ============================================================================

export const createAgentValidator = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),

  body('systemInstructions')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('System instructions must be at most 50000 characters'),

  body('model')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Model must be at most 100 characters'),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),

  body('maxTokens')
    .optional()
    .isInt({ min: 1, max: 128000 })
    .withMessage('Max tokens must be between 1 and 128000'),
];

export const updateAgentValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid agent ID'),

  ...createAgentValidator,
];

export const agentIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid agent ID'),
];

export const agentIdParamValidator = [
  param('agentId')
    .isUUID()
    .withMessage('Invalid agent ID'),
];

// ============================================================================
// KB Category Validators
// ============================================================================

export const createCategoryValidator = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Category name must be between 1 and 200 characters'),

  body('parentId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid parent category ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
];

export const categoryIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid category ID'),
];

// ============================================================================
// KB Article Validators
// ============================================================================

export const createArticleValidator = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),

  body('content')
    .isLength({ min: 1, max: 100000 })
    .withMessage('Content must be between 1 and 100000 characters'),

  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),

  body('categories.*')
    .optional()
    .isUUID()
    .withMessage('Invalid category ID'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),

  body('keywords.*')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Each keyword must be at most 100 characters'),
];

export const articleIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid article ID'),
];

// ============================================================================
// Chat Validators
// ============================================================================

export const chatMessageValidator = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10000 characters'),

  body('conversationId')
    .optional()
    .isUUID()
    .withMessage('Invalid conversation ID'),
];

export const testChatValidator = [
  param('agentId')
    .isUUID()
    .withMessage('Invalid agent ID'),

  body('message')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10000 characters'),

  body('conversationId')
    .optional()
    .isUUID()
    .withMessage('Invalid conversation ID'),

  body('testLeadData')
    .optional()
    .isObject()
    .withMessage('Test lead data must be an object'),
];

// ============================================================================
// Trigger Validators
// ============================================================================

export const createTriggerValidator = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Trigger name must be between 1 and 200 characters'),

  body('eventType')
    .isString()
    .isIn(['message', 'keyword', 'stage_change', 'time', 'custom'])
    .withMessage('Invalid event type'),

  body('conditions')
    .optional()
    .isObject()
    .withMessage('Conditions must be an object'),

  body('actions')
    .isArray({ min: 1 })
    .withMessage('At least one action is required'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ============================================================================
// Chain Validators
// ============================================================================

export const createChainValidator = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Chain name must be between 1 and 200 characters'),

  body('steps')
    .isArray({ min: 1 })
    .withMessage('At least one step is required'),

  body('steps.*.type')
    .isString()
    .withMessage('Step type is required'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ============================================================================
// Billing Validators
// ============================================================================

export const subscribeValidator = [
  body('plan')
    .isString()
    .isIn(['trial', 'launch', 'scale', 'max', 'unlimited'])
    .withMessage('Invalid plan'),

  body('billingPeriod')
    .optional()
    .isString()
    .isIn(['monthly', 'yearly'])
    .withMessage('Invalid billing period'),
];

// ============================================================================
// Profile Validators
// ============================================================================

export const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be at most 200 characters'),

  body('language')
    .optional()
    .isString()
    .isIn(['ru', 'en', 'es', 'de', 'fr'])
    .withMessage('Invalid language'),

  body('timezone')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Timezone must be at most 50 characters'),
];

export const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('New password must be between 6 and 100 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
];

// ============================================================================
// Query Validators
// ============================================================================

export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Sort field must be at most 50 characters'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

export const searchValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must be at most 200 characters'),

  ...paginationValidator,
];

// ============================================================================
// Kommo/CRM Validators
// ============================================================================

export const kommoWebhookValidator = [
  // Webhooks can have various formats, so we just ensure body exists
  body()
    .notEmpty()
    .withMessage('Webhook payload is required'),
];

export const connectKommoValidator = [
  body('code')
    .isString()
    .notEmpty()
    .withMessage('Authorization code is required'),

  body('referer')
    .isString()
    .notEmpty()
    .withMessage('Referer (subdomain) is required'),

  body('state')
    .optional()
    .isString(),
];

// ============================================================================
// Document Validators
// ============================================================================

export const uploadDocumentValidator = [
  param('agentId')
    .isUUID()
    .withMessage('Invalid agent ID'),
];

export const documentIdValidator = [
  param('documentId')
    .isUUID()
    .withMessage('Invalid document ID'),
];

// ============================================================================
// ID Validators (generic)
// ============================================================================

export const uuidValidator = (paramName: string) => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`),
];

export const intIdValidator = (paramName: string) => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`Invalid ${paramName}`),
];
