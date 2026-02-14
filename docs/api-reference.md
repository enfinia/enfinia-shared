# @enfinia/shared API Reference

## Overview

`@enfinia/shared` provides cross-cutting utilities for all EnfinIA microservices:

- **Correlation ID** - Request tracing across services
- **Security Middleware** - Helmet, CORS, rate limiting
- **S2S Authentication** - Service-to-service JWT authentication
- **Logging** - Structured JSON logging with Pino
- **HTTP Client** - Fetch wrapper with correlation ID propagation

## Installation

```bash
npm install @enfinia/shared
```

## Quick Start

```javascript
const express = require('express');
const {
  correlationIdMiddleware,
  createSecurityMiddleware,
  createS2SAuthMiddleware,
  createLogger,
  requestLoggerMiddleware
} = require('@enfinia/shared');

const app = express();
const logger = createLogger({ service: 'my-service' });

// Apply middleware stack
app.use(correlationIdMiddleware);
app.use(...createSecurityMiddleware());
app.use(requestLoggerMiddleware(logger));
app.use(createS2SAuthMiddleware());
```

---

## Correlation ID

### `correlationIdMiddleware`

Express middleware that ensures every request has a correlation ID.

```javascript
const { correlationIdMiddleware } = require('@enfinia/shared');

app.use(correlationIdMiddleware);

// Access in route handler
app.get('/api', (req, res) => {
  console.log(req.correlationId); // "550e8400-e29b-41d4-a716-446655440000"
});
```

**Behavior:**
- If `X-Correlation-ID` header exists, uses that value
- Otherwise, generates a new UUID v4
- Sets response header `X-Correlation-ID`
- Attaches `req.correlationId` for easy access

### `getCorrelationId(req)`

Get correlation ID from request or generate a new one.

```javascript
const { getCorrelationId } = require('@enfinia/shared');

const correlationId = getCorrelationId(req);
```

### `createCorrelationHeaders(correlationId)`

Create headers object for outbound HTTP requests.

```javascript
const { createCorrelationHeaders } = require('@enfinia/shared');

const headers = createCorrelationHeaders(req.correlationId);
// { 'x-correlation-id': '550e8400-e29b-41d4-a716-446655440000' }
```

### `CORRELATION_HEADER`

Constant for the header name: `'x-correlation-id'`

---

## Security Middleware

### `createSecurityMiddleware(options)`

Creates a middleware stack with helmet, CORS, and rate limiting.

```javascript
const { createSecurityMiddleware } = require('@enfinia/shared');

// Default configuration
app.use(...createSecurityMiddleware());

// Custom configuration
app.use(...createSecurityMiddleware({
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 50 // 50 requests per minute
  },
  cors: {
    origin: ['https://example.com']
  },
  bodyLimit: '50kb'
}));
```

**Default Rate Limit:**
- 100 requests per 15 minutes per IP
- Returns JSON error with retry-after info

**Default CORS:**
- Reads from `CORS_ALLOWED_ORIGINS` environment variable
- Allows common HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Allows standard headers + X-Correlation-ID

### `jsonBodyParser(limit)`

JSON body parser with size limit.

```javascript
const { jsonBodyParser } = require('@enfinia/shared');

app.use(jsonBodyParser('10kb')); // Default
```

### `securityErrorHandler`

Error handler for security-related errors (CORS violations).

```javascript
const { securityErrorHandler } = require('@enfinia/shared');

app.use(securityErrorHandler);
```

---

## S2S Authentication

### `createS2SAuthMiddleware(options)`

Middleware that verifies JWT tokens for service-to-service calls.

```javascript
const { createS2SAuthMiddleware } = require('@enfinia/shared');

app.use(createS2SAuthMiddleware({
  jwtSecret: process.env.S2S_JWT_SECRET,
  excludePaths: ['/health', '/healthz', '/ready', '/metrics']
}));

// Access authenticated service info
app.get('/api', (req, res) => {
  console.log(req.service.name); // "bot-gateway"
  console.log(req.service.authenticated); // true
});
```

**Response Codes:**
- `401 Unauthorized` - Missing/invalid Authorization header
- `401 TOKEN_EXPIRED` - Token has expired (client should refresh)

### `createOptionalS2SAuthMiddleware(options)`

Same as above but doesn't require authentication. Validates if present.

```javascript
const { createOptionalS2SAuthMiddleware } = require('@enfinia/shared');

app.use(createOptionalS2SAuthMiddleware());

app.get('/api', (req, res) => {
  if (req.service.authenticated) {
    // Called by another service
  } else {
    // Called by external client
  }
});
```

### `S2SClient`

Client for authenticating with the identity service and making authenticated requests.

```javascript
const { S2SClient } = require('@enfinia/shared');

const client = new S2SClient({
  serviceApiKey: process.env.SERVICE_API_KEY,
  serviceName: 'my-service',
  authEndpoint: process.env.S2S_AUTH_ENDPOINT
});

// Initial authentication
await client.authenticate();

// Make authenticated request (auto-refreshes token)
const response = await client.request('https://other-service/api', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' })
});
```

**Methods:**
- `authenticate()` - Initial authentication, returns access + refresh tokens
- `refresh()` - Refresh access token using refresh token
- `getValidToken()` - Get valid token, refreshing if needed
- `request(url, options)` - Make authenticated HTTP request
- `clearTokens()` - Clear stored tokens

### `S2STokenGenerator`

Used by identity-service to generate JWT tokens.

```javascript
const { S2STokenGenerator } = require('@enfinia/shared');

const generator = new S2STokenGenerator(process.env.S2S_JWT_SECRET);

// Generate tokens for a service
const tokens = generator.generateTokens('bot-gateway');
// { accessToken: '...', refreshToken: '...', expiresIn: 900 }

// Verify a token
const result = generator.verifyToken(token);
// { valid: true, payload: { service: 'bot-gateway', type: 'access' } }

// Refresh an access token
const newToken = generator.refreshAccessToken(refreshToken);
// { accessToken: '...', expiresIn: 900 }
```

---

## Logging

### `createLogger(options)`

Create a Pino logger instance.

```javascript
const { createLogger } = require('@enfinia/shared');

const logger = createLogger({
  service: 'my-service',
  level: 'info' // debug, info, warn, error
});

logger.info({ action: 'user_created', userId: 123 }, 'User created');
```

**Log Format (Production):**
```json
{
  "level": "INFO",
  "time": "2026-01-13T10:30:00.000Z",
  "service": "my-service",
  "correlationId": "uuid",
  "action": "user_created",
  "userId": 123,
  "msg": "User created"
}
```

### `withCorrelationId(logger, correlationId)`

Create child logger with correlation ID.

```javascript
const { withCorrelationId } = require('@enfinia/shared');

const requestLogger = withCorrelationId(logger, req.correlationId);
requestLogger.info('Processing request');
```

### `withRequestContext(logger, req)`

Create child logger with full request context.

```javascript
const { withRequestContext } = require('@enfinia/shared');

const requestLogger = withRequestContext(logger, req);
// Includes: correlationId, method, path, userAgent
```

### `requestLoggerMiddleware(logger)`

Express middleware that logs request start/end with timing.

```javascript
const { requestLoggerMiddleware } = require('@enfinia/shared');

app.use(requestLoggerMiddleware(logger));

// Logs on request start: { msg: 'Request started', method: 'GET', path: '/api' }
// Logs on request end: { msg: 'Request completed', statusCode: 200, durationMs: 45 }
```

---

## HTTP Client

### `createHttpClient(options)`

Create HTTP client with automatic correlation ID propagation.

```javascript
const { createHttpClient } = require('@enfinia/shared');

const client = createHttpClient({
  correlationId: req.correlationId,
  serviceName: 'my-service',
  baseUrl: 'https://api.example.com'
});

// GET request
const data = await client.get('/users/123');

// POST request
const result = await client.post('/users', { name: 'John' });

// Raw fetch with correlation headers
const response = await client.fetch('/raw', { method: 'OPTIONS' });
```

**Methods:**
- `fetch(url, options)` - Raw fetch with headers
- `get(url, options)` - GET returning JSON
- `post(url, body, options)` - POST with JSON body
- `put(url, body, options)` - PUT with JSON body
- `patch(url, body, options)` - PATCH with JSON body
- `delete(url, options)` - DELETE request
- `withHeaders(headers)` - Create new client with additional headers

### `httpClientMiddleware(options)`

Express middleware that attaches HTTP client to request.

```javascript
const { httpClientMiddleware } = require('@enfinia/shared');

app.use(httpClientMiddleware({ serviceName: 'my-service' }));

app.get('/api', async (req, res) => {
  // Client automatically has correlation ID
  const data = await req.httpClient.get('https://other-service/api');
});
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `S2S_JWT_SECRET` | Secret for S2S JWT signing/verification | For S2S auth |
| `S2S_AUTH_ENDPOINT` | URL of identity-service | For S2SClient |
| `SERVICE_API_KEY` | Unique API key for this service | For S2SClient |
| `SERVICE_NAME` | Name of this service | For S2SClient |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | Optional |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | Optional |
| `NODE_ENV` | Environment (development/production/test) | Optional |

---

## Legacy Exports

For backwards compatibility, the following are still exported:

```javascript
const {
  Logger,        // Legacy logger (use createLogger instead)
  AppVars,       // Application variables
  CryptoService, // Encryption/hashing utilities
  BrasilApiClient, // Brasil API integration
  supabase       // Supabase client
} = require('@enfinia/shared');
```

These will be deprecated in future versions. Please migrate to the new APIs.
