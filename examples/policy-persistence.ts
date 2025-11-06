/**
 * Policy Persistence Example
 *
 * This example demonstrates how to save, load, export, and import policies
 * using the ABAC engine's persistence utilities.
 */

import {
  ABACEngine,
  Attributes,
  CombiningAlgorithm,
  ConditionBuilder,
  exportPoliciesToJSON,
  exportPolicyToJSON,
  loadAndValidatePoliciesFromFile,
  loadPoliciesFromFile,
  loadPoliciesFromJSON,
  PolicyBuilder,
  PolicyCache,
  PolicyPatterns,
  saveAndValidatePolicyToFile,
  savePoliciesToFile,
  savePolicyToFile,
  validatePolicy
} from '../src';

async function main() {
  console.log('=== Policy Persistence Examples ===\n');

  // ========================================
  // 1. Creating Policies Programmatically
  // ========================================
  console.log('1. Creating policies...');

  const ownershipPolicy = PolicyBuilder.create('ownership-policy')
    .version('1.0.0')
    .description('Users can only access resources they own')
    .permit()
    .condition(ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner))
    .priority(100)
    .logObligation({ reason: 'ownership_access' })
    .tags('ownership', 'basic')
    .build();

  const departmentPolicy = PolicyBuilder.create('department-policy')
    .version('1.0.0')
    .description('Users can access department resources')
    .permit()
    .condition(
      ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department).and(
        ConditionBuilder.in(Attributes.resource.sensitivity, ['public', 'internal'])
      )
    )
    .priority(50)
    .build();

  const adminPolicy = PolicyBuilder.create('admin-override-policy')
    .version('1.0.0')
    .description('Admins have full access')
    .permit()
    .condition(ConditionBuilder.in(Attributes.subject.roles, ['admin']))
    .priority(200)
    .build();

  console.log('✓ Created 3 policies\n');

  // ========================================
  // 2. Exporting Policies to JSON Strings
  // ========================================
  console.log('2. Exporting policies to JSON strings...');

  const singlePolicyJson = exportPolicyToJSON(ownershipPolicy, true);
  console.log('✓ Exported single policy (pretty-printed):');
  console.log(singlePolicyJson.substring(0, 200) + '...\n');

  const compactJson = exportPolicyToJSON(ownershipPolicy, false);
  console.log(`✓ Exported single policy (compact): ${compactJson.length} characters\n`);

  const multiplePoliciesJson = exportPoliciesToJSON(
    [ownershipPolicy, departmentPolicy, adminPolicy],
    true
  );
  console.log(
    `✓ Exported multiple policies: ${JSON.parse(multiplePoliciesJson).length} policies\n`
  );

  // ========================================
  // 3. Saving Policies to Files
  // ========================================
  console.log('3. Saving policies to files...');

  // Save single policy
  await savePolicyToFile(ownershipPolicy, './examples/abac/ownership-policy.json');
  console.log('✓ Saved ownership policy to file');

  // Save multiple policies
  await savePoliciesToFile(
    [ownershipPolicy, departmentPolicy, adminPolicy],
    './examples/abac/all-policies.json'
  );
  console.log('✓ Saved all policies to file');

  // Save with validation
  await saveAndValidatePolicyToFile(ownershipPolicy, './examples/abac/validated-ownership.json');
  console.log('✓ Saved ownership policy with validation\n');

  // ========================================
  // 4. Loading Policies from Files
  // ========================================
  console.log('4. Loading policies from files...');

  const loadedPolicies = await loadPoliciesFromFile('./examples/abac/all-policies.json');
  console.log(`✓ Loaded ${loadedPolicies.length} policies from file`);
  console.log(`  Policy IDs: ${loadedPolicies.map(p => p.id).join(', ')}\n`);

  // Load with validation
  const { policies: validatedPolicies, validationResults } = await loadAndValidatePoliciesFromFile(
    './examples/abac/all-policies.json'
  );
  console.log(`✓ Loaded and validated ${validatedPolicies.length} policies`);
  console.log(`  All valid: ${validationResults.every(r => r.valid)}\n`);

  // ========================================
  // 5. Working with JSON Strings
  // ========================================
  console.log('5. Working with JSON strings...');

  const jsonString = exportPoliciesToJSON([ownershipPolicy, departmentPolicy]);
  const parsedPolicies = loadPoliciesFromJSON(jsonString);
  console.log(`✓ Exported to JSON and parsed back: ${parsedPolicies.length} policies\n`);

  // ========================================
  // 6. Policy Validation Before Saving
  // ========================================
  console.log('6. Validating policies before saving...');

  const validationResult = validatePolicy(ownershipPolicy);
  if (validationResult.valid) {
    console.log('✓ Policy is valid');
  } else {
    console.log('✗ Policy has errors:', validationResult.errors);
  }

  // Try to save invalid policy (this would throw)
  try {
    const invalidPolicy = {
      id: 'invalid',
      version: '1.0.0'
      // Missing required 'effect' field
    } as any;

    await saveAndValidatePolicyToFile(invalidPolicy, './examples/abac/invalid.json');
  } catch (error: any) {
    console.log('✓ Correctly rejected invalid policy:', error.message.split('\n')[0]);
  }
  console.log();

  // ========================================
  // 7. Using Policy Cache
  // ========================================
  console.log('7. Using policy cache...');

  const cache = new PolicyCache(60); // 60 seconds TTL

  // First load - will read from file
  const cachedPolicies1 = await cache.get(async () => {
    console.log('  → Loading policies from file...');
    return await loadPoliciesFromFile('./examples/abac/all-policies.json');
  });
  console.log(`✓ First load: ${cachedPolicies1.length} policies`);

  // Second load - will use cache
  const cachedPolicies2 = await cache.get(async () => {
    console.log('  → This should not print (using cache)');
    return await loadPoliciesFromFile('./examples/abac/all-policies.json');
  });
  console.log(`✓ Second load (from cache): ${cachedPolicies2.length} policies`);

  // Invalidate cache
  cache.invalidate();
  console.log('✓ Cache invalidated');

  // Third load - will read from file again
  const cachedPolicies3 = await cache.get(async () => {
    console.log('  → Loading policies from file after cache invalidation...');
    return await loadPoliciesFromFile('./examples/abac/all-policies.json');
  });
  console.log(`✓ Third load (after invalidation): ${cachedPolicies3.length} policies\n`);

  // ========================================
  // 8. Using Policies with ABAC Engine
  // ========================================
  console.log('8. Using loaded policies with ABAC engine...');

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    enableAuditLog: true
  });

  const request = {
    subject: {
      id: 'user123',
      attributes: {
        department: 'engineering',
        roles: ['developer']
      }
    },
    resource: {
      id: 'doc456',
      type: 'document',
      attributes: {
        owner: 'user123',
        department: 'engineering',
        sensitivity: 'internal'
      }
    },
    action: {
      id: 'read'
    }
  };

  const decision = await engine.evaluate(request, loadedPolicies);
  console.log(`✓ Access decision: ${decision.decision}`);
  console.log(`✓ Matched policies: ${decision.matchedPolicies.map(p => p.id).join(', ')}\n`);

  // ========================================
  // 9. Policy Patterns for Quick Start
  // ========================================
  console.log('9. Using pre-built policy patterns...');

  const patternPolicies = [
    PolicyPatterns.ownership(['read', 'update', 'delete']),
    PolicyPatterns.departmentAccess(['read'], ['public', 'internal']),
    PolicyPatterns.clearanceLevel(['read', 'update'])
  ];

  await savePoliciesToFile(patternPolicies, './examples/abac/pattern-policies.json');
  console.log(`✓ Saved ${patternPolicies.length} pattern-based policies\n`);

  // ========================================
  // 10. Best Practices Summary
  // ========================================
  console.log('=== Best Practices ===');
  console.log('1. Always validate policies before saving');
  console.log('2. Use version control for policy files');
  console.log('3. Use caching for production environments');
  console.log('4. Keep policies in separate files by domain/feature');
  console.log('5. Use pretty-printing for development, compact for production');
  console.log('6. Regularly backup policy files');
  console.log('7. Use loadAndValidatePoliciesFromFile for runtime loading');
  console.log('8. Add meaningful descriptions and tags to policies\n');

  console.log('=== Example Complete ===');
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
