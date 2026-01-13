# Clean Architecture Migration Guide

This guide helps you migrate EnfinIA microservices to Clean Architecture, aligning with constitution v2.0.0.

## Target Structure

```
enfinia-*/
├── src/
│   ├── domain/           # Business logic (no external dependencies)
│   │   ├── entities/     # Core business objects
│   │   └── value-objects/ # Immutable value types
│   ├── application/      # Use cases and orchestration
│   │   ├── use-cases/    # Business operations
│   │   └── ports/        # Interfaces (contracts)
│   ├── adapters/         # Interface implementations
│   │   ├── controllers/  # HTTP handlers
│   │   ├── repositories/ # Data access
│   │   └── services/     # External service adapters
│   ├── infrastructure/   # Frameworks and drivers
│   │   ├── express/      # Express app setup
│   │   ├── database/     # Supabase client
│   │   └── config/       # Environment config
│   └── server.js         # Entry point
├── tests/
│   ├── unit/             # Unit tests (domain, use cases)
│   ├── integration/      # Integration tests (adapters)
│   └── fixtures/         # Test data
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Migration Steps

### Step 1: Add Test Infrastructure (TDD Foundation)

Before any refactoring, ensure tests exist. Tests enable safe refactoring.

```bash
npm install --save-dev jest nock
```

Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  }
};
```

Create test directories:
```bash
mkdir -p tests/unit tests/integration tests/fixtures
```

### Step 2: Apply Shared Security Middleware

Update `server.js` to use @enfinia/shared:

```javascript
const express = require('express');
const {
  correlationIdMiddleware,
  createSecurityMiddleware,
  createS2SAuthMiddleware,
  createLogger,
  requestLoggerMiddleware,
  jsonBodyParser
} = require('@enfinia/shared');

const app = express();
const logger = createLogger({ service: 'your-service-name' });

// Middleware stack (order matters)
app.use(correlationIdMiddleware);
app.use(...createSecurityMiddleware());
app.use(jsonBodyParser());
app.use(requestLoggerMiddleware(logger));

// Protected routes (require S2S auth)
app.use('/api', createS2SAuthMiddleware());

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Your routes here...

// Error handler
app.use((err, req, res, next) => {
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});
```

### Step 3: Create Domain Layer

Extract pure business logic with no external dependencies.

**Before (flat structure):**
```javascript
// src/user-service.js
const supabase = require('@enfinia/shared').supabase;

async function createUser(userData) {
  if (!userData.email) throw new Error('Email required');
  const { data, error } = await supabase.from('users').insert(userData);
  return data;
}
```

**After (domain + use case):**
```javascript
// src/domain/entities/user.js
class User {
  constructor({ id, email, name, createdAt }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.createdAt = createdAt;
  }

  static create(userData) {
    if (!userData.email) {
      throw new Error('Email is required');
    }
    return new User({
      ...userData,
      createdAt: new Date()
    });
  }
}

module.exports = { User };
```

```javascript
// src/application/ports/user-repository.js
/**
 * @interface UserRepository
 * Port for user persistence
 */
class UserRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async save(user) { throw new Error('Not implemented'); }
}

module.exports = { UserRepository };
```

```javascript
// src/application/use-cases/create-user.js
class CreateUserUseCase {
  constructor({ userRepository, logger }) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async execute(userData) {
    const user = User.create(userData);
    const saved = await this.userRepository.save(user);
    this.logger.info({ userId: saved.id }, 'User created');
    return saved;
  }
}

module.exports = { CreateUserUseCase };
```

### Step 4: Create Adapters Layer

Implement ports with concrete dependencies.

```javascript
// src/adapters/repositories/supabase-user-repository.js
const { UserRepository } = require('../../application/ports/user-repository');
const { User } = require('../../domain/entities/user');

class SupabaseUserRepository extends UserRepository {
  constructor({ supabase }) {
    super();
    this.supabase = supabase;
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`User not found: ${error.message}`);
    return new User(data);
  }

  async save(user) {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw new Error(`Failed to save user: ${error.message}`);
    return new User(data);
  }
}

module.exports = { SupabaseUserRepository };
```

```javascript
// src/adapters/controllers/user-controller.js
class UserController {
  constructor({ createUserUseCase }) {
    this.createUserUseCase = createUserUseCase;
  }

  async create(req, res, next) {
    try {
      const user = await this.createUserUseCase.execute(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { UserController };
```

### Step 5: Wire Dependencies (Composition Root)

Create a composition root that wires everything together.

```javascript
// src/infrastructure/container.js
const { supabase, createLogger } = require('@enfinia/shared');
const { SupabaseUserRepository } = require('../adapters/repositories/supabase-user-repository');
const { CreateUserUseCase } = require('../application/use-cases/create-user');
const { UserController } = require('../adapters/controllers/user-controller');

function createContainer(options = {}) {
  const logger = options.logger || createLogger({ service: 'user-service' });
  const db = options.supabase || supabase;

  // Repositories
  const userRepository = new SupabaseUserRepository({ supabase: db });

  // Use Cases
  const createUserUseCase = new CreateUserUseCase({ userRepository, logger });

  // Controllers
  const userController = new UserController({ createUserUseCase });

  return {
    logger,
    userRepository,
    createUserUseCase,
    userController
  };
}

module.exports = { createContainer };
```

### Step 6: Create Express Router

```javascript
// src/infrastructure/express/routes/user-routes.js
const express = require('express');

function createUserRoutes(container) {
  const router = express.Router();
  const { userController } = container;

  router.post('/', (req, res, next) => userController.create(req, res, next));

  return router;
}

module.exports = { createUserRoutes };
```

### Step 7: Update Server Entry Point

```javascript
// src/server.js
const express = require('express');
const {
  correlationIdMiddleware,
  createSecurityMiddleware,
  createS2SAuthMiddleware,
  requestLoggerMiddleware,
  jsonBodyParser
} = require('@enfinia/shared');

const { createContainer } = require('./infrastructure/container');
const { createUserRoutes } = require('./infrastructure/express/routes/user-routes');

const app = express();
const container = createContainer();

// Middleware
app.use(correlationIdMiddleware);
app.use(...createSecurityMiddleware());
app.use(jsonBodyParser());
app.use(requestLoggerMiddleware(container.logger));

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/users', createS2SAuthMiddleware(), createUserRoutes(container));

// Error handler
app.use((err, req, res, next) => {
  container.logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  container.logger.info({ port: PORT }, 'Server started');
});
```

## Testing Strategy

### Unit Tests (Domain & Use Cases)

Test pure business logic without external dependencies:

```javascript
// tests/unit/create-user.test.js
const { CreateUserUseCase } = require('../../src/application/use-cases/create-user');

describe('CreateUserUseCase', () => {
  const mockRepository = {
    save: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' })
  };
  const mockLogger = { info: jest.fn() };

  it('should create a user', async () => {
    const useCase = new CreateUserUseCase({
      userRepository: mockRepository,
      logger: mockLogger
    });

    const result = await useCase.execute({ email: 'test@example.com' });

    expect(result.email).toBe('test@example.com');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw error for invalid email', async () => {
    const useCase = new CreateUserUseCase({
      userRepository: mockRepository,
      logger: mockLogger
    });

    await expect(useCase.execute({})).rejects.toThrow('Email is required');
  });
});
```

### Integration Tests (Adapters)

Test adapter implementations with mocked external services:

```javascript
// tests/integration/user-repository.test.js
const { SupabaseUserRepository } = require('../../src/adapters/repositories/supabase-user-repository');

describe('SupabaseUserRepository', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  };

  it('should save user to database', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { id: 1, email: 'test@example.com' },
      error: null
    });

    const repo = new SupabaseUserRepository({ supabase: mockSupabase });
    const result = await repo.save({ email: 'test@example.com' });

    expect(result.email).toBe('test@example.com');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });
});
```

## Common Pitfalls

### 1. Domain Layer with External Dependencies

**Wrong:**
```javascript
// domain/entities/user.js
const supabase = require('@enfinia/shared').supabase; // NO!

class User {
  async save() {
    return supabase.from('users').insert(this);
  }
}
```

**Right:**
```javascript
// domain/entities/user.js
class User {
  constructor(data) {
    this.email = data.email;
    // Pure data, no I/O
  }
}
```

### 2. Controllers with Business Logic

**Wrong:**
```javascript
// adapters/controllers/user-controller.js
async create(req, res) {
  if (!req.body.email) return res.status(400).json({ error: 'Email required' });
  // Validation belongs in domain/use-case
}
```

**Right:**
```javascript
async create(req, res, next) {
  try {
    const user = await this.createUserUseCase.execute(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error); // Use case throws validation errors
  }
}
```

### 3. Hard-coded Dependencies

**Wrong:**
```javascript
const { supabase } = require('@enfinia/shared');

class UserRepository {
  async save(user) {
    return supabase.from('users').insert(user);
  }
}
```

**Right:**
```javascript
class UserRepository {
  constructor({ supabase }) {
    this.supabase = supabase; // Injected, testable
  }

  async save(user) {
    return this.supabase.from('users').insert(user);
  }
}
```

## Checklist

Before considering migration complete:

- [ ] Test structure created (unit/, integration/, fixtures/)
- [ ] Jest configured with 80% coverage threshold
- [ ] Domain entities have no external imports
- [ ] Use cases depend only on ports (interfaces)
- [ ] All external dependencies injected via constructor
- [ ] Controllers only handle HTTP concerns
- [ ] Composition root wires all dependencies
- [ ] Security middleware from @enfinia/shared applied
- [ ] Correlation ID middleware applied
- [ ] Structured JSON logging with correlation ID
- [ ] Health check endpoint working
- [ ] All existing tests passing
- [ ] Coverage threshold met
- [ ] Dockerfile created from template
- [ ] docker-compose.yml configured for local dev
