# ABAC Engine for Node.js

A powerful, zero-dependency **Attribute-Based Access Control (ABAC)** engine for
Node.js and TypeScript. Make authorization decisions based on attributes instead
of roles.

## What is ABAC?

### For Beginners

Traditional access control uses **roles** (like "admin", "user", "manager").
This works until:

- You need fine-grained permissions ("can edit their own documents")
- Context matters ("only during business hours")
- Requirements change frequently

**ABAC** uses **attributes** instead. Think of it as asking questions:

- "Is this user's department the same as the document's department?"
- "Is the user's clearance level higher than the resource's classification?"
- "Is it currently between 9 AM and 5 PM?"

### For Experts

ABAC follows the XACML architecture with four key components:

- **PDP (Policy Decision Point)**: The engine that evaluates policies
- **PIP (Policy Information Point)**: Attribute providers that fetch attributes
- **PAP (Policy Administration Point)**: Your policy storage (Prisma, files,
  etc.)
- **PEP (Policy Enforcement Point)**: Middleware that enforces decisions

This package implements the PDP and provides optional PIP implementations.

## Installation

```bash
npm install abac-engine
```

## Quick Start

```typescript
import {
  ABACEngine,
  PolicyBuilder,
  AttributeRef,
  CombiningAlgorithm
} from 'abac-engine';

// 1. Create a policy
const policy = PolicyBuilder.create('document-access')
  .version('1.0.0')
  .permit()
  .description('Users can edit their own documents')
  .condition(
    // Subject's id must equal resource's ownerId
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('ownerId')
    )
  )
  .build();

// 2. Create the engine
const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides
});

// 3. Make an authorization request
const request = {
  subject: {
    id: 'user-123',
    attributes: { department: 'Engineering' }
  },
  resource: {
    id: 'doc-456',
    type: 'document',
    attributes: { ownerId: 'user-123', department: 'Engineering' }
  },
  action: {
    id: 'edit'
  }
};

// 4. Evaluate
const decision = await engine.evaluate(request, [policy]);

if (decision.decision === Decision.Permit) {
  console.log('Access granted!');
} else {
  console.log('Access denied');
}
```

## Core Concepts Explained

### 1. Request

A request contains all the information needed to make an authorization decision:

```typescript
interface ABACRequest {
  subject: Subject; // Who is making the request?
  resource: Resource; // What are they trying to access?
  action: Action; // What are they trying to do?
  environment?: Environment; // What's the context?
}
```

**Example:**

```typescript
const request = {
  subject: {
    id: 'alice',
    attributes: {
      department: 'Engineering',
      role: 'developer',
      clearanceLevel: 3
    }
  },
  resource: {
    id: 'database-prod',
    type: 'database',
    attributes: {
      environment: 'production',
      classification: 2
    }
  },
  action: {
    id: 'write'
  },
  environment: {
    currentTime: new Date(),
    ipAddress: '192.168.1.100'
  }
};
```

### 2. Policy

A policy is a rule that grants or denies access based on conditions:

```typescript
interface ABACPolicy {
  id: string; // Unique identifier
  version: string; // Policy version
  effect: Effect; // Permit or Deny
  description?: string; // Human-readable description
  condition?: Condition; // When does this policy apply?
  obligations?: Obligation[]; // What must happen if policy matches?
  advice?: Advice[]; // Optional suggestions
}
```

**Example:**

```typescript
const policy = {
  id: 'eng-dept-access',
  version: '1.0.0',
  effect: Effect.Permit,
  description: 'Engineering department members can read engineering documents',
  condition: {
    operator: LogicalOperator.And,
    conditions: [
      {
        operator: ComparisonOperator.Equals,
        left: { category: 'subject', attributeId: 'department' },
        right: 'Engineering'
      },
      {
        operator: ComparisonOperator.Equals,
        left: { category: 'resource', attributeId: 'department' },
        right: 'Engineering'
      }
    ]
  }
};
```

### 3. Conditions

Conditions determine when a policy applies. Three types:

#### Comparison Conditions

Compare two values:

```typescript
// subject.clearanceLevel > resource.classification
ConditionBuilder.greaterThan(
  AttributeRef.subject('clearanceLevel'),
  AttributeRef.resource('classification')
);
```

**Available Operators:**

- `equals`, `notEquals`
- `greaterThan`, `greaterThanOrEqual`
- `lessThan`, `lessThanOrEqual`
- `in`, `notIn`
- `contains`, `startsWith`, `endsWith`
- `matchesRegex`
- `exists`, `notExists`

#### Logical Conditions

Combine multiple conditions:

```typescript
// (department === 'Engineering') AND (level > 3)
ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering').and(
  ConditionBuilder.greaterThan(AttributeRef.subject('level'), 3)
);

// (role === 'admin') OR (isOwner === true)
ConditionBuilder.equals(AttributeRef.subject('role'), 'admin').or(
  ConditionBuilder.equals(AttributeRef.subject('isOwner'), true)
);

// NOT (status === 'suspended')
ConditionBuilder.equals(AttributeRef.subject('status'), 'suspended').not();
```

#### Function Conditions

Use custom logic:

```typescript
// Register a custom function
engine.registerFunction('is_business_hours', () => {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 17;
});

// Use in policy
const policy = PolicyBuilder.create('business-hours-only')
  .permit()
  .condition(ConditionBuilder.function('is_business_hours'))
  .build();
```

### 4. Combining Algorithms

When multiple policies apply, how do we decide? That's what combining algorithms
do:

**`DenyOverrides`** (recommended)

- If ANY policy denies, the result is Deny
- If at least one permits and none deny, result is Permit
- Use when security is critical

**`PermitOverrides`**

- If ANY policy permits, the result is Permit
- If at least one denies and none permit, result is Deny
- Use when availability is more important than security

**`FirstApplicable`**

- Use the first policy that matches
- Order matters!

**`OnlyOneApplicable`**

- Only one policy should match
- Returns Indeterminate if multiple match

**`DenyUnlessPermit`**

- Default to Deny unless explicitly permitted

**`PermitUnlessDeny`**

- Default to Permit unless explicitly denied

```typescript
const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides
});
```

### 5. Attribute Providers

Attribute providers fetch attributes dynamically during evaluation:

```typescript
import {
  InMemoryAttributeProvider,
  EnvironmentAttributeProvider
} from 'abac-engine';

// In-memory provider for subjects/resources
const subjectProvider = new InMemoryAttributeProvider('subject', 'users');
subjectProvider.setAttribute('user-123', 'department', 'Engineering');
subjectProvider.setAttribute('user-123', 'level', 5);

// Environment provider for context (time, IP, etc.)
const envProvider = new EnvironmentAttributeProvider();

const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
  attributeProviders: [subjectProvider, envProvider]
});
```

**Built-in Providers:**

- `InMemoryAttributeProvider` - Store attributes in memory
- `EnvironmentAttributeProvider` - Automatic context (time, IP, etc.)
- `DatabaseAttributeProvider` - Fetch from database
- `RestApiAttributeProvider` - Fetch from REST API
- `LdapAttributeProvider` - Fetch from LDAP
- `CachedAttributeProvider` - Add caching to any provider
- `CompositeAttributeProvider` - Combine multiple providers

## Policy Storage

You manage policy storage using your preferred method. The engine just
evaluates.

### With Prisma

```typescript
// schema.prisma
model AbacPolicy {
  id          String   @id
  version     String
  effect      String
  description String?
  condition   Json?
  createdAt   DateTime @default(now())
}

// Your code
import { validatePolicy } from 'abac-engine';

// Load policies
const policies = await prisma.abacPolicy.findMany();

// Save with validation
async function savePolicy(policy: ABACPolicy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }
  await prisma.abacPolicy.create({ data: policy });
}

// Evaluate
const decision = await engine.evaluate(request, policies);
```

### With Files

```typescript
import { loadPoliciesFromFile, validatePolicy } from 'abac-engine';

// Load and validate
const policies = await loadPoliciesFromFile('./policies.json');
policies.forEach(p => {
  const result = validatePolicy(p);
  if (!result.valid) {
    console.error(`Invalid policy ${p.id}:`, result.errors);
  }
});

const decision = await engine.evaluate(request, policies);
```

### With Caching

```typescript
import { PolicyCache } from 'abac-engine';

const cache = new PolicyCache(300); // 5 minutes TTL

async function getPolicies() {
  return await cache.get(async () => {
    return await prisma.abacPolicy.findMany();
  });
}

const policies = await getPolicies(); // Loads from DB
const policies2 = await getPolicies(); // Uses cache

// Invalidate when policies change
cache.invalidate();
```

## Real-World Examples

### Example 1: Document Management System

```typescript
const policies = [
  // Owners can do anything with their documents
  PolicyBuilder.create('owner-full-access')
    .permit()
    .description('Document owners have full access')
    .condition(
      ConditionBuilder.equals(
        AttributeRef.subject('id'),
        AttributeRef.resource('ownerId')
      )
    )
    .build(),

  // Same department members can read
  PolicyBuilder.create('dept-read-access')
    .permit()
    .description('Department members can read department documents')
    .condition(
      ConditionBuilder.equals(
        AttributeRef.subject('department'),
        AttributeRef.resource('department')
      ).and(ConditionBuilder.equals(AttributeRef.action('id'), 'read'))
    )
    .build(),

  // Admins can do everything
  PolicyBuilder.create('admin-access')
    .permit()
    .description('Admins have full access')
    .condition(ConditionBuilder.equals(AttributeRef.subject('role'), 'admin'))
    .build()
];
```

### Example 2: Multi-Tenant SaaS

```typescript
// Tenant isolation policy
const tenantIsolation = PolicyBuilder.create('tenant-isolation')
  .deny()
  .description('Users cannot access other tenants resources')
  .condition(
    ConditionBuilder.notEquals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    )
  )
  .build();

// Usage
const request = {
  subject: {
    id: 'user-1',
    attributes: { tenantId: 'tenant-a' }
  },
  resource: {
    id: 'resource-1',
    type: 'data',
    attributes: { tenantId: 'tenant-b' } // Different tenant!
  },
  action: { id: 'read' }
};

const decision = await engine.evaluate(request, [tenantIsolation]);
// Result: Deny
```

### Example 3: Healthcare System

```typescript
// HIPAA-compliant access control
const policies = [
  // Doctors can access their patients' records
  PolicyBuilder.create('doctor-patient-access')
    .permit()
    .condition(
      ConditionBuilder.equals(AttributeRef.subject('role'), 'doctor').and(
        ConditionBuilder.in(
          AttributeRef.resource('patientId'),
          AttributeRef.subject('assignedPatients')
        )
      )
    )
    .build(),

  // Emergency access (break-glass)
  PolicyBuilder.create('emergency-access')
    .permit()
    .description('Emergency access with audit logging')
    .condition(
      ConditionBuilder.equals(AttributeRef.subject('emergencyMode'), true)
    )
    .logObligation({
      level: 'critical',
      message: 'Emergency access used',
      timestamp: new Date()
    })
    .build()
];
```

### Example 4: Time-Based Access

```typescript
// Register custom time function
engine.registerFunction('is_business_hours', () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
});

const policy = PolicyBuilder.create('business-hours-only')
  .permit()
  .description('Certain operations only allowed during business hours')
  .condition(
    ConditionBuilder.function('is_business_hours').and(
      ConditionBuilder.equals(AttributeRef.action('id'), 'deploy')
    )
  )
  .build();
```

## API Reference

### ABACEngine

```typescript
class ABACEngine {
  constructor(config: ABACEngineConfig);

  evaluate(request: ABACRequest, policies: ABACPolicy[]): Promise<ABACDecision>;

  registerFunction(name: string, fn: ConditionFunction): void;

  getMetrics(): EvaluationMetrics;
  getAuditLog(): ABACAccessLog[];
}
```

### PolicyBuilder

```typescript
PolicyBuilder.create(id: string)
  .version(version: string)
  .permit() | .deny()
  .description(description: string)
  .condition(condition: Condition | ConditionBuilder)
  .target(target: PolicyTarget | TargetBuilder)
  .logObligation(params: Record<string, unknown>)
  .notifyObligation(params: Record<string, unknown>)
  .build(): ABACPolicy
```

### ConditionBuilder

```typescript
// Comparison
ConditionBuilder.equals(left, right);
ConditionBuilder.notEquals(left, right);
ConditionBuilder.greaterThan(left, right);
ConditionBuilder.lessThan(left, right);
ConditionBuilder.in(value, array);
ConditionBuilder.contains(haystack, needle);
ConditionBuilder.exists(attribute);

// Logical
condition.and(otherCondition);
condition.or(otherCondition);
condition.not();

// Function
ConditionBuilder.function(name, ...args);
```

### AttributeRef

```typescript
AttributeRef.subject(attributeId: string)
AttributeRef.resource(attributeId: string)
AttributeRef.action(attributeId: string)
AttributeRef.environment(attributeId: string)
```

### Validation

```typescript
import { validatePolicy, validatePolicies } from 'abac-engine';

// Validate single policy
const result = validatePolicy(policy);
if (!result.valid) {
  console.error(result.errors);
}

// Validate multiple
const results = validatePolicies(policies);

// Validate and throw
validatePolicyOrThrow(policy); // Throws if invalid
```

## Advanced Features

### Obligations and Advice

Obligations are actions that MUST happen if a policy matches:

```typescript
const policy = PolicyBuilder.create('audit-sensitive-access')
  .permit()
  .condition(...)
  .logObligation({
    level: 'warning',
    message: 'Sensitive data accessed',
    userId: AttributeRef.subject('id')
  })
  .notifyObligation({
    recipient: 'security@company.com',
    subject: 'Sensitive Access Alert'
  })
  .build();
```

Advice are optional suggestions:

```typescript
const policy = PolicyBuilder.create('risky-operation')
  .permit()
  .condition(...)
  .advice([{
    id: 'mfa-recommendation',
    type: 'custom',
    parameters: {
      message: 'Consider requiring MFA for this operation'
    }
  }])
  .build();
```

### Performance Optimization

```typescript
import { filterPoliciesByTarget, groupPoliciesByEffect } from 'abac-engine';

// Pre-filter policies before evaluation
const relevantPolicies = filterPoliciesByTarget(allPolicies, {
  resourceType: 'document',
  actionId: 'read'
});

// Group by effect for faster processing
const { permit, deny } = groupPoliciesByEffect(policies);

// Use caching
const cache = new PolicyCache(300);
```

### Custom Attribute Providers

```typescript
class CustomDatabaseProvider extends BaseAttributeProvider {
  constructor(private db: Database) {
    super('subject', 'custom-users');
  }

  async getAttributes(id: string): Promise<Record<string, AttributeValue>> {
    const user = await this.db.users.findOne({ id });
    return {
      department: user.department,
      role: user.role,
      permissions: user.permissions
    };
  }

  supportsAttribute(attributeId: string): boolean {
    return ['department', 'role', 'permissions'].includes(attributeId);
  }
}
```

### Logging

The ABAC Engine supports pluggable logging for debugging and monitoring. By
default, it uses a `SilentLogger` that doesn't output anything, making it
production-safe without configuration.

#### Using the Default Console Logger

```typescript
import { ABACEngine, ConsoleLogger, LogLevel } from 'abac-engine';

const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
  logger: new ConsoleLogger(LogLevel.Warn) // Only log warnings and errors
});
```

**Available Log Levels:**

- `LogLevel.Debug` - All messages
- `LogLevel.Info` - Info, warnings, and errors
- `LogLevel.Warn` - Warnings and errors only
- `LogLevel.Error` - Errors only
- `LogLevel.None` - No logging

#### Using a Custom Logger

Integrate with your existing logging solution (Winston, Pino, Bunyan, etc.):

```typescript
import { ILogger } from 'abac-engine';
import winston from 'winston';

class WinstonLogger implements ILogger {
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'abac.log' })]
  });

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(
    message: string,
    error?: Error | unknown,
    meta?: Record<string, unknown>
  ): void {
    this.logger.error(message, { error, ...meta });
  }
}

const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
  logger: new WinstonLogger()
});
```

#### Logging in Attribute Providers

Attribute providers also support logging:

```typescript
import {
  InMemoryAttributeProvider,
  ConsoleLogger,
  LogLevel
} from 'abac-engine';

const logger = new ConsoleLogger(LogLevel.Debug);

const subjectProvider = new InMemoryAttributeProvider(
  'subject',
  'users',
  { user123: { department: 'Engineering' } },
  logger // Pass the same logger for consistency
);

const engine = new ABACEngine({
  combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
  attributeProviders: [subjectProvider],
  logger // Use the same logger instance across components
});
```

**What Gets Logged:**

- Attribute provider errors (failed database queries, API calls, etc.)
- Policy applicability errors
- Evaluation warnings and errors

## Testing

Testing is simple - just pass arrays of policies:

```typescript
import { ABACEngine, PolicyBuilder, Decision } from 'abac-engine';

describe('Authorization', () => {
  it('should allow owners to edit', async () => {
    const policy = PolicyBuilder.create('owner-edit')
      .permit()
      .condition(
        ConditionBuilder.equals(
          AttributeRef.subject('id'),
          AttributeRef.resource('ownerId')
        )
      )
      .build();

    const engine = new ABACEngine({
      combiningAlgorithm: CombiningAlgorithm.DenyOverrides
    });

    const request = {
      subject: { id: 'alice', attributes: {} },
      resource: {
        id: 'doc',
        type: 'document',
        attributes: { ownerId: 'alice' }
      },
      action: { id: 'edit' }
    };

    const decision = await engine.evaluate(request, [policy]);
    expect(decision.decision).toBe(Decision.Permit);
  });
});
```

## Glossary

- **ABAC**: Attribute-Based Access Control - authorization based on attributes
- **Attribute**: A property of a subject, resource, action, or environment
- **Combining Algorithm**: How to resolve conflicts when multiple policies apply
- **Condition**: Boolean expression that determines if a policy applies
- **Decision**: Result of evaluation (Permit, Deny, NotApplicable,
  Indeterminate)
- **Effect**: What a policy does if it matches (Permit or Deny)
- **Obligation**: Action that MUST happen if a policy matches
- **Advice**: Optional suggestion from a policy
- **PAP**: Policy Administration Point - where policies are managed (your
  database)
- **PDP**: Policy Decision Point - the evaluation engine (this library)
- **PEP**: Policy Enforcement Point - enforces decisions (your middleware)
- **PIP**: Policy Information Point - provides attributes (attribute providers)
- **Policy**: A rule that grants or denies access
- **Request**: The authorization question being asked
- **Subject**: Who is requesting access (user, service, etc.)
- **Resource**: What is being accessed (document, API, database, etc.)
- **Action**: What operation is being performed (read, write, delete, etc.)
- **Target**: Optional filter to determine if policy applies

## TypeScript Support

Fully typed with TypeScript:

```typescript
import type {
  ABACPolicy,
  ABACRequest,
  ABACDecision,
  Condition,
  Effect,
  Decision
} from 'abac-engine';
```

## Performance

- Zero dependencies
- Synchronous condition evaluation where possible
- Built-in caching support
- Efficient policy matching
- Benchmarks: ~10,000 evaluations/second (simple policies)

## 📚 Documentation

Complete documentation is available in the [`/docs`](./docs) directory:

### Core Documentation

- **[Documentation Index](./docs/README.md)** - Complete documentation
  navigation and quick reference
- **[API Reference](./docs/API_REFERENCE.md)** - Full API documentation for all
  classes and methods
- **[Glossary](./docs/GLOSSARY.md)** - Comprehensive guide to all ABAC terms and
  concepts
- **[Policy Guide](./docs/POLICY_GUIDE.md)** - How to write effective ABAC
  policies
- **[Examples](./docs/EXAMPLES.md)** - Real-world use cases and integration
  examples
- **[Error Handling](./docs/ERROR_HANDLING.md)** - Error handling best practices

### Key Concepts Explained

Need clarification on specific terms?

- **[What is ABAC?](./docs/GLOSSARY.md#abac-attribute-based-access-control)** -
  Understanding Attribute-Based Access Control
- **[What is a Tenant?](./docs/GLOSSARY.md#tenant)** - Multi-tenancy explained
- **[What is Multi-Tenant?](./docs/GLOSSARY.md#multi-tenant)** - Isolating
  customers in SaaS
- **[PDP, PIP, PAP, PEP?](./docs/GLOSSARY.md#architecture-components)** - ABAC
  architecture components
- **[Combining Algorithms?](./docs/GLOSSARY.md#combining-algorithm)** - How to
  resolve policy conflicts
- **[Obligations vs Advice?](./docs/GLOSSARY.md#obligation)** - Required vs
  optional actions

### Quick Links by Use Case

- **[Document Management System](./docs/EXAMPLES.md#document-management-system)** -
  Complete DMS example
- **[Multi-Tenant SaaS](./docs/EXAMPLES.md#multi-tenant-saas-application)** -
  Tenant isolation
- **[Healthcare System](./docs/EXAMPLES.md#healthcare-system)** -
  HIPAA-compliant access
- **[Financial Services](./docs/EXAMPLES.md#financial-services)** - Banking
  access control
- **[Express.js Integration](./docs/EXAMPLES.md#expressjs-middleware)** - REST
  API middleware
- **[NestJS Integration](./docs/EXAMPLES.md#nestjs-guard)** - Guard
  implementation

## License

MIT

## Contributing

Issues and PRs welcome on GitHub!

## Resources

- [ABAC Guide (NIST)](https://csrc.nist.gov/publications/detail/sp/800-162/final)
- [XACML Standard](http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)
- [Code Examples](./examples)
- [Complete Documentation](./docs/README.md)

---

**Ready to get started?** Install now: `npm install abac-engine`

**Need help?** Check the [Glossary](./docs/GLOSSARY.md) for terminology or
[Examples](./docs/EXAMPLES.md) for real-world use cases.
