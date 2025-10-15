# ABAC Engine Examples

Comprehensive examples demonstrating real-world use cases for the ABAC Engine.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Document Management System](#document-management-system)
- [Multi-Tenant SaaS Application](#multi-tenant-saas-application)
- [Healthcare System](#healthcare-system)
- [Financial Services](#financial-services)
- [E-Commerce Platform](#e-commerce-platform)
- [API Gateway](#api-gateway)
- [Time-Based Access Control](#time-based-access-control)
- [Geo-Fencing](#geo-fencing)
- [Dynamic Role-Based Access](#dynamic-role-based-access)
- [Data Classification](#data-classification)
- [Integration Examples](#integration-examples)

---

## Basic Examples

### Simple Department-Based Access

Allow users to access resources in their own department.

```typescript
import { ABACEngine, PolicyBuilder, ConditionBuilder, AttributeRef } from 'abac-engine';

// Create policy
const policy = PolicyBuilder.create('department-access')
  .permit()
  .description('Users can access resources in their department')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('department'),
      AttributeRef.resource('department')
    )
  )
  .build();

// Create engine
const engine = new ABACEngine({ policies: [policy] });

// Evaluate request
const decision = await engine.evaluate({
  subject: {
    id: 'user-123',
    attributes: { department: 'Engineering' }
  },
  resource: {
    id: 'doc-456',
    attributes: { department: 'Engineering' }
  },
  action: { id: 'read' }
});

console.log(decision.decision); // 'Permit'
```

---

### Owner-Based Access

Allow users to access their own resources.

```typescript
const ownerPolicy = PolicyBuilder.create('owner-access')
  .permit()
  .description('Users can access their own resources')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('owner')
    )
  )
  .build();
```

---

### Clearance Level

Access based on security clearance levels.

```typescript
const clearancePolicy = PolicyBuilder.create('clearance-level')
  .permit()
  .description('Users can access resources at or below their clearance level')
  .condition(
    ConditionBuilder.greaterThanOrEqual(
      AttributeRef.subject('clearanceLevel'),
      AttributeRef.resource('classification')
    )
  )
  .build();
```

---

## Document Management System

Complete document management with fine-grained access control.

### Policies

```typescript
import { PolicyBuilder, ConditionBuilder, AttributeRef } from 'abac-engine';

// 1. Owner can do anything with their documents
const ownerPolicy = PolicyBuilder.create('document-owner-full-access')
  .permit()
  .description('Document owners have full access')
  .target({
    resource: { type: 'document' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('owner')
    )
  )
  .build();

// 2. Same department can read
const departmentReadPolicy = PolicyBuilder.create('department-read-access')
  .permit()
  .description('Users can read documents in their department')
  .target({
    resource: { type: 'document' },
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('department'),
      AttributeRef.resource('department')
    )
  )
  .build();

// 3. Editors can modify
const editorPolicy = PolicyBuilder.create('editor-modify-access')
  .permit()
  .description('Editors can modify documents')
  .target({
    resource: { type: 'document' },
    action: { id: 'update' }
  })
  .condition(
    ConditionBuilder.contains(
      AttributeRef.subject('roles'),
      'editor'
    )
  )
  .build();

// 4. Prevent access to archived documents
const archivedPolicy = PolicyBuilder.create('deny-archived')
  .deny()
  .description('Archived documents cannot be modified')
  .target({
    resource: { type: 'document' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('status'),
      'archived'
    ).and(
      ConditionBuilder.in(
        AttributeRef.action('id'),
        ['update', 'delete']
      )
    )
  )
  .build();

// 5. Confidential documents require high clearance
const confidentialPolicy = PolicyBuilder.create('confidential-access')
  .permit()
  .description('Confidential documents require clearance level 3+')
  .target({
    resource: { type: 'document' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('classification'),
      'confidential'
    ).and(
      ConditionBuilder.greaterThanOrEqual(
        AttributeRef.subject('clearanceLevel'),
        3
      )
    )
  )
  .obligation('log-access', {
    level: 'warning',
    message: 'Confidential document accessed'
  })
  .build();

const policies = [
  archivedPolicy,      // Deny first (deny-overrides)
  ownerPolicy,
  departmentReadPolicy,
  editorPolicy,
  confidentialPolicy
];
```

### Usage

```typescript
import { ABACEngine, CombiningAlgorithm, ConsoleLogger } from 'abac-engine';

const engine = new ABACEngine({
  policies,
  enableAuditLog: true,
  logger: new ConsoleLogger()
});

// Example 1: Owner accessing their document
const decision1 = await engine.evaluate({
  subject: {
    id: 'user-123',
    attributes: {
      department: 'Engineering',
      roles: ['developer'],
      clearanceLevel: 2
    }
  },
  resource: {
    id: 'doc-456',
    type: 'document',
    attributes: {
      owner: 'user-123',
      department: 'Engineering',
      status: 'active',
      classification: 'internal'
    }
  },
  action: { id: 'update' }
});
// Result: Permit (owner can do anything)

// Example 2: Colleague reading department document
const decision2 = await engine.evaluate({
  subject: {
    id: 'user-789',
    attributes: {
      department: 'Engineering',
      roles: ['developer'],
      clearanceLevel: 2
    }
  },
  resource: {
    id: 'doc-456',
    type: 'document',
    attributes: {
      owner: 'user-123',
      department: 'Engineering',
      status: 'active',
      classification: 'internal'
    }
  },
  action: { id: 'read' }
});
// Result: Permit (same department can read)

// Example 3: Trying to modify archived document
const decision3 = await engine.evaluate({
  subject: {
    id: 'user-123',
    attributes: { /* ... */ }
  },
  resource: {
    id: 'doc-456',
    type: 'document',
    attributes: {
      owner: 'user-123',
      status: 'archived'
    }
  },
  action: { id: 'update' }
});
// Result: Deny (archived documents can't be modified)
```

---

## Multi-Tenant SaaS Application

Ensure complete data isolation between tenants.

### Tenant Isolation Policy

```typescript
const tenantIsolationPolicy = PolicyBuilder.create('tenant-isolation')
  .permit()
  .description('Users can only access resources in their tenant')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    )
  )
  .build();
```

### Role-Based Access Within Tenant

```typescript
// Admin can manage users
const tenantAdminPolicy = PolicyBuilder.create('tenant-admin')
  .permit()
  .description('Tenant admins can manage users')
  .target({
    resource: { type: 'user' },
    action: { id: 'manage' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    ).and(
      ConditionBuilder.contains(
        AttributeRef.subject('roles'),
        'tenant-admin'
      )
    )
  )
  .build();

// Users can view their own profile
const profileAccessPolicy = PolicyBuilder.create('profile-access')
  .permit()
  .description('Users can access their own profile')
  .target({
    resource: { type: 'user' },
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('id'),
      AttributeRef.resource('id')
    )
  )
  .build();

// Billing access for tenant owners
const billingPolicy = PolicyBuilder.create('billing-access')
  .permit()
  .description('Tenant owners can access billing')
  .target({
    resource: { type: 'billing' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('tenantId'),
      AttributeRef.resource('tenantId')
    ).and(
      ConditionBuilder.equals(
        AttributeRef.subject('role'),
        'owner'
      )
    )
  )
  .build();
```

### Complete Multi-Tenant Example

```typescript
const policies = [
  tenantIsolationPolicy,
  tenantAdminPolicy,
  profileAccessPolicy,
  billingPolicy
];

const engine = new ABACEngine({ policies });

// Request from user in Tenant A
const decision = await engine.evaluate({
  subject: {
    id: 'user-123',
    attributes: {
      tenantId: 'tenant-a',
      roles: ['member']
    }
  },
  resource: {
    id: 'doc-456',
    type: 'document',
    attributes: {
      tenantId: 'tenant-b' // Different tenant!
    }
  },
  action: { id: 'read' }
});
// Result: Deny or NotApplicable (tenant isolation)
```

---

## Healthcare System

HIPAA-compliant access control for medical records.

### Policies

```typescript
// 1. Doctors can access their patients' records
const doctorPatientPolicy = PolicyBuilder.create('doctor-patient-access')
  .permit()
  .description('Doctors can access their patients records')
  .target({
    resource: { type: 'medical-record' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('role'),
      'doctor'
    ).and(
      ConditionBuilder.contains(
        AttributeRef.subject('assignedPatients'),
        AttributeRef.resource('patientId')
      )
    )
  )
  .obligation('log-access', {
    level: 'info',
    reason: 'HIPAA audit trail'
  })
  .build();

// 2. Patients can access their own records
const patientSelfAccessPolicy = PolicyBuilder.create('patient-self-access')
  .permit()
  .description('Patients can view their own medical records')
  .target({
    resource: { type: 'medical-record' },
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('patientId'),
      AttributeRef.resource('patientId')
    )
  )
  .build();

// 3. Emergency access (break-glass)
const emergencyAccessPolicy = PolicyBuilder.create('emergency-access')
  .permit()
  .description('Emergency personnel can access records during emergencies')
  .target({
    resource: { type: 'medical-record' }
  })
  .condition(
    ConditionBuilder.contains(
      AttributeRef.subject('roles'),
      'emergency-staff'
    ).and(
      ConditionBuilder.equals(
        AttributeRef.environment('emergencyMode'),
        true
      )
    )
  )
  .obligation('notify-patient', {
    message: 'Your record was accessed during an emergency'
  })
  .obligation('log-emergency-access', {
    level: 'critical'
  })
  .build();

// 4. Nurses can read but not modify
const nurseReadPolicy = PolicyBuilder.create('nurse-read-access')
  .permit()
  .description('Nurses can read assigned patient records')
  .target({
    resource: { type: 'medical-record' },
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('role'),
      'nurse'
    ).and(
      ConditionBuilder.contains(
        AttributeRef.subject('assignedPatients'),
        AttributeRef.resource('patientId')
      )
    )
  )
  .build();

// 5. Prevent access to records of minors without guardian consent
const minorConsentPolicy = PolicyBuilder.create('minor-consent')
  .deny()
  .description('Minors records require guardian consent')
  .target({
    resource: { type: 'medical-record' }
  })
  .condition(
    ConditionBuilder.lessThan(
      AttributeRef.resource('patientAge'),
      18
    ).and(
      ConditionBuilder.notExists(
        AttributeRef.resource('guardianConsent')
      )
    ).and(
      ConditionBuilder.notEquals(
        AttributeRef.subject('patientId'),
        AttributeRef.resource('patientId')
      )
    )
  )
  .build();
```

---

## Financial Services

Banking and financial data access control.

### Account Access

```typescript
// Account owner access
const accountOwnerPolicy = PolicyBuilder.create('account-owner')
  .permit()
  .description('Account owners can access their accounts')
  .target({
    resource: { type: 'account' }
  })
  .condition(
    ConditionBuilder.contains(
      AttributeRef.resource('owners'),
      AttributeRef.subject('userId')
    )
  )
  .build();

// Joint account access
const jointAccountPolicy = PolicyBuilder.create('joint-account')
  .permit()
  .description('Joint account holders can access the account')
  .target({
    resource: { type: 'account' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('accountType'),
      'joint'
    ).and(
      ConditionBuilder.contains(
        AttributeRef.resource('authorizedUsers'),
        AttributeRef.subject('userId')
      )
    )
  )
  .build();

// Large transaction approval
const largeTransactionPolicy = PolicyBuilder.create('large-transaction')
  .deny()
  .description('Large transactions require additional approval')
  .target({
    action: { id: 'transfer' }
  })
  .condition(
    ConditionBuilder.greaterThan(
      AttributeRef.action('amount'),
      10000
    ).and(
      ConditionBuilder.notExists(
        AttributeRef.action('approvalCode')
      )
    )
  )
  .advice('require-approval', {
    message: 'Transactions over $10,000 require manager approval'
  })
  .build();

// Business hours restriction for certain operations
const businessHoursPolicy = PolicyBuilder.create('business-hours')
  .deny()
  .description('Wire transfers only during business hours')
  .target({
    action: { id: 'wire-transfer' }
  })
  .condition(
    ConditionBuilder.function(
      'isBusinessHours',
      AttributeRef.environment('currentTime')
    ).not()
  )
  .build();

// Register custom function
engine.registerFunction('isBusinessHours', (time: Date) => {
  const hour = time.getHours();
  const day = time.getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
});
```

---

## E-Commerce Platform

Product and order management.

### Product Access

```typescript
// Public products
const publicProductPolicy = PolicyBuilder.create('public-products')
  .permit()
  .description('Anyone can view public products')
  .target({
    resource: { type: 'product' },
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('visibility'),
      'public'
    )
  )
  .build();

// Vendor can manage their products
const vendorProductPolicy = PolicyBuilder.create('vendor-products')
  .permit()
  .description('Vendors can manage their own products')
  .target({
    resource: { type: 'product' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('vendorId'),
      AttributeRef.resource('vendorId')
    )
  )
  .build();

// Order access
const orderAccessPolicy = PolicyBuilder.create('order-access')
  .permit()
  .description('Users can access their own orders')
  .target({
    resource: { type: 'order' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.subject('userId'),
      AttributeRef.resource('customerId')
    ).or(
      ConditionBuilder.equals(
        AttributeRef.subject('vendorId'),
        AttributeRef.resource('vendorId')
      )
    )
  )
  .build();

// Refund policy
const refundPolicy = PolicyBuilder.create('refund-policy')
  .permit()
  .description('Refunds allowed within 30 days for eligible orders')
  .target({
    resource: { type: 'order' },
    action: { id: 'refund' }
  })
  .condition(
    ConditionBuilder.function(
      'withinDays',
      AttributeRef.resource('orderDate'),
      30
    ).and(
      ConditionBuilder.in(
        AttributeRef.resource('status'),
        ['delivered', 'completed']
      )
    )
  )
  .build();

engine.registerFunction('withinDays', (orderDate: Date, days: number) => {
  const diffTime = Date.now() - orderDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
});
```

---

## API Gateway

Rate limiting and API access control.

```typescript
// API key validation
const apiKeyPolicy = PolicyBuilder.create('api-key-required')
  .deny()
  .description('API key is required')
  .condition(
    ConditionBuilder.notExists(
      AttributeRef.subject('apiKey')
    )
  )
  .build();

// Rate limiting by tier
const rateLimitPolicy = PolicyBuilder.create('rate-limit')
  .deny()
  .description('Rate limit exceeded')
  .condition(
    ConditionBuilder.function(
      'exceedsRateLimit',
      AttributeRef.subject('apiKey'),
      AttributeRef.subject('tier'),
      AttributeRef.environment('requestCount')
    )
  )
  .advice('upgrade-tier', {
    message: 'Upgrade to Premium for higher rate limits'
  })
  .build();

// Endpoint access by subscription
const endpointAccessPolicy = PolicyBuilder.create('endpoint-access')
  .permit()
  .description('Premium endpoints require premium subscription')
  .target({
    resource: { tier: 'premium' }
  })
  .condition(
    ConditionBuilder.in(
      AttributeRef.subject('subscription'),
      ['premium', 'enterprise']
    )
  )
  .build();

// Register rate limit function
engine.registerFunction('exceedsRateLimit', (
  apiKey: string,
  tier: string,
  requestCount: number
) => {
  const limits = {
    free: 100,
    basic: 1000,
    premium: 10000,
    enterprise: 100000
  };
  return requestCount > (limits[tier] || 0);
});
```

---

## Time-Based Access Control

Access control based on time and schedule.

```typescript
// Business hours only
const businessHoursPolicy = PolicyBuilder.create('business-hours')
  .permit()
  .description('Access allowed during business hours')
  .condition(
    ConditionBuilder.function(
      'isBusinessHours',
      AttributeRef.environment('currentTime')
    )
  )
  .build();

// Weekend access for on-call staff
const weekendAccessPolicy = PolicyBuilder.create('weekend-access')
  .permit()
  .description('On-call staff can access systems on weekends')
  .condition(
    ConditionBuilder.function(
      'isWeekend',
      AttributeRef.environment('currentTime')
    ).and(
      ConditionBuilder.contains(
        AttributeRef.subject('roles'),
        'on-call'
      )
    )
  )
  .build();

// Time-bound access (temporary access)
const temporaryAccessPolicy = PolicyBuilder.create('temporary-access')
  .permit()
  .description('Temporary access within validity period')
  .condition(
    ConditionBuilder.function(
      'isWithinPeriod',
      AttributeRef.environment('currentTime'),
      AttributeRef.subject('accessStartDate'),
      AttributeRef.subject('accessEndDate')
    )
  )
  .build();

// Register time functions
engine.registerFunction('isBusinessHours', (time: Date) => {
  const hour = time.getHours();
  const day = time.getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
});

engine.registerFunction('isWeekend', (time: Date) => {
  const day = time.getDay();
  return day === 0 || day === 6;
});

engine.registerFunction('isWithinPeriod', (
  current: Date,
  start: Date,
  end: Date
) => {
  return current >= start && current <= end;
});
```

---

## Geo-Fencing

Location-based access control.

```typescript
// IP-based country restriction
const countryRestrictionPolicy = PolicyBuilder.create('country-restriction')
  .deny()
  .description('Access denied from restricted countries')
  .condition(
    ConditionBuilder.in(
      AttributeRef.environment('country'),
      ['XX', 'YY', 'ZZ'] // Restricted country codes
    )
  )
  .build();

// Office location access
const officeAccessPolicy = PolicyBuilder.create('office-access')
  .permit()
  .description('Access from office locations')
  .condition(
    ConditionBuilder.function(
      'isOfficeIP',
      AttributeRef.environment('ipAddress')
    )
  )
  .build();

// Geo-proximity for sensitive operations
const geoProximityPolicy = PolicyBuilder.create('geo-proximity')
  .permit()
  .description('Sensitive operations require physical proximity')
  .target({
    resource: { sensitivity: 'high' }
  })
  .condition(
    ConditionBuilder.function(
      'isNearResource',
      AttributeRef.environment('userLocation'),
      AttributeRef.resource('location'),
      5000 // meters
    )
  )
  .build();

// Register geo functions
engine.registerFunction('isOfficeIP', (ip: string) => {
  const officeRanges = ['192.168.1.0/24', '10.0.0.0/8'];
  // IP range checking logic
  return true; // Simplified
});

engine.registerFunction('isNearResource', (
  userLoc: { lat: number; lng: number },
  resourceLoc: { lat: number; lng: number },
  maxDistance: number
) => {
  // Haversine distance calculation
  const distance = calculateDistance(userLoc, resourceLoc);
  return distance <= maxDistance;
});
```

---

## Dynamic Role-Based Access

ABAC implementing dynamic RBAC.

```typescript
// Admin role
const adminPolicy = PolicyBuilder.create('admin-access')
  .permit()
  .description('Admins have full access')
  .condition(
    ConditionBuilder.contains(
      AttributeRef.subject('roles'),
      'admin'
    )
  )
  .build();

// Manager can access team resources
const managerPolicy = PolicyBuilder.create('manager-access')
  .permit()
  .description('Managers can access team resources')
  .condition(
    ConditionBuilder.contains(
      AttributeRef.subject('roles'),
      'manager'
    ).and(
      ConditionBuilder.contains(
        AttributeRef.subject('managedTeams'),
        AttributeRef.resource('teamId')
      )
    )
  )
  .build();

// Developer access to projects
const developerPolicy = PolicyBuilder.create('developer-access')
  .permit()
  .description('Developers can access assigned projects')
  .target({
    resource: { type: 'project' }
  })
  .condition(
    ConditionBuilder.contains(
      AttributeRef.subject('roles'),
      'developer'
    ).and(
      ConditionBuilder.contains(
        AttributeRef.resource('assignedDevelopers'),
        AttributeRef.subject('id')
      )
    )
  )
  .build();
```

---

## Data Classification

Access based on data sensitivity.

```typescript
// Public data
const publicDataPolicy = PolicyBuilder.create('public-data')
  .permit()
  .description('Anyone can read public data')
  .target({
    action: { id: 'read' }
  })
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('classification'),
      'public'
    )
  )
  .build();

// Internal data
const internalDataPolicy = PolicyBuilder.create('internal-data')
  .permit()
  .description('Employees can access internal data')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('classification'),
      'internal'
    ).and(
      ConditionBuilder.equals(
        AttributeRef.subject('employeeStatus'),
        'active'
      )
    )
  )
  .build();

// Confidential data
const confidentialDataPolicy = PolicyBuilder.create('confidential-data')
  .permit()
  .description('Confidential data requires clearance')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('classification'),
      'confidential'
    ).and(
      ConditionBuilder.greaterThanOrEqual(
        AttributeRef.subject('clearanceLevel'),
        3
      )
    )
  )
  .obligation('log-confidential-access', {
    level: 'warning'
  })
  .build();

// Secret data
const secretDataPolicy = PolicyBuilder.create('secret-data')
  .permit()
  .description('Secret data requires highest clearance and MFA')
  .condition(
    ConditionBuilder.equals(
      AttributeRef.resource('classification'),
      'secret'
    ).and(
      ConditionBuilder.equals(
        AttributeRef.subject('clearanceLevel'),
        5
      )
    ).and(
      ConditionBuilder.equals(
        AttributeRef.subject('mfaVerified'),
        true
      )
    )
  )
  .obligation('log-secret-access', {
    level: 'critical'
  })
  .obligation('notify-security', {
    message: 'Secret data accessed'
  })
  .build();
```

---

## Integration Examples

### Express.js Middleware

```typescript
import { ABACEngine, Decision } from 'abac-engine';
import { Request, Response, NextFunction } from 'express';

function createABACMiddleware(engine: ABACEngine, policies: ABACPolicy[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Build ABAC request from Express request
    const abacRequest = {
      subject: {
        id: req.user?.id || 'anonymous',
        attributes: {
          roles: req.user?.roles || [],
          department: req.user?.department,
          ...req.user
        }
      },
      resource: {
        id: req.params.id || req.path,
        type: req.params.resourceType,
        attributes: {
          // Fetch from database if needed
        }
      },
      action: {
        id: req.method.toLowerCase()
      },
      environment: {
        currentTime: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    };

    // Evaluate
    const decision = await engine.evaluate(abacRequest, policies);

    if (decision.decision === Decision.Permit) {
      // Fulfill obligations
      for (const obligation of decision.obligations) {
        await fulfillObligation(obligation);
      }
      next();
    } else {
      res.status(403).json({
        error: 'Access denied',
        reason: decision.evaluationDetails?.errors
      });
    }
  };
}

// Usage
app.get('/documents/:id', createABACMiddleware(engine, policies), (req, res) => {
  res.json({ document: 'content' });
});
```

---

### NestJS Guard

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ABACEngine, Decision } from 'abac-engine';

@Injectable()
export class ABACGuard implements CanActivate {
  constructor(private abacEngine: ABACEngine) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const abacRequest = {
      subject: {
        id: request.user.id,
        attributes: request.user
      },
      resource: {
        id: request.params.id,
        type: context.getClass().name,
        attributes: {}
      },
      action: {
        id: request.method.toLowerCase()
      },
      environment: {
        currentTime: new Date(),
        ipAddress: request.ip
      }
    };

    const policies = await this.loadPolicies();
    const decision = await this.abacEngine.evaluate(abacRequest, policies);

    return decision.decision === Decision.Permit;
  }

  private async loadPolicies() {
    // Load from database
    return [];
  }
}

// Usage
@Controller('documents')
export class DocumentsController {
  @Get(':id')
  @UseGuards(ABACGuard)
  async getDocument(@Param('id') id: string) {
    return { id, content: 'document' };
  }
}
```

---

### Database Integration (Prisma)

```typescript
import { PrismaClient } from '@prisma/client';
import { ABACEngine, ABACPolicy } from 'abac-engine';

const prisma = new PrismaClient();

// Load policies from database
async function loadPolicies(): Promise<ABACPolicy[]> {
  const policies = await prisma.abacPolicy.findMany({
    where: { active: true }
  });

  return policies.map(p => ({
    id: p.id,
    version: p.version,
    effect: p.effect,
    description: p.description,
    condition: JSON.parse(p.condition),
    target: p.target ? JSON.parse(p.target) : undefined,
    obligations: p.obligations ? JSON.parse(p.obligations) : undefined,
    advice: p.advice ? JSON.parse(p.advice) : undefined
  }));
}

// Save policy to database
async function savePolicy(policy: ABACPolicy) {
  await prisma.abacPolicy.create({
    data: {
      id: policy.id,
      version: policy.version,
      effect: policy.effect,
      description: policy.description,
      condition: JSON.stringify(policy.condition),
      target: policy.target ? JSON.stringify(policy.target) : null,
      obligations: policy.obligations ? JSON.stringify(policy.obligations) : null,
      advice: policy.advice ? JSON.stringify(policy.advice) : null,
      active: true
    }
  });
}
```

---

## Best Practices

1. **Start Simple**: Begin with basic policies and add complexity as needed
2. **Use Deny Overrides**: For security-critical applications
3. **Test Thoroughly**: Write tests for all policy scenarios
4. **Log Everything**: Enable audit logs for compliance
5. **Cache Wisely**: Use caching for performance but invalidate when policies change
6. **Validate Policies**: Always validate policies before deployment
7. **Use Attribute Providers**: Fetch attributes dynamically for flexibility
8. **Document Policies**: Add clear descriptions to all policies
9. **Monitor Performance**: Track evaluation metrics
10. **Regular Reviews**: Audit policies regularly for correctness

---

For more information, see:
- [API Reference](./API_REFERENCE.md)
- [Policy Guide](./POLICY_GUIDE.md)
- [Error Handling](./ERROR_HANDLING.md)
- [Glossary](./GLOSSARY.md)
