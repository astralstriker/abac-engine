# ABAC Engine Glossary

A comprehensive guide to all terms, concepts, and terminology used in the ABAC Engine.

## Table of Contents

- [Core ABAC Concepts](#core-abac-concepts)
- [Architecture Components](#architecture-components)
- [Policy Components](#policy-components)
- [Evaluation Concepts](#evaluation-concepts)
- [Technical Terms](#technical-terms)
- [Implementation Specifics](#implementation-specifics)

---

## Core ABAC Concepts

### ABAC (Attribute-Based Access Control)

An access control paradigm where authorization decisions are based on **attributes** of the entities involved in the request, rather than predefined roles or relationships.

**Example**: Instead of "Admins can delete files" (RBAC), you have "Users can delete files if user.department = file.department AND user.clearanceLevel >= 5" (ABAC).

**Why ABAC?**
- More flexible than RBAC
- Fine-grained access control
- Context-aware decisions
- No role explosion problem

---

### Attribute

A property or characteristic of a subject, resource, action, or environment that can be used in authorization decisions.

**Types of Attributes:**
- **Subject Attributes**: Properties of the user/service making the request
  - Examples: `userId`, `department`, `clearanceLevel`, `roles`, `email`
- **Resource Attributes**: Properties of the item being accessed
  - Examples: `documentId`, `owner`, `classification`, `department`, `createdAt`
- **Action Attributes**: Properties of the operation being performed
  - Examples: `actionId`, `method`, `scope`
- **Environment Attributes**: Contextual information about the request
  - Examples: `currentTime`, `ipAddress`, `location`, `deviceType`

**Attribute Values**: Can be strings, numbers, booleans, arrays, or objects.

```typescript
// Subject attributes
{
  id: "user-123",
  department: "Engineering",
  clearanceLevel: 3,
  roles: ["developer", "reviewer"]
}

// Resource attributes
{
  id: "doc-456",
  owner: "user-123",
  classification: 2,
  department: "Engineering"
}
```

---

### Policy

A rule that defines under what conditions access should be granted (Permit) or denied (Deny).

**Components of a Policy:**
- **ID**: Unique identifier
- **Effect**: Permit or Deny
- **Condition**: Boolean expression that must be true
- **Target** (optional): Pre-filter for applicability
- **Obligations** (optional): Required actions if policy applies
- **Advice** (optional): Suggested actions if policy applies

**Example Policy**: "Permit if subject.department equals resource.department AND subject.clearanceLevel is greater than resource.classification"

---

### Request

The authorization question being asked. Contains information about who wants to do what to what resource.

**Components:**
- **Subject**: Who is making the request
- **Resource**: What is being accessed
- **Action**: What operation is being performed
- **Environment** (optional): Contextual information

```typescript
const request: ABACRequest = {
  subject: {
    id: "user-123",
    attributes: { department: "Engineering" }
  },
  resource: {
    id: "doc-456",
    attributes: { owner: "user-789" }
  },
  action: {
    id: "read"
  },
  environment: {
    currentTime: new Date(),
    ipAddress: "192.168.1.1"
  }
};
```

---

### Decision

The result of evaluating a request against policies.

**Possible Decisions:**
- **Permit**: Access is granted
- **Deny**: Access is explicitly denied
- **NotApplicable**: No policies matched the request
- **Indeterminate**: Evaluation failed or produced uncertain result

**Decision Response Includes:**
- Decision value (Permit/Deny/NotApplicable/Indeterminate)
- Matched policies
- Obligations to fulfill
- Advice to consider
- Evaluation details (time, errors, etc.)

---

## Architecture Components

### PDP (Policy Decision Point)

The core evaluation engine that makes authorization decisions. In this library, the `ABACEngine` class is the PDP.

**Responsibilities:**
- Evaluate requests against policies
- Apply combining algorithms
- Resolve attribute references
- Execute condition logic
- Return authorization decisions

**Usage:**
```typescript
const engine = new ABACEngine({ policies });
const decision = await engine.evaluate(request, policies);
```

---

### PIP (Policy Information Point)

Components that provide attributes during evaluation. In this library, these are `AttributeProvider` implementations.

**Purpose**: Fetch additional attributes that aren't included in the initial request.

**Examples:**
- Database provider: Fetches user attributes from database
- LDAP provider: Retrieves attributes from Active Directory
- REST API provider: Calls external services for attributes
- Environment provider: Adds contextual information (time, IP, etc.)

**Usage:**
```typescript
const provider = new DatabaseAttributeProvider('subject', 'users', {
  connectionString: 'postgresql://...',
  tableMapping: { department: 'users' },
  attributeMapping: { department: 'dept_name' }
});

engine.addAttributeProvider(provider);
```

---

### PAP (Policy Administration Point)

Where policies are created, modified, and stored. This is typically your database or policy management system.

**Not Included in this Library**: The library provides tools to work with policies, but you decide where and how to store them.

**Common Implementations:**
- PostgreSQL/MySQL database
- MongoDB
- Redis
- File system
- Policy management UI

---

### PEP (Policy Enforcement Point)

The component that enforces authorization decisions in your application. Typically middleware or guards.

**Not Included in this Library**: You implement the PEP in your application.

**Example PEP (Express middleware):**
```typescript
async function abacMiddleware(req, res, next) {
  const request = buildABACRequest(req);
  const policies = await loadPolicies();
  const decision = await engine.evaluate(request, policies);

  if (decision.decision === Decision.Permit) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
}
```

---

## Policy Components

### Effect

What a policy does if its condition is true.

**Values:**
- **Permit**: Grants access
- **Deny**: Denies access

**Note**: A policy only produces its effect if the condition evaluates to `true`.

---

### Condition

A boolean expression that determines whether a policy applies to a request.

**Types:**

#### Comparison Condition
Compares two values using an operator.

```typescript
{
  operator: 'equals',
  left: { category: 'subject', attributeId: 'department' },
  right: { category: 'resource', attributeId: 'department' }
}
```

**Operators**: `equals`, `notEquals`, `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `in`, `notIn`, `contains`, `notContains`, `exists`, `notExists`

#### Logical Condition
Combines multiple conditions with logic.

```typescript
{
  operator: 'and',
  conditions: [
    { operator: 'equals', left: ..., right: ... },
    { operator: 'greaterThan', left: ..., right: ... }
  ]
}
```

**Operators**: `and`, `or`, `not`

#### Function Condition
Calls a custom function to evaluate.

```typescript
{
  function: 'isBusinessHours',
  args: [{ category: 'environment', attributeId: 'currentTime' }]
}
```

---

### Target

An optional pre-filter that determines if a policy is applicable to a request before evaluating the condition.

**Purpose**: Optimize evaluation by skipping irrelevant policies.

```typescript
{
  resource: { type: 'document' },
  action: { id: 'read' }
}
// This policy only applies to 'read' actions on 'document' resources
```

---

### Obligation

An action that **MUST** be performed if a policy's effect is returned in the final decision.

**Use Cases:**
- Logging access attempts
- Sending notifications
- Recording audit trails
- Enforcing additional security measures

```typescript
{
  id: 'log-access',
  parameters: {
    level: 'info',
    message: 'Sensitive document accessed'
  }
}
```

**Important**: Your application (PEP) is responsible for fulfilling obligations.

---

### Advice

An optional suggestion from a policy that can be considered but is not required.

**Use Cases:**
- Recommend two-factor authentication
- Suggest changing password
- Warn about risky behavior

```typescript
{
  id: 'recommend-mfa',
  parameters: {
    message: 'Consider enabling MFA for this resource'
  }
}
```

---

## Evaluation Concepts

### Combining Algorithm

A strategy for resolving conflicts when multiple policies apply to a request.

**Available Algorithms:**

#### Deny Overrides
If any policy evaluates to Deny, the result is Deny.

**Use Case**: Security-first approach - any explicit deny wins.

#### Permit Overrides
If any policy evaluates to Permit, the result is Permit.

**Use Case**: Access-first approach - any explicit permit wins.

#### First Applicable
Return the decision of the first applicable policy.

**Use Case**: Ordered policy sets where order matters.

#### Only One Applicable
Only one policy should be applicable. If multiple apply, result is Indeterminate.

**Use Case**: Mutually exclusive policies.

#### Deny Unless Permit
Result is Deny unless there's an explicit Permit.

**Use Case**: Whitelist approach - deny by default.

#### Permit Unless Deny
Result is Permit unless there's an explicit Deny.

**Use Case**: Blacklist approach - permit by default.

---

### Attribute Reference

A pointer to an attribute value within a request.

```typescript
{
  category: 'subject',      // Which entity
  attributeId: 'department', // Which attribute
  path: 'attributes.department' // Optional: nested path
}
```

**Categories**: `subject`, `resource`, `action`, `environment`

---

### Attribute Resolution

The process of fetching attribute values from providers during evaluation.

**Flow:**
1. Request comes in with some attributes
2. Engine identifies needed attributes from policies
3. Attribute providers fetch missing attributes
4. Request is enhanced with all attributes
5. Policies are evaluated

---

## Technical Terms

### Tenant

An isolated customer or organization in a multi-tenant system.

**In ABAC Context**: Each tenant has its own data, policies, and users that are isolated from other tenants.

**Example**: In a SaaS application:
- Tenant A: Acme Corp (has 100 users, 5000 documents)
- Tenant B: Widget Inc (has 50 users, 2000 documents)

Users in Tenant A cannot access Tenant B's data.

---

### Multi-Tenant

A software architecture where a single instance of the application serves multiple tenants (customers/organizations), with complete data isolation between them.

**ABAC for Multi-Tenancy:**
```typescript
const policy = PolicyBuilder.create('tenant-isolation')
  .permit()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    )
  )
  .build();
```

This ensures users can only access resources from their own tenant.

---

### Policy Set

A collection of policies that are evaluated together using a combining algorithm.

```typescript
const policies: ABACPolicy[] = [
  tenantIsolationPolicy,
  departmentAccessPolicy,
  timeBasedPolicy
];

const decision = await engine.evaluate(request, policies);
```

---

### Request Context

Additional contextual information included in or derived during request evaluation.

**Includes:**
- Environment attributes (time, location, IP)
- Session information
- Audit trail data
- Request metadata

---

### Evaluation Context

Internal state maintained during policy evaluation.

**Contains:**
- Enhanced request with all attributes
- Evaluation stack
- Function registry
- Logger instance
- Performance metrics

---

## Implementation Specifics

### Engine Configuration

Settings that control how the ABAC engine behaves.

```typescript
interface ABACEngineConfig {
  policies: ABACPolicy[];               // Initial policies
  attributeProviders?: AttributeProvider[]; // Attribute sources
  enableAuditLog?: boolean;             // Log all decisions
  enablePerformanceMetrics?: boolean;   // Track metrics
  cacheResults?: boolean;               // Cache decisions
  cacheTTL?: number;                    // Cache lifetime (seconds)
  maxEvaluationTime?: number;           // Timeout (milliseconds)
  logger?: ILogger;                     // Custom logger
}
```

---

### Attribute Provider

An interface for fetching attributes from external sources.

**Methods:**
- `getAttributes(id: string): Promise<Record<string, AttributeValue>>`
- `supportsAttribute(attributeId: string): boolean`

**Built-in Providers:**
- `InMemoryAttributeProvider`: Static attribute map
- `DatabaseAttributeProvider`: SQL database
- `RestApiAttributeProvider`: HTTP API
- `LdapAttributeProvider`: LDAP/Active Directory
- `CachedAttributeProvider`: Adds caching to any provider
- `CompositeAttributeProvider`: Combines multiple providers

---

### Function Registry

A registry of custom functions that can be used in policy conditions.

```typescript
functionRegistry.register('isBusinessHours', (time: Date) => {
  const hour = time.getHours();
  return hour >= 9 && hour < 17;
});
```

**Usage in Policy:**
```typescript
{
  function: 'isBusinessHours',
  args: [{ category: 'environment', attributeId: 'currentTime' }]
}
```

---

### Audit Log

A record of all authorization decisions made by the engine.

**Contains:**
- Request ID
- Timestamp
- Subject, resource, action
- Decision and reason
- Matched policies
- Evaluation time
- Errors (if any)

**Usage:**
```typescript
const logs = engine.getAuditLogs();
const recentLogs = engine.getAuditLogs(100); // Last 100
```

---

### Metrics

Performance and usage statistics collected by the engine.

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

---

### Cache

Temporary storage of evaluation results to improve performance.

**Cache Key**: Hash of request + policies

**Benefits:**
- Faster repeated evaluations
- Reduced database queries
- Lower latency

**Considerations:**
- Cache invalidation when policies change
- TTL (time-to-live) configuration
- Memory usage

---

### Logger

An interface for outputting diagnostic information.

**Log Levels**: `debug`, `info`, `warn`, `error`

**Built-in Loggers:**
- `SilentLogger`: No output (default)
- `ConsoleLogger`: Outputs to console

**Custom Logger**: Implement `ILogger` interface

---

### Validation

The process of checking if a policy is well-formed and valid.

**Checks:**
- Required fields present
- Valid operators
- Correct condition structure
- Valid attribute references
- No circular dependencies

```typescript
const result = validatePolicy(policy);
if (!result.valid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

---

### Error Codes

Standardized error identifiers for different failure scenarios.

**Error Types:**
- `VALIDATION_ERROR`: Policy or request validation failed
- `CONFIGURATION_ERROR`: Invalid engine configuration
- `EVALUATION_ERROR`: Runtime evaluation failure
- `ATTRIBUTE_RESOLUTION_ERROR`: Failed to fetch attributes
- `REQUEST_VALIDATION_ERROR`: Invalid request structure
- `POLICY_NOT_FOUND`: Policy lookup failed
- `COMBINING_ALGORITHM_ERROR`: Algorithm evaluation failed
- `POLICY_STORAGE_ERROR`: Failed to load/save policies

See [ERROR_HANDLING.md](./ERROR_HANDLING.md) for details.

---

## Additional Resources

- **README.md**: Quick start and examples
- **POLICY_GUIDE.md**: How to write effective policies
- **ERROR_HANDLING.md**: Error handling best practices
- **API_REFERENCE.md**: Complete API documentation
- **EXAMPLES.md**: Real-world usage examples

---

## Quick Reference

| Term | Description | Example |
|------|-------------|---------|
| ABAC | Attribute-Based Access Control | Authorization based on attributes |
| Attribute | Property of subject/resource/action/environment | `department: "Engineering"` |
| Policy | Rule granting/denying access | If dept matches, permit read |
| Condition | Boolean expression | `subject.dept == resource.dept` |
| Effect | Result if condition true | Permit or Deny |
| Decision | Evaluation result | Permit/Deny/NotApplicable/Indeterminate |
| PDP | Policy Decision Point | ABACEngine (this library) |
| PIP | Policy Information Point | AttributeProvider |
| PAP | Policy Administration Point | Your policy database |
| PEP | Policy Enforcement Point | Your middleware |
| Obligation | Required action | Log access, send notification |
| Advice | Optional suggestion | Recommend MFA |
| Tenant | Isolated customer/org | Acme Corp, Widget Inc |
| Multi-Tenant | Multiple isolated customers | SaaS application serving many orgs |

---

**Need Help?** Check the examples in the `/examples` directory or create an issue on GitHub.
