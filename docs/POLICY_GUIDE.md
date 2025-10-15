# ABAC Policy Creation Guide

> **Note:** This is a supplementary guide with advanced examples. For getting
> started, see the main [README.md](./README.md) which covers the basics and
> explains all ABAC concepts.

A comprehensive reference for creating, testing, and managing ABAC policies.

## Table of Contents

- [Introduction](#introduction)
- [Policy Anatomy](#policy-anatomy)
- [Creating Policies](#creating-policies)
- [Conditions & Operators](#conditions--operators)
- [Policy Patterns](#policy-patterns)
- [Testing Policies](#testing-policies)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## Introduction

In ABAC, policies are the rules that determine whether access should be granted
or denied. Unlike RBAC where you assign roles and permissions, ABAC policies
evaluate attributes dynamically.

### Key Concepts

- **Policy**: A rule that evaluates to Permit or Deny
- **Condition**: The logic that checks attribute values
- **Target**: Optional pre-filter for when a policy applies
- **Obligation**: Required action when policy matches
- **Advice**: Optional recommendation when policy matches

---

## Policy Anatomy

### Basic Structure

```typescript
interface ABACPolicy {
  id: string; // Unique identifier
  version: string; // Policy version (e.g., "1.0.0")
  description?: string; // Human-readable description
  effect: 'Permit' | 'Deny'; // What happens when condition matches
  target?: PolicyTarget; // Optional pre-filter
  condition?: Condition; // Main evaluation logic
  priority?: number; // Higher = evaluated first
  obligations?: Obligation[]; // Required actions
  advice?: Advice[]; // Optional recommendations
  metadata?: PolicyMetadata; // Creation info, tags, etc.
}
```

### Example Policy (JSON)

```json
{
  "id": "department-document-access",
  "version": "1.0.0",
  "description": "Allow users to access documents from their department",
  "effect": "Permit",
  "condition": {
    "operator": "and",
    "conditions": [
      {
        "operator": "equals",
        "left": {
          "category": "subject",
          "attributeId": "department"
        },
        "right": {
          "category": "resource",
          "attributeId": "department"
        }
      },
      {
        "operator": "in",
        "left": {
          "category": "action",
          "attributeId": "id"
        },
        "right": ["read", "view"]
      }
    ]
  },
  "obligations": [
    {
      "id": "log-access",
      "type": "log",
      "parameters": {
        "reason": "department_access",
        "level": "info"
      }
    }
  ]
}
```

---

## Creating Policies

### Method 1: Policy Builder (Recommended)

The fluent PolicyBuilder API provides type safety and better IDE support:

```typescript
import { PolicyBuilder, ConditionBuilder, AttributeRef } from 'abac-engine';

const policy = PolicyBuilder.create('my-policy')
  .version('1.0.0')
  .description('My access control policy')
  .permit() // or .deny()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('department'),
      AttributeRef.resource('department')
    )
  )
  .build();
```

### Method 2: Direct Object Creation

For programmatic generation or JSON-based policies:

```typescript
import { ABACPolicy } from 'abac-engine';

const policy: ABACPolicy = {
  id: 'my-policy',
  version: '1.0.0',
  effect: 'Permit',
  condition: {
    operator: 'equals',
    left: { category: 'subject', attributeId: 'department' },
    right: { category: 'resource', attributeId: 'department' }
  }
};
```

### Method 3: Pre-built Patterns

For common scenarios:

```typescript
import { PolicyPatterns } from 'abac-engine';

const ownershipPolicy = PolicyPatterns.ownership(['read', 'update', 'delete']);
const deptPolicy = PolicyPatterns.departmentAccess(
  ['read'],
  ['public', 'internal']
);
const timePolicy = PolicyPatterns.businessHoursOnly(['create', 'update']);
```

---

## Conditions & Operators

### Comparison Operators

#### Equality

```typescript
// Exact match
ConditionBuilder.equals(AttributeRef.subject('status'), 'active');

// Not equal
ConditionBuilder.notEquals(AttributeRef.resource('type'), 'archived');
```

#### Numeric Comparison

```typescript
// Greater than
ConditionBuilder.greaterThan(AttributeRef.subject('clearanceLevel'), 3);

// Greater than or equal
ConditionBuilder.greaterThanOrEqual(AttributeRef.subject('age'), 18);

// Less than
ConditionBuilder.lessThan(
  AttributeRef.resource('fileSize'),
  1048576 // 1MB
);

// Less than or equal
ConditionBuilder.lessThanOrEqual(AttributeRef.environment('hourOfDay'), 17);
```

#### Set Operations

```typescript
// In array
ConditionBuilder.in(AttributeRef.action('id'), ['read', 'view', 'list']);

// Not in array
ConditionBuilder.notIn(AttributeRef.subject('role'), ['guest', 'suspended']);

// Contains (for arrays)
ConditionBuilder.contains(AttributeRef.subject('groups'), 'administrators');
```

#### String Operations

```typescript
// Starts with
ConditionBuilder.startsWith(AttributeRef.resource('path'), '/secure/');

// Ends with
ConditionBuilder.endsWith(AttributeRef.resource('filename'), '.pdf');

// Regex match
ConditionBuilder.matchesRegex(
  AttributeRef.subject('email'),
  '^[a-zA-Z0-9]+@company\\.com$'
);
```

#### Existence Checks

```typescript
// Attribute exists
ConditionBuilder.exists(AttributeRef.subject('securityClearance'));

// Attribute doesn't exist
ConditionBuilder.notExists(AttributeRef.resource('deletedAt'));
```

### Logical Operators

#### AND (All conditions must be true)

```typescript
ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering')
  .and(ConditionBuilder.greaterThan(AttributeRef.subject('clearanceLevel'), 2))
  .and(ConditionBuilder.equals(AttributeRef.environment('location'), 'office'));
```

#### OR (Any condition can be true)

```typescript
ConditionBuilder.equals(AttributeRef.subject('role'), 'admin')
  .or(ConditionBuilder.equals(AttributeRef.subject('role'), 'owner'))
  .or(
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('createdBy')
    )
  );
```

#### NOT (Negation)

```typescript
ConditionBuilder.equals(AttributeRef.subject('status'), 'active').not();
```

#### Complex Combinations

```typescript
const condition = ConditionBuilder.and(
  // Must be from Engineering or Security
  ConditionBuilder.in(AttributeRef.subject('department'), [
    'Engineering',
    'Security'
  ]),

  // AND (high clearance OR is owner)
  ConditionBuilder.or(
    ConditionBuilder.greaterThan(AttributeRef.subject('clearanceLevel'), 4),
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('owner')
    )
  ),

  // AND during business hours
  ConditionBuilder.function('is_business_hours')
);
```

### Custom Functions

For complex logic that can't be expressed with operators:

```typescript
// Register function
engine.registerFunction('is_team_member', async (args, request) => {
  const userId = args[0];
  const teamId = args[1];

  const members = await db.teamMembers.findMany({
    where: { teamId, userId }
  });

  return members.length > 0;
});

// Use in policy
const policy = PolicyBuilder.create('team-access')
  .permit()
  .condition(
    ConditionBuilder.function(
      'is_team_member',
      AttributeRef.subject('id'),
      AttributeRef.resource('teamId')
    )
  )
  .build();
```

---

## Policy Patterns

### 1. Ownership-Based Access

```typescript
const ownershipPolicy = PolicyBuilder.create('ownership')
  .version('1.0.0')
  .description('Users can access resources they own')
  .permit()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('owner')
    )
  )
  .tags('ownership', 'basic')
  .build();
```

### 2. Department-Based Access

```typescript
const departmentPolicy = PolicyBuilder.create('department-access')
  .version('1.0.0')
  .permit()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('department'),
      AttributeRef.resource('department')
    ).and(
      ConditionBuilder.in(AttributeRef.resource('sensitivity'), [
        'public',
        'internal'
      ])
    )
  )
  .build();
```

### 3. Hierarchical Access (Manager)

```typescript
const managerPolicy = PolicyBuilder.create('manager-access')
  .version('1.0.0')
  .permit()
  .condition(
    // User is a manager
    ConditionBuilder.equals(AttributeRef.subject('role'), 'manager')
      // Same department
      .and(
        ConditionBuilder.equals(
          AttributeRef.subject('department'),
          AttributeRef.resource('department')
        )
      )
      // Not confidential
      .and(
        ConditionBuilder.notEquals(
          AttributeRef.resource('classification'),
          'confidential'
        )
      )
  )
  .build();
```

### 4. Time-Based Access

```typescript
const businessHoursPolicy = PolicyBuilder.create('business-hours')
  .version('1.0.0')
  .deny()
  .description('Deny sensitive operations outside business hours')
  .condition(
    ConditionBuilder.function('is_outside_business_hours')
      .and(
        ConditionBuilder.in(AttributeRef.action('id'), [
          'create',
          'update',
          'delete'
        ])
      )
      .and(
        ConditionBuilder.equals(
          AttributeRef.resource('requiresBusinessHours'),
          true
        )
      )
  )
  .build();
```

### 5. Location-Based Access

```typescript
const locationPolicy = PolicyBuilder.create('secure-location')
  .version('1.0.0')
  .deny()
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('requiresSecureLocation'),
      true
    ).and(
      ConditionBuilder.notIn(AttributeRef.environment('location'), [
        'office',
        'secure_facility',
        'vpn'
      ])
    )
  )
  .build();
```

### 6. Multi-Factor Authentication

```typescript
const mfaPolicy = PolicyBuilder.create('mfa-required')
  .version('1.0.0')
  .deny()
  .description('Require MFA for sensitive actions')
  .condition(
    ConditionBuilder.in(AttributeRef.action('id'), [
      'delete',
      'transfer',
      'approve'
    ]).and(
      ConditionBuilder.notEquals(AttributeRef.subject('mfaVerified'), true)
    )
  )
  .advice([
    {
      id: 'mfa-prompt',
      type: 'info',
      parameters: { message: 'MFA verification required' }
    }
  ])
  .build();
```

### 7. Classification-Level Access

```typescript
const classificationPolicy = PolicyBuilder.create('classification')
  .version('1.0.0')
  .permit()
  .condition(
    // Public documents - anyone can read
    ConditionBuilder.equals(AttributeRef.resource('classification'), 'public')
      .or(
        // Internal - employees only
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('classification'),
            'internal'
          ),
          ConditionBuilder.equals(
            AttributeRef.subject('employeeStatus'),
            'active'
          )
        )
      )
      .or(
        // Confidential - department + clearance
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('classification'),
            'confidential'
          ),
          ConditionBuilder.equals(
            AttributeRef.subject('department'),
            AttributeRef.resource('department')
          ),
          ConditionBuilder.greaterThanOrEqual(
            AttributeRef.subject('clearanceLevel'),
            3
          )
        )
      )
      .or(
        // Secret - high clearance only
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('classification'),
            'secret'
          ),
          ConditionBuilder.greaterThanOrEqual(
            AttributeRef.subject('clearanceLevel'),
            5
          )
        )
      )
  )
  .build();
```

### 8. Delegation Pattern

```typescript
const delegationPolicy = PolicyBuilder.create('delegation')
  .version('1.0.0')
  .permit()
  .condition(
    ConditionBuilder.function(
      'has_delegation',
      AttributeRef.subject('id'),
      AttributeRef.resource('owner'),
      AttributeRef.action('id')
    )
  )
  .build();

// Custom function
engine.registerFunction('has_delegation', async (args, request) => {
  const delegateId = args[0];
  const ownerId = args[1];
  const action = args[2];

  const delegation = await db.delegations.findFirst({
    where: {
      ownerId,
      delegateId,
      actions: { has: action },
      validUntil: { gte: new Date() }
    }
  });

  return !!delegation;
});
```

### 9. Emergency Access

```typescript
const emergencyPolicy = PolicyBuilder.create('emergency-access')
  .version('1.0.0')
  .permit()
  .priority(1000) // Very high priority
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('role'),
      'emergency_responder'
    ).and(
      ConditionBuilder.equals(AttributeRef.environment('emergencyMode'), true)
    )
  )
  .logObligation({
    level: 'critical',
    reason: 'emergency_access',
    requiresReview: true
  })
  .notifyObligation({
    recipients: ['security@company.com', 'compliance@company.com'],
    message: 'Emergency access granted'
  })
  .build();
```

### 10. Document Lifecycle

```typescript
const lifecyclePolicy = PolicyBuilder.create('document-lifecycle')
  .version('1.0.0')
  .permit()
  .condition(
    // Draft - owner can do anything
    ConditionBuilder.and(
      ConditionBuilder.equals(AttributeRef.resource('status'), 'draft'),
      ConditionBuilder.equals(
        AttributeRef.subject('id'),
        AttributeRef.resource('owner')
      )
    )
      .or(
        // Review - reviewers can read/comment
        ConditionBuilder.and(
          ConditionBuilder.equals(AttributeRef.resource('status'), 'review'),
          ConditionBuilder.function(
            'is_reviewer',
            AttributeRef.subject('id'),
            AttributeRef.resource('id')
          ),
          ConditionBuilder.in(AttributeRef.action('id'), ['read', 'comment'])
        )
      )
      .or(
        // Published - same department can read
        ConditionBuilder.and(
          ConditionBuilder.equals(AttributeRef.resource('status'), 'published'),
          ConditionBuilder.equals(
            AttributeRef.subject('department'),
            AttributeRef.resource('department')
          ),
          ConditionBuilder.equals(AttributeRef.action('id'), 'read')
        )
      )
      .or(
        // Archived - admins only
        ConditionBuilder.and(
          ConditionBuilder.equals(AttributeRef.resource('status'), 'archived'),
          ConditionBuilder.equals(AttributeRef.subject('role'), 'admin')
        )
      )
  )
  .build();
```

---

## Testing Policies

### Unit Testing Policies

```typescript
import { ABACEngine, PolicyBuilder } from 'abac-engine';

describe('Policy Tests', () => {
  let engine: ABACEngine;

  beforeEach(() => {
    engine = new ABACEngine({
      combiningAlgorithm: 'deny-overrides'
    });
  });

  test('ownership policy allows owner', async () => {
    const policy = PolicyBuilder.create('ownership')
      .permit()
      .condition(
        ConditionBuilder.equals(
          AttributeRef.subject('id'),
          AttributeRef.resource('owner')
        )
      )
      .build();

    const request = {
      subject: { id: 'user123', attributes: {} },
      resource: {
        id: 'doc1',
        type: 'document',
        attributes: { owner: 'user123' }
      },
      action: { id: 'read' }
    };

    const decision = await engine.evaluate(request, [policy]);
    expect(decision.decision).toBe('Permit');
  });

  test('ownership policy denies non-owner', async () => {
    const policy = PolicyBuilder.create('ownership')
      .permit()
      .condition(
        ConditionBuilder.equals(
          AttributeRef.subject('id'),
          AttributeRef.resource('owner')
        )
      )
      .build();

    const request = {
      subject: { id: 'user456', attributes: {} },
      resource: {
        id: 'doc1',
        type: 'document',
        attributes: { owner: 'user123' }
      },
      action: { id: 'read' }
    };

    const decision = await engine.evaluate(request, [policy]);
    expect(decision.decision).toBe('NotApplicable');
  });
});
```

### Integration Testing

```typescript
import { ABACEngine } from 'abac-engine';
import { setupProviders, loadPolicies } from './test-utils';

describe('ABAC Integration Tests', () => {
  let engine: ABACEngine;

  beforeAll(async () => {
    const providers = await setupProviders();
    const policies = await loadPolicies();

    engine = new ABACEngine({
      combiningAlgorithm: 'deny-overrides',
      attributeProviders: providers
    });
  });

  test('complex scenario: department manager accessing team document', async () => {
    const request = {
      subject: { id: 'manager1', attributes: {} },
      resource: { id: 'team-doc-1', type: 'document', attributes: {} },
      action: { id: 'update' },
      environment: {
        currentTime: new Date('2024-01-15T14:00:00Z') // Monday, 2 PM
      }
    };

    const policies = await loadPolicies();
    const decision = await engine.evaluate(request, policies);

    expect(decision.decision).toBe('Permit');
    expect(decision.obligations).toContainEqual(
      expect.objectContaining({ type: 'log' })
    );
  });
});
```

### Policy Coverage Testing

```typescript
import { PolicyCoverageTester } from 'abac-engine';

const tester = new PolicyCoverageTester();

const scenarios = [
  {
    name: 'Owner reads own document',
    request: {
      /* ... */
    },
    expectedDecision: 'Permit',
    expectedPolicies: ['ownership-policy']
  },
  {
    name: 'Department member reads department document',
    request: {
      /* ... */
    },
    expectedDecision: 'Permit',
    expectedPolicies: ['department-policy']
  }
  // ... more scenarios
];

const coverage = tester.analyzeCoverage(policies, scenarios);

console.log(`Policy coverage: ${coverage.percentage}%`);
console.log(`Untested policies:`, coverage.untestedPolicies);
```

---

## Best Practices

### 1. Policy Organization

**Group Related Policies:**

```typescript
// policies/documents/read.ts
export const documentReadPolicies = [
  ownershipReadPolicy,
  departmentReadPolicy,
  publicReadPolicy
];

// policies/documents/write.ts
export const documentWritePolicies = [ownershipWritePolicy, managerWritePolicy];

// policies/documents/index.ts
export const documentPolicies = [
  ...documentReadPolicies,
  ...documentWritePolicies
];
```

### 2. Use Meaningful IDs

```typescript
// ❌ Bad
PolicyBuilder.create('policy1');

// ✅ Good
PolicyBuilder.create('document-department-read-v1');
```

### 3. Always Add Descriptions

```typescript
PolicyBuilder.create('emergency-access').description(
  'Allows emergency responders to access all systems during declared emergencies. ' +
    'Requires emergency mode to be active and triggers critical audit logging.'
);
// ... rest of policy
```

### 4. Use Priority for Exceptions

```typescript
// Base policy (low priority)
const basePolicy = PolicyBuilder.create('base-access')
  .priority(10)
  .permit()
  .condition(/* ... */)
  .build();

// Exception policy (high priority)
const exceptionPolicy = PolicyBuilder.create('security-exception')
  .priority(100)
  .deny()
  .condition(/* ... */)
  .build();
```

### 5. Add Obligations for Audit

```typescript
PolicyBuilder.create('sensitive-access')
  .permit()
  .condition(/* ... */)
  .logObligation({
    level: 'warning',
    reason: 'sensitive_data_access',
    requiresReview: true,
    retentionDays: 90
  })
  .notifyObligation({
    recipients: ['security@company.com'],
    template: 'sensitive-access-alert'
  })
  .build();
```

### 6. Version Your Policies

```typescript
PolicyBuilder.create('data-access')
  .version('2.1.0')
  .metadata({
    createdBy: 'security-team',
    createdAt: new Date('2024-01-01'),
    modifiedBy: 'john.doe',
    modifiedAt: new Date(),
    tags: ['gdpr', 'data-protection', 'v2']
  })
  .build();
```

### 7. Test Edge Cases

```typescript
// Test with missing attributes
const requestNoAttrs = {
  subject: { id: 'user1', attributes: {} },
  resource: { id: 'doc1', type: 'document', attributes: {} },
  action: { id: 'read' }
};

// Test with null values
const requestNullAttrs = {
  subject: { id: 'user1', attributes: { department: null } },
  resource: { id: 'doc1', type: 'document', attributes: { owner: null } },
  action: { id: 'read' }
};

// Test with array attributes
const requestArrayAttrs = {
  subject: { id: 'user1', attributes: { groups: ['eng', 'admin'] } },
  resource: {
    id: 'doc1',
    type: 'document',
    attributes: { allowedGroups: ['eng'] }
  },
  action: { id: 'read' }
};
```

### 8. Use Targets for Performance

```typescript
// Only evaluate this policy for document resources
PolicyBuilder.create('document-policy')
  .permit()
  .target(
    new TargetBuilder()
      .resource(
        ConditionBuilder.equals(AttributeRef.resource('type'), 'document')
      )
      .action(ConditionBuilder.in(AttributeRef.action('id'), ['read', 'write']))
  )
  .condition(/* ... */)
  .build();
```

### 9. Avoid Overly Complex Conditions

```typescript
// ❌ Too complex
const complexPolicy = PolicyBuilder.create('complex')
  .condition(
    ConditionBuilder.and(
      ConditionBuilder.or(/* 10+ conditions */),
      ConditionBuilder.or(/* 10+ conditions */),
      ConditionBuilder.function('custom' /* ... */)
    )
  )
  .build();

// ✅ Split into multiple policies
const simplePolicy1 = PolicyBuilder.create('simple-1')
  .condition(/* focused condition */)
  .build();

const simplePolicy2 = PolicyBuilder.create('simple-2')
  .condition(/* focused condition */)
  .build();
```

### 10. Document Custom Functions

```typescript
/**
 * Checks if the user is a member of the specified project team.
 *
 * @param args[0] - User ID
 * @param args[1] - Project ID
 * @returns true if user is a team member, false otherwise
 *
 * @example
 * ConditionBuilder.function('is_team_member',
 *   AttributeRef.subject('id'),
 *   AttributeRef.resource('projectId')
 * )
 */
engine.registerFunction('is_team_member', async (args, request) => {
  const userId = args[0];
  const projectId = args[1];
  // ... implementation
});
```

---

## Real-World Examples

### Healthcare System

```typescript
const healthcarePolicy = PolicyBuilder.create('patient-record-access')
  .version('1.0.0')
  .description('HIPAA-compliant patient record access')
  .permit()
  .condition(
    // Healthcare provider in same facility
    ConditionBuilder.equals(AttributeRef.subject('role'), 'healthcare_provider')
      .and(
        ConditionBuilder.equals(
          AttributeRef.subject('facilityId'),
          AttributeRef.resource('facilityId')
        )
      )
      // Patient is assigned to provider
      .and(
        ConditionBuilder.function(
          'is_assigned_patient',
          AttributeRef.subject('providerId'),
          AttributeRef.resource('patientId')
        )
      )
      // During working hours or emergency
      .and(
        ConditionBuilder.or(
          ConditionBuilder.function('is_working_hours'),
          ConditionBuilder.equals(AttributeRef.environment('emergency'), true)
        )
      )
  )
  .logObligation({
    level: 'critical',
    reason: 'hipaa_access',
    includePatientId: true,
    retentionYears: 7
  })
  .build();
```

### Financial System

```typescript
const financialPolicy = PolicyBuilder.create('transaction-approval')
  .version('1.0.0')
  .description('Multi-tier transaction approval')
  .permit()
  .condition(
    // Small transactions - any authorized user
    ConditionBuilder.lessThan(AttributeRef.resource('amount'), 1000)
      .and(ConditionBuilder.equals(AttributeRef.subject('authorized'), true))
      .or(
        // Medium transactions - supervisor approval
        ConditionBuilder.and(
          ConditionBuilder.between(
            AttributeRef.resource('amount'),
            1000,
            10000
          ),
          ConditionBuilder.function(
            'has_supervisor_approval',
            AttributeRef.resource('id')
          )
        )
      )
      .or(
        // Large transactions - C-level approval
        ConditionBuilder.and(
          ConditionBuilder.greaterThan(AttributeRef.resource('amount'), 10000),
          ConditionBuilder.function(
            'has_c_level_approval',
            AttributeRef.resource('id')
          ),
          ConditionBuilder.equals(AttributeRef.subject('mfaVerified'), true)
        )
      )
  )
  .logObligation({ level: 'critical', reason: 'financial_transaction' })
  .build();
```

### Multi-Tenant SaaS

```typescript
const tenantIsolationPolicy = PolicyBuilder.create('tenant-isolation')
  .version('1.0.0')
  .description('Enforce strict tenant isolation')
  .deny()
  .priority(1000) // Very high priority
  .condition(
    // Deny if tenant IDs don't match
    ConditionBuilder.notEquals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    )
      // Unless user is system admin
      .and(
        ConditionBuilder.notEquals(AttributeRef.subject('role'), 'system_admin')
      )
  )
  .build();

const tenantAdminPolicy = PolicyBuilder.create('tenant-admin')
  .version('1.0.0')
  .permit()
  .condition(
    ConditionBuilder.equals(AttributeRef.subject('role'), 'tenant_admin').and(
      ConditionBuilder.equals(
        AttributeRef.subject('tenantId'),
        AttributeRef.resource('tenantId')
      )
    )
  )
  .build();
```

### Document Management System

```typescript
const dmsPolicy = PolicyBuilder.create('document-management')
  .version('1.0.0')
  .permit()
  .condition(
    // Public documents - anyone
    ConditionBuilder.equals(AttributeRef.resource('visibility'), 'public')
      .or(
        // Private documents - owner only
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('visibility'),
            'private'
          ),
          ConditionBuilder.equals(
            AttributeRef.subject('id'),
            AttributeRef.resource('owner')
          )
        )
      )
      .or(
        // Shared documents - in share list
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('visibility'),
            'shared'
          ),
          ConditionBuilder.function(
            'is_in_share_list',
            AttributeRef.subject('id'),
            AttributeRef.resource('sharedWith')
          )
        )
      )
      .or(
        // Organization documents - same org
        ConditionBuilder.and(
          ConditionBuilder.equals(
            AttributeRef.resource('visibility'),
            'organization'
          ),
          ConditionBuilder.equals(
            AttributeRef.subject('organizationId'),
            AttributeRef.resource('organizationId')
          )
        )
      )
  )
  .build();
```

---

## Conclusion

Creating effective ABAC policies requires:

1. **Clear Understanding**: Know what you're protecting and who needs access
2. **Proper Structure**: Use appropriate conditions and operators
3. **Testing**: Thoroughly test all scenarios
4. **Documentation**: Document policies and custom functions
5. **Monitoring**: Track policy usage and effectiveness
6. **Iteration**: Refine policies based on real-world usage

For more examples and advanced patterns, see the
[examples directory](./examples/) in the repository.

---

**Need Help?**

- 📖 [Main README](./README.md)
- 🔧 [API Reference](./API.md)
- 💬 [Community Discord](https://discord.gg/abac-engine)
- 🐛 [Report Issues](https://github.com/yourusername/abac-engine/issues)
