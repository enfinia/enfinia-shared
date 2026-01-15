// Shared module for cross-microservice utilities
require('dotenv').config({ path: process.env.CONFIG_PATH || '.env' });

// Legacy exports (mantidos para compatibilidade)
const Logger = require('./logger');
const AppVars = require('./variables');
const CryptoService = require('./crypto-service');
const BrasilApiClient = require('./brasilapi-client');
const { supabase } = require('../lib/supabase-client');

// Clean Architecture base classes
const { BaseEntity } = require('./domain/entities');
const { BaseUseCase } = require('./application/use-cases');
const { RepositoryPort } = require('./application/ports');
const { BaseController } = require('./adapters/controllers');
const { BaseRepository } = require('./adapters/repositories');

// New infrastructure modules
const { correlationIdMiddleware, getCorrelationId, createCorrelationHeaders, CORRELATION_HEADER } = require('./infrastructure/middleware/correlation-id');
const { createLogger, withCorrelationId, withRequestContext, requestLoggerMiddleware, sanitizeLogData } = require('./infrastructure/logging/pino-logger');
const { createSecurityMiddleware, jsonBodyParser, securityErrorHandler } = require('./infrastructure/middleware/security');
const { createS2SAuthMiddleware, createOptionalS2SAuthMiddleware } = require('./infrastructure/middleware/s2s-auth');
const { S2SClient, S2STokenGenerator } = require('./adapters/auth/s2s-client');
const { createHttpClient, httpClientMiddleware } = require('./infrastructure/http/http-client');
const {
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth
} = require('./infrastructure/database/supabase-client');
const {
  createEncryptionService,
  hash,
  generateToken,
  generateUUID,
  maskText,
  maskPhone,
  maskEmail,
  maskCurrency
} = require('./infrastructure/crypto/encryption-service');

module.exports = {
  // Legacy (compatibilidade)
  Logger,
  AppVars,
  CryptoService,
  BrasilApiClient,
  supabase, // Legacy singleton - use createSupabaseClient or getSupabaseClient instead

  // Correlation ID
  correlationIdMiddleware,
  getCorrelationId,
  createCorrelationHeaders,
  CORRELATION_HEADER,

  // Logging (Pino)
  createLogger,
  withCorrelationId,
  withRequestContext,
  requestLoggerMiddleware,
  sanitizeLogData,

  // Security
  createSecurityMiddleware,
  jsonBodyParser,
  securityErrorHandler,

  // S2S Authentication
  createS2SAuthMiddleware,
  createOptionalS2SAuthMiddleware,
  S2SClient,
  S2STokenGenerator,

  // HTTP Client
  createHttpClient,
  httpClientMiddleware,

  // Supabase Database
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth,

  // Crypto & Security Utilities
  createEncryptionService,
  hash,
  generateToken,
  generateUUID,
  maskText,
  maskPhone,
  maskEmail,
  maskCurrency,

  // Clean Architecture Base Classes
  BaseEntity,
  BaseUseCase,
  RepositoryPort,
  BaseController,
  BaseRepository
};

