/**
 * Simple ABAC Engine Usage Example
 *
 * This example shows how to use the ABAC engine without repositories.
 * You manage policy storage yourself using your preferred method
 * (Prisma, TypeORM, MongoDB, JSON files, etc.)
 *
 * Note: console.log statements in examples are intentional for demonstration.
 * Production code should use the logger interface instead.
 */

import {
  ABACEngine,
  AttributeRef,
  CombiningAlgorithm,
  ConditionBuilder,
  loadPoliciesFromFile,
  PolicyBuilder,
  PolicyCache,
  validatePolicy
} from '../src';

// Example 1: Basic Usage - Load policies from anywhere
async function basicExample() {
  console.log('=== Basic Example ===\n');

  // Create policies using the builder
  const policies = [
    PolicyBuilder.create('document-owner-access')
      .version('1.0.0')
      .permit()
      .description('Document owners can edit their own documents')
      .condition(
        ConditionBuilder.equals(AttributeRef.subject('id'), AttributeRef.resource('ownerId'))
      )
      .build(),

    PolicyBuilder.create('admin-full-access')
      .version('1.0.0')
      .permit()
      .description('Admins have full access')
      .condition(ConditionBuilder.equals(AttributeRef.subject('role'), 'admin'))
      .build()
  ];

  // Validate policies before use
  policies.forEach(policy => {
    const validation = validatePolicy(policy);
    if (!validation.valid) {
      throw new Error(
        `Policy ${policy.id} validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }
  });

  // Create engine
  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides
  });

  // Make authorization decision
  const request = {
    subject: {
      id: 'user-123',
      attributes: { role: 'user' }
    },
    resource: {
      id: 'doc-456',
      type: 'document',
      attributes: { ownerId: 'user-123' }
    },
    action: {
      id: 'edit'
    }
  };

  const decision = await engine.evaluate(request, policies);

  console.log('Decision:', decision.decision);
  console.log('Allowed:', decision.decision === 'Permit');
  console.log(
    'Matched policies:',
    decision.matchedPolicies.map(p => p.id)
  );
  console.log('\n');
}

// Example 2: With Prisma (conceptual)
async function prismaExample() {
  console.log('=== Prisma Example ===\n');

  // Assume you have Prisma client
  // const prisma = new PrismaClient();

  // Load policies from your database
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const policies = [
    // In real code: await prisma.abacPolicy.findMany({ where: { active: true } })
    PolicyBuilder.create('example-policy').version('1.0.0').permit().build()
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides
  });

  // Store in your DB when creating policies
  const newPolicy = PolicyBuilder.create('new-policy')
    .version('1.0.0')
    .permit()
    .condition(ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering'))
    .build();

  // Validate before storing
  const validation = validatePolicy(newPolicy);
  if (!validation.valid) {
    throw new Error('Invalid policy');
  }

  // Store in your database
  // await prisma.abacPolicy.create({ data: newPolicy });

  console.log('Policy stored successfully\n');
}

// Example 3: With JSON files
async function fileExample() {
  console.log('=== File Example ===\n');

  // Load policies from JSON file
  const policies = await loadPoliciesFromFile('./examples/policies.json');

  console.log(`Loaded ${policies.length} policies from file`);

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.PermitOverrides
  });

  const request = {
    subject: { id: 'user-1', attributes: { role: 'viewer' } },
    resource: { id: 'resource-1', type: 'document', attributes: {} },
    action: { id: 'read' }
  };

  const decision = await engine.evaluate(request, policies);
  console.log('File-based decision:', decision.decision);
  console.log('\n');
}

// Example 4: With caching for performance
async function cachingExample() {
  console.log('=== Caching Example ===\n');

  const policyCache = new PolicyCache(300); // 5 minutes TTL

  // Create sample policies instead of loading from file
  const samplePolicies = [
    PolicyBuilder.create('cache-example-policy')
      .version('1.0.0')
      .permit()
      .condition(ConditionBuilder.equals(AttributeRef.subject('role'), 'user'))
      .build()
  ];

  // First call loads policies
  const policies1 = await policyCache.get(async () => {
    console.log('Loading policies from source...');
    return samplePolicies;
  });

  // Second call uses cache
  const policies2 = await policyCache.get(async () => {
    console.log('This should not print - using cache');
    return samplePolicies;
  });

  console.log('First load:', policies1.length, 'policies');
  console.log('Cached load:', policies2.length, 'policies');

  // Invalidate cache when policies change
  policyCache.invalidate();

  console.log('\n');
}

// Example 5: Custom database adapter
async function customDatabaseExample() {
  console.log('=== Custom Database Example ===\n');

  // Your custom database interface
  const customDb = {
    async getPolicies() {
      // Load from Redis, MongoDB, or any other source
      return [
        PolicyBuilder.create('custom-policy')
          .version('1.0.0')
          .permit()
          .condition(ConditionBuilder.equals(AttributeRef.subject('verified'), true))
          .build()
      ];
    },

    async savePolicy(policy: any) {
      // Validate before saving
      const validation = validatePolicy(policy);
      if (!validation.valid) {
        throw new Error('Invalid policy');
      }
      // Save to your database
      console.log('Saved policy:', policy.id);
    }
  };

  const policies = await customDb.getPolicies();
  console.log(`Loaded ${policies.length} policies from custom DB`);

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides
  });

  const request = {
    subject: { id: 'user-1', attributes: { verified: true } },
    resource: { id: 'resource-1', type: 'api', attributes: {} },
    action: { id: 'access' }
  };

  const decision = await engine.evaluate(request, policies);
  console.log('Custom DB decision:', decision.decision);
  console.log('\n');
}

// Example 6: Multi-tenant application
async function multiTenantExample() {
  console.log('=== Multi-tenant Example ===\n');

  // Load tenant-specific policies
  async function getTenantPolicies(tenantId: string) {
    // In real app: load from DB filtered by tenantId
    return [
      PolicyBuilder.create(`${tenantId}-tenant-isolation`)
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(
            AttributeRef.subject('tenantId'),
            AttributeRef.resource('tenantId')
          )
        )
        .build()
    ];
  }

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides
  });

  // Request from tenant A
  const tenantAPolicies = await getTenantPolicies('tenant-a');
  const requestA = {
    subject: { id: 'user-1', attributes: { tenantId: 'tenant-a' } },
    resource: { id: 'doc-1', type: 'document', attributes: { tenantId: 'tenant-a' } },
    action: { id: 'read' }
  };

  const decisionA = await engine.evaluate(requestA, tenantAPolicies);
  console.log('Tenant A decision:', decisionA.decision);

  // Request trying to access another tenant's resource (should deny)
  const requestB = {
    subject: { id: 'user-1', attributes: { tenantId: 'tenant-a' } },
    resource: { id: 'doc-2', type: 'document', attributes: { tenantId: 'tenant-b' } },
    action: { id: 'read' }
  };

  const decisionB = await engine.evaluate(requestB, tenantAPolicies);
  console.log('Cross-tenant decision:', decisionB.decision);
  console.log('\n');
}

// Run all examples
async function main() {
  console.log('ABAC Engine - Simplified Usage Examples');
  console.log('=========================================\n');

  try {
    await basicExample();
    await prismaExample();
    await cachingExample();
    await customDatabaseExample();
    await multiTenantExample();
    // await fileExample(); // Requires actual policies.json file

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  basicExample,
  cachingExample,
  customDatabaseExample,
  fileExample,
  multiTenantExample,
  prismaExample
};
