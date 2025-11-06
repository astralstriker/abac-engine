# Policy Persistence Guide

This guide covers all the policy persistence features in the ABAC Engine, including saving, loading, exporting, and importing policies.

## Overview

The ABAC Engine provides flexible policy persistence utilities while keeping the Policy Administration Point (PAP) open for your implementation. Policies are plain JSON objects, making them easy to serialize, version control, and integrate with any storage system.

## Core Principles

1. **PAP Agnostic** - You control how policies are stored (files, databases, cloud storage, etc.)
2. **Plain JSON** - Policies are simple JavaScript objects that serialize cleanly
3. **Optional Helpers** - Convenience functions provided, but not required
4. **Validation First** - Always validate before saving to ensure integrity

## Export Functions

### Export to JSON Strings

Convert policies to JSON strings for transmission or storage.

```typescript
import { exportPolicyToJSON, exportPoliciesToJSON } from 'abac-engine';

// Export single policy (pretty-printed by default)
const json = exportPolicyToJSON(policy);
console.log(json);

// Export without formatting (compact)
const compactJson = exportPolicyToJSON(policy, false);

// Export multiple policies
const policiesJson = exportPoliciesToJSON([policy1, policy2, policy3]);
```

**When to use:**
- Sending policies over HTTP/REST APIs
- Storing in NoSQL databases
- Logging policy definitions
- Creating policy templates

## Save Functions

### Save to Files

Write policies directly to the filesystem.

```typescript
import {
  savePolicyToFile,
  savePoliciesToFile,
  saveAndValidatePolicyToFile,
  saveAndValidatePoliciesToFile
} from 'abac-engine';

// Save single policy
await savePolicyToFile(policy, './policies/my-policy.json');

// Save multiple policies
await savePoliciesToFile(policies, './policies/all-policies.json');

// Save with validation (throws ValidationError if invalid)
await saveAndValidatePolicyToFile(policy, './policies/validated.json');
await saveAndValidatePoliciesToFile(policies, './policies/all-validated.json');

// Compact format for production
await savePoliciesToFile(policies, './policies/prod.json', false);
```

**When to use:**
- Configuration-based policy management
- Version control integration
- Backup and disaster recovery
- Policy templates and examples

## Load Functions

### Load from Files

Read policies from JSON files.

```typescript
import {
  loadPoliciesFromFile,
  loadAndValidatePoliciesFromFile
} from 'abac-engine';

// Basic load
const policies = await loadPoliciesFromFile('./policies.json');

// Load with automatic validation
const { policies, validationResults } =
  await loadAndValidatePoliciesFromFile('./policies.json');

if (validationResults.every(r => r.valid)) {
  console.log('All policies are valid!');
}
```

### Load from JSON Strings

Parse policies from JSON strings.

```typescript
import { loadPoliciesFromJSON } from 'abac-engine';

const jsonString = '{"id": "policy-1", "version": "1.0.0", ...}';
const policies = loadPoliciesFromJSON(jsonString);
```

## Common Patterns

### 1. Version Control for Policies

Store policies in version-controlled files for auditability.

```typescript
import { savePoliciesToFile, PolicyBuilder } from 'abac-engine';

// Define policies in code
const policies = [
  PolicyBuilder.create('ownership-policy')
    .permit()
    .condition(/* ... */)
    .build(),
  PolicyBuilder.create('department-policy')
    .permit()
    .condition(/* ... */)
    .build()
];

// Save to version-controlled file
await savePoliciesToFile(policies, './config/policies.json');
// Commit to git for version tracking and review
```

### 2. Hot Reload Policies

Dynamically reload policies when files change.

```typescript
import { loadPoliciesFromFile } from 'abac-engine';
import { watch } from 'fs';

let currentPolicies = [];

async function reloadPolicies() {
  currentPolicies = await loadPoliciesFromFile('./policies.json');
  console.log(`Reloaded ${currentPolicies.length} policies`);
}

// Initial load
await reloadPolicies();

// Watch for changes
watch('./policies.json', async () => {
  await reloadPolicies();
});
```

### 3. Database Integration

#### Export from Database to Files

```typescript
import { savePoliciesToFile } from 'abac-engine';

async function exportPolicies() {
  const policies = await prisma.abacPolicy.findMany();
  await savePoliciesToFile(policies, './backup/policies.json');
  console.log(`Exported ${policies.length} policies`);
}
```

#### Import from Files to Database

```typescript
import { loadAndValidatePoliciesFromFile } from 'abac-engine';

async function importPolicies() {
  const { policies } = await loadAndValidatePoliciesFromFile('./policies.json');

  for (const policy of policies) {
    await prisma.abacPolicy.upsert({
      where: { id: policy.id },
      update: policy,
      create: policy
    });
  }

  console.log(`Imported ${policies.length} policies`);
}
```

### 4. Policy Caching

Cache policies in memory with TTL for performance.

```typescript
import { PolicyCache, loadPoliciesFromFile } from 'abac-engine';

const cache = new PolicyCache(300); // 5 minutes TTL

async function getPolicies() {
  return await cache.get(async () => {
    return await loadPoliciesFromFile('./policies.json');
  });
}

// First call loads from file
const policies1 = await getPolicies();

// Second call uses cache
const policies2 = await getPolicies();

// Invalidate when policies change
cache.invalidate();
```

### 5. Multi-Environment Deployment

Manage different policies per environment.

```typescript
import { loadPoliciesFromFile } from 'abac-engine';

const env = process.env.NODE_ENV || 'development';
const policies = await loadPoliciesFromFile(`./policies/${env}.json`);

// ./policies/development.json
// ./policies/staging.json
// ./policies/production.json
```

### 6. Policy Validation Before Deployment

```typescript
import { validatePolicy, saveAndValidatePolicyToFile } from 'abac-engine';

async function deployPolicy(policy) {
  // Validate before saving
  const result = validatePolicy(policy);

  if (!result.valid) {
    console.error('Policy validation failed:');
    result.errors.forEach(err => {
      console.error(`- ${err.path}: ${err.message}`);
    });
    return;
  }

  // Save with validation (double-check)
  await saveAndValidatePolicyToFile(policy, './deployed-policy.json');
  console.log('Policy validated and deployed successfully');
}
```

## Database Patterns

### With Prisma

```typescript
import { prismaAdapter, validatePolicy } from 'abac-engine';

// Load policies from database
const policies = await prismaAdapter(
  prisma.abacPolicy.findMany({ where: { active: true } })
);

// Save with validation
async function savePolicy(policy) {
  const validation = validatePolicy(policy);
  if (!validation.valid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }
  await prisma.abacPolicy.create({ data: policy });
}
```

### With MongoDB

```typescript
import { exportPolicyToJSON, loadPoliciesFromJSON } from 'abac-engine';

// Save to MongoDB
async function savePolicyToMongo(policy) {
  await db.collection('policies').insertOne(policy);
}

// Load from MongoDB
async function loadPoliciesFromMongo() {
  const docs = await db.collection('policies').find().toArray();
  return docs; // Already in ABACPolicy format
}
```

### With Redis Cache

```typescript
import { exportPoliciesToJSON, loadPoliciesFromJSON } from 'abac-engine';

// Cache in Redis
async function cachePolicies(policies) {
  const json = exportPoliciesToJSON(policies);
  await redis.set('policies', json, 'EX', 300); // 5 min TTL
}

// Load from Redis cache
async function loadCachedPolicies() {
  const json = await redis.get('policies');
  return json ? loadPoliciesFromJSON(json) : null;
}
```

## Best Practices

### 1. Always Validate Before Saving

```typescript
// ✅ Good - validate before saving
await saveAndValidatePolicyToFile(policy, './policy.json');

// ⚠️ Risky - save without validation
await savePolicyToFile(policy, './policy.json');
```

### 2. Use Pretty-Print for Development, Compact for Production

```typescript
// Development - readable formatting
await savePoliciesToFile(policies, './dev-policies.json', true);

// Production - smaller file size
await savePoliciesToFile(policies, './prod-policies.json', false);
```

### 3. Separate Policies by Domain

```typescript
// ✅ Good - organized by domain
await savePoliciesToFile(documentPolicies, './policies/documents.json');
await savePoliciesToFile(userPolicies, './policies/users.json');
await savePoliciesToFile(adminPolicies, './policies/admin.json');

// ❌ Avoid - all policies in one file
await savePoliciesToFile(allPolicies, './policies.json');
```

### 4. Version Your Policies

```typescript
const policy = PolicyBuilder.create('my-policy')
  .version('2.1.0') // Semantic versioning
  .description('Updated to support new feature')
  .metadata({
    createdAt: new Date(),
    createdBy: 'admin',
    changeLog: 'Added support for new resource type'
  })
  .build();
```

### 5. Use Caching in Production

```typescript
const cache = new PolicyCache(300); // Cache for 5 minutes

async function getPolicies() {
  return await cache.get(async () => {
    // Load from database or file
    return await loadPoliciesFromFile('./policies.json');
  });
}
```

### 6. Implement Policy Backup Strategy

```typescript
import { savePoliciesToFile } from 'abac-engine';

async function backupPolicies() {
  const timestamp = new Date().toISOString();
  const policies = await loadPoliciesFromDatabase();

  await savePoliciesToFile(
    policies,
    `./backups/policies-${timestamp}.json`
  );
}

// Run daily backup
setInterval(backupPolicies, 24 * 60 * 60 * 1000);
```

### 7. Add Meaningful Metadata

```typescript
const policy = PolicyBuilder.create('policy-id')
  .description('Clear description of what this policy does')
  .tags('security', 'documents', 'v2')
  .metadata({
    createdBy: 'security-team',
    createdAt: new Date(),
    department: 'engineering',
    reviewedBy: 'compliance-team',
    reviewedAt: new Date()
  })
  .build();
```

## API Reference

### Export Functions

- `exportPolicyToJSON(policy: ABACPolicy, pretty?: boolean): string`
- `exportPoliciesToJSON(policies: ABACPolicy[], pretty?: boolean): string`

### Save Functions

- `savePolicyToFile(policy: ABACPolicy, filePath: string, pretty?: boolean): Promise<void>`
- `savePoliciesToFile(policies: ABACPolicy[], filePath: string, pretty?: boolean): Promise<void>`
- `saveAndValidatePolicyToFile(policy: ABACPolicy, filePath: string, pretty?: boolean): Promise<PolicyValidationResult>`
- `saveAndValidatePoliciesToFile(policies: ABACPolicy[], filePath: string, pretty?: boolean): Promise<PolicyValidationResult[]>`

### Load Functions

- `loadPoliciesFromFile(filePath: string): Promise<ABACPolicy[]>`
- `loadAndValidatePoliciesFromFile(filePath: string): Promise<{ policies: ABACPolicy[], validationResults: PolicyValidationResult[] }>`
- `loadPoliciesFromJSON(json: string): ABACPolicy[]`

### Utility Functions

- `validatePolicy(policy: ABACPolicy): PolicyValidationResult`
- `PolicyCache` - Class for caching policies with TTL
- `prismaAdapter` - Helper for Prisma database integration

## Error Handling

All save/load functions throw descriptive errors:

```typescript
import { PolicyStorageError, ValidationError } from 'abac-engine';

try {
  await saveAndValidatePolicyToFile(policy, './policy.json');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Policy validation failed:', error.validationErrors);
  } else if (error instanceof PolicyStorageError) {
    console.error('Failed to save policy:', error.message);
  }
}
```

## Examples

See the complete working example in [`examples/policy-persistence.ts`](../examples/policy-persistence.ts) demonstrating:

- Creating policies programmatically
- Exporting to JSON strings
- Saving to files with validation
- Loading from files
- Using policy cache
- Integration with ABAC engine
- Best practices in action

## See Also

- [README.md](../README.md) - Main documentation
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Policy Validation](./VALIDATION.md) - Policy validation guide
- [Examples](../examples/) - Working code examples
