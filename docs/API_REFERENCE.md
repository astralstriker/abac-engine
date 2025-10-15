# API Reference

Complete API documentation for the ABAC Engine.

## Table of Contents

- [Core Classes](#core-classes)
  - [ABACEngine](#abacengine)
  - [PolicyBuilder](#policybuilder)
  - [ConditionBuilder](#conditionbuilder)
  - [TargetBuilder](#targetbuilder)
- [Attribute Providers](#attribute-providers)
  - [InMemoryAttributeProvider](#inmemoryattributeprovider)
  - [DatabaseAttributeProvider](#databaseattributeprovider)
  - [RestApiAttributeProvider](#restapiattributeprovider)
  - [LdapAttributeProvider](#ldapattributeprovider)
  - [CachedAttributeProvider](#cachedattributeprovider)
  - [CompositeAttributeProvider](#compositeattributeprovider)
- [Services](#services)
  - [FunctionRegistry](#functionregistry)
  - [AuditService](#auditservice)
  - [MetricsCollector](#metricscollector)
- [Utilities](#utilities)
  - [AttributeRef](#attributeref)
  - [Validation Functions](#validation-functions)
  - [Policy Loaders](#policy-loaders)
- [Types](#types)
- [Enums](#enums)
- [Error Classes](#error-classes)

---

## Core Classes

### ABACEngine

The main Policy Decision Point (PDP) that evaluates authorization requests.

#### Constructor

```typescript
constructor(config: ABACEngineConfig)
```

**Parameters:**
- `config` - Engine configuration

**Configuration Options:**

```typescript
interface ABACEngineConfig {
  policies: ABACPolicy[];
  attributeProviders?: AttributeProvider[];
  enableAuditLog?: boolean;              // Default: true
  enablePerformanceMetrics?: boolean;    // Default: true
  cacheResults?: boolean;                // Default: false
  cacheTTL?: number;                     // Default: 300 (seconds)
  maxEvaluationTime?: number;            // Default: 5000 (ms)
  logger?: ILogger;                      // Default: SilentLogger
}
```

**Example:**

```typescript
import { ABACEngine } from 'abac-engine';

const engine = new ABACEngine({
  policies: myPolicies,
  enableAuditLog: true,
  logger: new ConsoleLogger()
});
```

---

#### Methods

##### evaluate()

Evaluate an authorization request against policies.

```typescript
async evaluate(
  request: ABACRequest,
  policies?: ABACPolicy[]
): Promise<ABACDecision>
```

**Parameters:**
- `request` - The authorization request
- `policies` - Optional policies to use (overrides config policies)

**Returns:** `Promise<ABACDecision>`

**Example:**

```typescript
const decision = await engine.evaluate({
  subject: { id: 'user-123', attributes: { department: 'Engineering' } },
  resource: { id: 'doc-456', attributes: { owner: 'user-123' } },
  action: { id: 'read' }
});

if (decision.decision === Decision.Permit) {
  // Allow access
}
```

---

##### addAttributeProvider()

Add an attribute provider to the engine.

```typescript
addAttributeProvider(provider: AttributeProvider): void
```

**Parameters:**
- `provider` - Attribute provider instance

**Example:**

```typescript
const provider = new DatabaseAttributeProvider('subject', 'users', config);
engine.addAttributeProvider(provider);
```

---

##### registerFunction()

Register a custom function for use in conditions.

```typescript
registerFunction(name: string, func: ConditionFunction): void
```

**Parameters:**
- `name` - Function name
- `func` - Function implementation

**Example:**

```typescript
engine.registerFunction('isBusinessHours', (time: Date) => {
  const hour = time.getHours();
  return hour >= 9 && hour < 17;
});
```

---

##### getMetrics()

Get evaluation metrics.

```typescript
getMetrics(): EvaluationMetrics
```

**Returns:**

```typescript
interface EvaluationMetrics {
  totalEvaluations: number;
  permitCount: number;
  denyCount: number;
  indeterminateCount: number;
  notApplicableCount: number;
  averageEvaluationTime: number;
  policyEvaluations: number;
}
```

**Example:**

```typescript
const metrics = engine.getMetrics();
console.log(`Total evaluations: ${metrics.totalEvaluations}`);
console.log(`Average time: ${metrics.averageEvaluationTime}ms`);
```

---

##### getAuditLogs()

Get audit logs of evaluation decisions.

```typescript
getAuditLogs(limit?: number): ABACAccessLog[]
```

**Parameters:**
- `limit` - Optional maximum number of logs to return

**Returns:** Array of audit log entries

**Example:**

```typescript
const allLogs = engine.getAuditLogs();
const recentLogs = engine.getAuditLogs(100);
```

---

##### clearCache()

Clear the result cache.

```typescript
clearCache(): void
```

**Example:**

```typescript
// Call when policies change
engine.clearCache();
```

---

### PolicyBuilder

Fluent API for building ABAC policies.

#### Static Methods

##### create()

Create a new policy builder.

```typescript
static create(id: string): PolicyBuilder
```

**Parameters:**
- `id` - Unique policy identifier

**Returns:** PolicyBuilder instance

**Example:**

```typescript
const policy = PolicyBuilder.create('document-access-policy')
  .permit()
  .condition(/* ... */)
  .build();
```

---

#### Instance Methods

##### permit()

Set the policy effect to Permit.

```typescript
permit(): PolicyBuilder
```

**Returns:** `this` (for chaining)

---

##### deny()

Set the policy effect to Deny.

```typescript
deny(): PolicyBuilder
```

**Returns:** `this` (for chaining)

---

##### version()

Set the policy version.

```typescript
version(version: string): PolicyBuilder
```

**Parameters:**
- `version` - Semantic version string

**Returns:** `this` (for chaining)

**Example:**

```typescript
PolicyBuilder.create('my-policy')
  .version('2.0.0')
  .permit()
  .build();
```

---

##### description()

Set the policy description.

```typescript
description(description: string): PolicyBuilder
```

**Parameters:**
- `description` - Human-readable description

**Returns:** `this` (for chaining)

---

##### condition()

Set the policy condition.

```typescript
condition(condition: Condition): PolicyBuilder
```

**Parameters:**
- `condition` - Condition object or ConditionBuilder

**Returns:** `this` (for chaining)

**Example:**

```typescript
PolicyBuilder.create('my-policy')
  .permit()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('department'),
      AttributeRef.resource('department')
    )
  )
  .build();
```

---

##### target()

Set the policy target.

```typescript
target(target: PolicyTarget): PolicyBuilder
```

**Parameters:**
- `target` - Target specification

**Returns:** `this` (for chaining)

**Example:**

```typescript
PolicyBuilder.create('my-policy')
  .permit()
  .target({
    resource: { type: 'document' },
    action: { id: 'read' }
  })
  .build();
```

---

##### obligation()

Add an obligation.

```typescript
obligation(id: string, parameters?: Record<string, unknown>): PolicyBuilder
```

**Parameters:**
- `id` - Obligation identifier
- `parameters` - Optional parameters

**Returns:** `this` (for chaining)

**Example:**

```typescript
PolicyBuilder.create('my-policy')
  .permit()
  .obligation('log-access', { level: 'info' })
  .build();
```

---

##### advice()

Add advice.

```typescript
advice(id: string, parameters?: Record<string, unknown>): PolicyBuilder
```

**Parameters:**
- `id` - Advice identifier
- `parameters` - Optional parameters

**Returns:** `this` (for chaining)

**Example:**

```typescript
PolicyBuilder.create('my-policy')
  .permit()
  .advice('recommend-mfa', { reason: 'Sensitive resource' })
  .build();
```

---

##### build()

Build the final policy.

```typescript
build(): ABACPolicy
```

**Returns:** Complete policy object

**Throws:** `ValidationError` if required fields are missing

---

### ConditionBuilder

Fluent API for building policy conditions.

#### Static Factory Methods

##### equals()

Create an equality comparison.

```typescript
static equals(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.equals(
  AttributeRef.subject('department'),
  'Engineering'
)
```

---

##### notEquals()

Create a not-equals comparison.

```typescript
static notEquals(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

---

##### greaterThan()

Create a greater-than comparison.

```typescript
static greaterThan(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.greaterThan(
  AttributeRef.subject('clearanceLevel'),
  AttributeRef.resource('classification')
)
```

---

##### lessThan()

Create a less-than comparison.

```typescript
static lessThan(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

---

##### greaterThanOrEqual()

Create a greater-than-or-equal comparison.

```typescript
static greaterThanOrEqual(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

---

##### lessThanOrEqual()

Create a less-than-or-equal comparison.

```typescript
static lessThanOrEqual(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

---

##### in()

Create an "in array" comparison.

```typescript
static in(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.in(
  AttributeRef.subject('role'),
  ['admin', 'editor', 'viewer']
)
```

---

##### notIn()

Create a "not in array" comparison.

```typescript
static notIn(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

---

##### contains()

Create a "contains" comparison (array contains value).

```typescript
static contains(
  left: AttributeReference | AttributeValue,
  right: AttributeReference | AttributeValue
): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.contains(
  AttributeRef.subject('roles'),
  'admin'
)
```

---

##### exists()

Create an "attribute exists" check.

```typescript
static exists(
  attribute: AttributeReference
): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.exists(
  AttributeRef.subject('mfaEnabled')
)
```

---

##### notExists()

Create an "attribute not exists" check.

```typescript
static notExists(
  attribute: AttributeReference
): ConditionBuilder
```

---

##### function()

Create a function condition.

```typescript
static function(
  name: string,
  ...args: Array<AttributeReference | AttributeValue>
): ConditionBuilder
```

**Parameters:**
- `name` - Registered function name
- `args` - Function arguments

**Example:**

```typescript
ConditionBuilder.function(
  'isBusinessHours',
  AttributeRef.environment('currentTime')
)
```

---

#### Logical Operators

##### and()

Combine with AND logic.

```typescript
and(other: Condition | ConditionBuilder): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.equals(AttributeRef.subject('dept'), 'Engineering')
  .and(ConditionBuilder.greaterThan(AttributeRef.subject('level'), 3))
```

---

##### or()

Combine with OR logic.

```typescript
or(other: Condition | ConditionBuilder): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.equals(AttributeRef.subject('role'), 'admin')
  .or(ConditionBuilder.equals(AttributeRef.subject('role'), 'owner'))
```

---

##### not()

Negate the condition.

```typescript
static not(condition: Condition | ConditionBuilder): ConditionBuilder
```

**Example:**

```typescript
ConditionBuilder.not(
  ConditionBuilder.equals(AttributeRef.subject('status'), 'suspended')
)
```

---

##### build()

Build the final condition.

```typescript
build(): Condition
```

**Returns:** Condition object

---

### TargetBuilder

Fluent API for building policy targets.

#### Constructor

```typescript
constructor()
```

#### Methods

##### withSubject()

Add subject criteria.

```typescript
withSubject(criteria: Record<string, AttributeValue>): TargetBuilder
```

**Example:**

```typescript
new TargetBuilder()
  .withSubject({ type: 'user' })
  .build();
```

---

##### withResource()

Add resource criteria.

```typescript
withResource(criteria: Record<string, AttributeValue>): TargetBuilder
```

**Example:**

```typescript
new TargetBuilder()
  .withResource({ type: 'document', classification: 'confidential' })
  .build();
```

---

##### withAction()

Add action criteria.

```typescript
withAction(criteria: Record<string, AttributeValue>): TargetBuilder
```

**Example:**

```typescript
new TargetBuilder()
  .withAction({ id: 'delete' })
  .build();
```

---

##### withEnvironment()

Add environment criteria.

```typescript
withEnvironment(criteria: Record<string, AttributeValue>): TargetBuilder
```

---

##### build()

Build the final target.

```typescript
build(): PolicyTarget
```

**Returns:** PolicyTarget object

---

## Attribute Providers

### InMemoryAttributeProvider

Simple in-memory attribute provider with a static map.

#### Constructor

```typescript
constructor(
  category: 'subject' | 'resource' | 'environment',
  name: string,
  attributes: Map<string, Record<string, AttributeValue>>,
  logger?: ILogger
)
```

**Parameters:**
- `category` - Attribute category
- `name` - Provider name
- `attributes` - Map of entity ID to attributes
- `logger` - Optional logger

**Example:**

```typescript
const userAttrs = new Map([
  ['user-123', { department: 'Engineering', level: 3 }],
  ['user-456', { department: 'Sales', level: 2 }]
]);

const provider = new InMemoryAttributeProvider(
  'subject',
  'users',
  userAttrs
);
```

---

### DatabaseAttributeProvider

Fetch attributes from SQL databases.

#### Constructor

```typescript
constructor(
  category: 'subject' | 'resource' | 'environment',
  name: string,
  config: {
    connectionString: string;
    tableMapping: Record<string, string>;
    attributeMapping: Record<string, string>;
    db?: DatabaseConnection;
  },
  logger?: ILogger
)
```

**Parameters:**
- `category` - Attribute category
- `name` - Provider name
- `config.connectionString` - Database connection string
- `config.tableMapping` - Maps attribute IDs to table names
- `config.attributeMapping` - Maps attribute IDs to column names
- `config.db` - Optional database connection instance
- `logger` - Optional logger

**Example:**

```typescript
const provider = new DatabaseAttributeProvider('subject', 'users', {
  connectionString: 'postgresql://localhost/mydb',
  tableMapping: {
    department: 'users',
    clearanceLevel: 'users'
  },
  attributeMapping: {
    department: 'dept_name',
    clearanceLevel: 'clearance_level'
  }
});
```

---

### RestApiAttributeProvider

Fetch attributes from REST APIs.

#### Constructor

```typescript
constructor(
  category: 'subject' | 'resource' | 'environment',
  name: string,
  config: {
    endpoints: Record<string, string>;
    headers?: Record<string, string>;
  },
  logger?: ILogger
)
```

**Parameters:**
- `category` - Attribute category
- `name` - Provider name
- `config.endpoints` - Map of attribute IDs to API endpoints
- `config.headers` - Optional HTTP headers
- `logger` - Optional logger

**Example:**

```typescript
const provider = new RestApiAttributeProvider('subject', 'api', {
  endpoints: {
    department: 'https://api.example.com/users/{id}/department',
    roles: 'https://api.example.com/users/{id}/roles'
  },
  headers: {
    'Authorization': 'Bearer token123'
  }
});
```

---

### LdapAttributeProvider

Fetch attributes from LDAP/Active Directory.

#### Constructor

```typescript
constructor(
  category: 'subject' | 'resource' | 'environment',
  name: string,
  config: {
    url: string;
    baseDN: string;
    attributeMapping: Record<string, string>;
    client?: LdapClient;
  },
  logger?: ILogger
)
```

**Parameters:**
- `category` - Attribute category
- `name` - Provider name
- `config.url` - LDAP server URL
- `config.baseDN` - Base distinguished name
- `config.attributeMapping` - Maps attribute IDs to LDAP attributes
- `config.client` - Optional LDAP client
- `logger` - Optional logger

**Example:**

```typescript
const provider = new LdapAttributeProvider('subject', 'ad', {
  url: 'ldap://dc.example.com',
  baseDN: 'dc=example,dc=com',
  attributeMapping: {
    department: 'department',
    email: 'mail'
  }
});
```

---

### CachedAttributeProvider

Adds caching to any attribute provider.

#### Constructor

```typescript
constructor(
  provider: AttributeProvider,
  ttl?: number
)
```

**Parameters:**
- `provider` - Base provider to wrap
- `ttl` - Cache TTL in seconds (default: 300)

**Example:**

```typescript
const dbProvider = new DatabaseAttributeProvider(/* ... */);
const cachedProvider = new CachedAttributeProvider(dbProvider, 600);
```

---

### CompositeAttributeProvider

Combines multiple providers, trying each until one succeeds.

#### Constructor

```typescript
constructor(
  category: 'subject' | 'resource' | 'environment',
  name: string,
  providers: AttributeProvider[],
  strategy?: 'first-success' | 'merge-all',
  logger?: ILogger
)
```

**Parameters:**
- `category` - Attribute category
- `name` - Provider name
- `providers` - Array of providers
- `strategy` - Combination strategy (default: 'merge-all')
- `logger` - Optional logger

**Example:**

```typescript
const composite = new CompositeAttributeProvider(
  'subject',
  'combined',
  [dbProvider, apiProvider, ldapProvider],
  'merge-all'
);
```

---

## Services

### FunctionRegistry

Registry for custom condition functions.

#### Constructor

```typescript
constructor()
```

#### Methods

##### register()

Register a function.

```typescript
register(name: string, func: ConditionFunction): void
```

**Parameters:**
- `name` - Function name
- `func` - Function implementation

**Example:**

```typescript
const registry = new FunctionRegistry();

registry.register('isWeekday', (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
});
```

---

##### get()

Get a registered function.

```typescript
get(name: string): ConditionFunction | undefined
```

**Returns:** Function or undefined if not found

---

##### has()

Check if function is registered.

```typescript
has(name: string): boolean
```

**Returns:** true if function exists

---

##### remove()

Remove a function.

```typescript
remove(name: string): void
```

---

##### clear()

Clear all functions.

```typescript
clear(): void
```

---

### AuditService

Manages audit logging of authorization decisions.

#### Constructor

```typescript
constructor(config?: AuditServiceConfig)
```

**Configuration:**

```typescript
interface AuditServiceConfig {
  enabled?: boolean;        // Default: true
  maxLogs?: number;         // Default: 10000
  includeDetails?: boolean; // Default: true
}
```

#### Methods

##### log()

Log an authorization decision.

```typescript
async log(
  requestId: string,
  request: ABACRequest,
  decision: ABACDecision,
  evaluationTime: number,
  errors?: string[]
): Promise<void>
```

---

##### getLogs()

Get audit logs.

```typescript
getLogs(limit?: number): ABACAccessLog[]
```

---

##### clearLogs()

Clear all logs.

```typescript
clearLogs(): void
```

---

##### exportLogs()

Export logs as JSON.

```typescript
exportLogs(): string
```

---

##### importLogs()

Import logs from JSON.

```typescript
importLogs(json: string): void
```

**Throws:** `ConfigurationError` if JSON is invalid

---

### MetricsCollector

Collects performance and usage metrics.

#### Constructor

```typescript
constructor()
```

#### Methods

##### recordEvaluation()

Record an evaluation.

```typescript
recordEvaluation(
  decision: Decision,
  evaluationTime: number,
  policyCount: number
): void
```

---

##### getMetrics()

Get collected metrics.

```typescript
getMetrics(): EvaluationMetrics
```

---

##### reset()

Reset all metrics.

```typescript
reset(): void
```

---

## Utilities

### AttributeRef

Helper for creating attribute references.

#### Static Methods

##### subject()

Create subject attribute reference.

```typescript
static subject(attributeId: string, path?: string): AttributeReference
```

**Example:**

```typescript
AttributeRef.subject('department')
AttributeRef.subject('profile', 'attributes.profile')
```

---

##### resource()

Create resource attribute reference.

```typescript
static resource(attributeId: string, path?: string): AttributeReference
```

---

##### action()

Create action attribute reference.

```typescript
static action(attributeId: string, path?: string): AttributeReference
```

---

##### environment()

Create environment attribute reference.

```typescript
static environment(attributeId: string, path?: string): AttributeReference
```

---

### Validation Functions

#### validatePolicy()

Validate a single policy.

```typescript
function validatePolicy(policy: ABACPolicy): PolicyValidationResult
```

**Returns:**

```typescript
interface PolicyValidationResult {
  valid: boolean;
  errors: PolicyValidationError[];
  warnings: PolicyValidationWarning[];
  policyId: string;
}
```

**Example:**

```typescript
const result = validatePolicy(myPolicy);
if (!result.valid) {
  console.error('Errors:', result.errors);
}
```

---

#### validatePolicies()

Validate multiple policies.

```typescript
function validatePolicies(policies: ABACPolicy[]): PolicyValidationResult[]
```

---

#### validatePolicyOrThrow()

Validate and throw if invalid.

```typescript
function validatePolicyOrThrow(policy: ABACPolicy): void
```

**Throws:** `ValidationError` if validation fails

---

### Policy Loaders

#### loadPoliciesFromFile()

Load policies from JSON file.

```typescript
async function loadPoliciesFromFile(
  filePath: string
): Promise<ABACPolicy[]>
```

**Throws:** `PolicyStorageError` on failure

---

#### loadAndValidatePoliciesFromFile()

Load and validate policies from file.

```typescript
async function loadAndValidatePoliciesFromFile(
  filePath: string
): Promise<{
  policies: ABACPolicy[];
  validationResults: PolicyValidationResult[];
}>
```

**Throws:** `ValidationError` if validation fails

---

#### loadPoliciesFromJSON()

Load policies from JSON string.

```typescript
function loadPoliciesFromJSON(json: string): ABACPolicy[]
```

**Throws:** `PolicyStorageError` on parse failure

---

## Types

### ABACRequest

```typescript
interface ABACRequest {
  subject: Subject;
  resource: Resource;
  action: Action;
  environment?: Environment;
}

interface Subject {
  id: string;
  attributes?: Record<string, AttributeValue>;
}

interface Resource {
  id: string;
  type?: string;
  attributes?: Record<string, AttributeValue>;
}

interface Action {
  id: string;
  attributes?: Record<string, AttributeValue>;
}

interface Environment {
  currentTime?: Date;
  ipAddress?: string;
  [key: string]: AttributeValue;
}
```

---

### ABACPolicy

```typescript
interface ABACPolicy {
  id: string;
  version: string;
  effect: Effect;
  description?: string;
  target?: PolicyTarget;
  condition?: Condition;
  obligations?: Obligation[];
  advice?: Advice[];
}
```

---

### ABACDecision

```typescript
interface ABACDecision {
  decision: Decision;
  obligations: Obligation[];
  advice: Advice[];
  matchedPolicies: string[];
  evaluationDetails?: {
    totalPolicies: number;
    applicablePolicies: number;
    evaluationTime: number;
    errors: string[];
  };
}
```

---

### Condition

```typescript
type Condition =
  | ComparisonCondition
  | LogicalCondition
  | FunctionCondition;

interface ComparisonCondition {
  operator: ComparisonOperator;
  left: AttributeReference | AttributeValue;
  right: AttributeReference | AttributeValue;
}

interface LogicalCondition {
  operator: LogicalOperator;
  conditions: Condition[];
}

interface FunctionCondition {
  function: string;
  args: Array<AttributeReference | AttributeValue>;
}
```

---

### AttributeValue

```typescript
type AttributeValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | Record<string, unknown>
  | null
  | undefined;
```

---

## Enums

### Decision

```typescript
enum Decision {
  Permit = 'Permit',
  Deny = 'Deny',
  NotApplicable = 'NotApplicable',
  Indeterminate = 'Indeterminate'
}
```

---

### Effect

```typescript
enum Effect {
  Permit = 'Permit',
  Deny = 'Deny'
}
```

---

### ComparisonOperator

```typescript
enum ComparisonOperator {
  Equals = 'equals',
  NotEquals = 'notEquals',
  GreaterThan = 'greaterThan',
  LessThan = 'lessThan',
  GreaterThanOrEqual = 'greaterThanOrEqual',
  LessThanOrEqual = 'lessThanOrEqual',
  In = 'in',
  NotIn = 'notIn',
  Contains = 'contains',
  NotContains = 'notContains',
  Exists = 'exists',
  NotExists = 'notExists'
}
```

---

### LogicalOperator

```typescript
enum LogicalOperator {
  And = 'and',
  Or = 'or',
  Not = 'not'
}
```

---

### CombiningAlgorithm

```typescript
enum CombiningAlgorithm {
  DenyOverrides = 'deny-overrides',
  PermitOverrides = 'permit-overrides',
  FirstApplicable = 'first-applicable',
  OnlyOneApplicable = 'only-one-applicable',
  DenyUnlessPermit = 'deny-unless-permit',
  PermitUnlessDeny = 'permit-unless-deny'
}
```

---

## Error Classes

See [ERROR_HANDLING.md](./ERROR_HANDLING.md) for complete documentation.

### Error Hierarchy

- `ABACError` - Base error class
  - `ValidationError` - Policy/request validation
  - `ConfigurationError` - Configuration issues
  - `EvaluationError` - Evaluation failures
  - `AttributeResolutionError` - Attribute provider failures
  - `RequestValidationError` - Invalid requests
  - `PolicyNotFoundError` - Policy not found
  - `CombiningAlgorithmError` - Algorithm errors
  - `PolicyStorageError` - Storage failures

---

## Additional Resources

- [GLOSSARY.md](./GLOSSARY.md) - Complete terminology guide
- [POLICY_GUIDE.md](./POLICY_GUIDE.md) - How to write policies
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling guide
- [Examples](/examples) - Real-world examples
