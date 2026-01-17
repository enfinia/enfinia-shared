/**
 * Zod Validation Schemas
 *
 * Centralized input validation schemas for EnfinIA microservices.
 * Prevents injection attacks and ensures data integrity.
 */
const { z } = require('zod');

// Common patterns
const PHONE_REGEX = /^\+?[1-9]\d{8,14}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phone number validation
 * Accepts international format with or without + prefix
 */
const phoneSchema = z.string()
  .min(9, 'Phone number too short')
  .max(16, 'Phone number too long')
  .regex(PHONE_REGEX, 'Invalid phone number format');

/**
 * UUID validation
 */
const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');

/**
 * Positive integer ID
 */
const positiveIntSchema = z.number().int().positive();
const positiveIntStringSchema = z.string().regex(/^\d+$/, 'Must be a positive integer').transform(Number);

/**
 * Safe string - no control characters or script tags
 */
const safeStringSchema = z.string()
  .max(1000)
  .refine(
    (val) => !/[<>{}]/.test(val),
    'String contains potentially unsafe characters'
  )
  .refine(
    // eslint-disable-next-line no-control-regex
    (val) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(val),
    'String contains control characters'
  );

/**
 * Name field - alphanumeric, spaces, and common name characters
 */
const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[\p{L}\p{N}\s\-''.]+$/u, 'Name contains invalid characters');

/**
 * Email validation
 */
const emailSchema = z.string().email('Invalid email format').max(254, 'Email too long');

// ============================================================
// Identity Service Schemas
// ============================================================

/**
 * POST /identity/contacts/identify
 */
const identifyContactSchema = z.object({
  contato: phoneSchema.optional(),
  telefone: phoneSchema.optional(),
  lid: z.string().max(50).optional(),
  criarRegistroSeAusente: z.boolean().optional(),
  nomeDisplay: nameSchema.optional()
}).refine(
  (data) => data.contato || data.telefone,
  { message: 'Either contato or telefone is required' }
);

/**
 * POST /identity/leads
 */
const createLeadSchema = z.object({
  hashId: positiveIntStringSchema.or(positiveIntSchema),
  telefone: phoneSchema.optional(),
  nome: nameSchema.optional()
});

/**
 * POST /auth/s2s/token
 */
const s2sTokenSchema = z.object({
  apiKey: z.string().min(32, 'API key too short').max(256, 'API key too long'),
  serviceName: z.string()
    .min(1, 'Service name is required')
    .max(50, 'Service name too long')
    .regex(/^[a-z][a-z0-9-]*$/, 'Service name must be lowercase alphanumeric with hyphens')
});

/**
 * POST /auth/s2s/refresh
 */
const s2sRefreshSchema = z.object({
  refreshToken: z.string().min(10, 'Invalid refresh token'),
  serviceName: z.string()
    .min(1, 'Service name is required')
    .max(50, 'Service name too long')
    .regex(/^[a-z][a-z0-9-]*$/, 'Service name must be lowercase alphanumeric with hyphens')
});

// ============================================================
// Transaction Service Schemas
// ============================================================

/**
 * Transaction amount - positive number with max 2 decimal places
 */
const amountSchema = z.number()
  .positive('Amount must be positive')
  .max(999999999.99, 'Amount too large')
  .refine(
    (val) => Number.isFinite(val) && Math.round(val * 100) / 100 === val,
    'Amount must have at most 2 decimal places'
  );

/**
 * Transaction category
 */
const categorySchema = z.string()
  .min(1, 'Category is required')
  .max(50, 'Category too long')
  .regex(/^[\p{L}\p{N}\s\-]+$/u, 'Category contains invalid characters');

/**
 * Create transaction
 */
const createTransactionSchema = z.object({
  hashId: positiveIntStringSchema.or(positiveIntSchema),
  amount: amountSchema,
  category: categorySchema,
  description: safeStringSchema.max(500).optional(),
  date: z.string().datetime().optional()
});

// ============================================================
// Middleware Helper
// ============================================================

/**
 * Create Express middleware for Zod validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
function createValidationMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with parsed/transformed data
    req[source] = result.data;
    next();
  };
}

/**
 * Validate data directly without middleware
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, errors?: Array }} Validation result
 */
function validate(schema, data) {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}

module.exports = {
  // Common schemas
  phoneSchema,
  uuidSchema,
  positiveIntSchema,
  positiveIntStringSchema,
  safeStringSchema,
  nameSchema,
  emailSchema,
  amountSchema,
  categorySchema,

  // Identity service schemas
  identifyContactSchema,
  createLeadSchema,
  s2sTokenSchema,
  s2sRefreshSchema,

  // Transaction service schemas
  createTransactionSchema,

  // Helpers
  createValidationMiddleware,
  validate,

  // Re-export zod for convenience
  z
};
