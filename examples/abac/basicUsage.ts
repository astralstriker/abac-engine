/**
 * Basic ABAC Usage Examples
 *
 * This file demonstrates how to use the true ABAC engine with attribute-based policies
 * instead of role-based policies. These examples show the power of ABAC in making
 * fine-grained access control decisions based on any combination of attributes.
 */

import {
    ABACEngine,
    AttributeRef,
    Attributes,
    ConditionBuilder,
    EnvironmentAttributeProvider,
    InMemoryAttributeProvider,
    InMemoryPolicyRepository,
    PolicyBuilder,
    PolicyPatterns
} from '../../src/abac';

import type {
    ABACPolicy,
    ABACRequest
} from '../../src/abac/types';

async function basicABACExample() {
  console.log('=== Basic ABAC Example ===\n');

  // 1. Create attribute providers
  const subjectProvider = new InMemoryAttributeProvider('subject', 'users', {
    'user123': {
      department: 'Engineering',
      clearanceLevel: 3,
      role: 'Senior Developer',
      employeeType: 'FullTime'
    },
    'user456': {
      department: 'Finance',
      clearanceLevel: 2,
      role: 'Analyst',
      employeeType: 'Contractor'
    }
  });

  const resourceProvider = new InMemoryAttributeProvider('resource', 'documents', {
    'doc001': {
      classification: 2,
      department: 'Engineering',
      owner: 'user123',
      sensitivity: 'internal',
      status: 'published'
    },
    'doc002': {
      classification: 4,
      department: 'Finance',
      owner: 'user456',
      sensitivity: 'confidential',
      status: 'draft'
    }
  });

  const environmentProvider = new EnvironmentAttributeProvider();

  // 2. Create ABAC policies using the builder pattern
  const policies: ABACPolicy[] = [];

  // Policy 1: Users can access documents from their department if classification allows
  policies.push(
    PolicyBuilder.create('department-access')
      .version('1.0.0')
      .description('Department-based document access with clearance check')
      .permit()
      .condition(
        ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department)
          .and(ConditionBuilder.greaterThan(Attributes.subject.clearanceLevel, Attributes.resource.classification))
          .and(ConditionBuilder.equals(Attributes.resource.status, 'published'))
      )
      .logObligation({ reason: 'department_access' })
      .build()
  );

  // Policy 2: Users can always access their own documents
  policies.push(
    PolicyBuilder.create('ownership-access')
      .version('1.0.0')
      .description('Users can access documents they own')
      .permit()
      .condition(
        ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner)
      )
      .priority(100) // Higher priority than department access
      .build()
  );

  // Policy 3: Contractors have restricted access during business hours only
  policies.push(
    PolicyBuilder.create('contractor-restriction')
      .version('1.0.0')
      .description('Contractors can only access during business hours')
      .deny()
      .condition(
        ConditionBuilder.equals(AttributeRef.subject('employeeType'), 'Contractor')
          .and(ConditionBuilder.function('is_outside_business_hours'))
      )
      .priority(200) // High priority to override other permits
      .build()
  );

  // Policy 4: Emergency access overrides all restrictions
  policies.push(
    PolicyBuilder.create('emergency-override')
      .version('1.0.0')
      .description('Emergency mode grants full access')
      .permit()
      .condition(
        ConditionBuilder.function('is_emergency_mode')
      )
      .priority(1000) // Highest priority
      .logObligation({ reason: 'emergency_access' })
      .notifyObligation({ recipients: ['security@company.com'] })
      .build()
  );

  // 3. Create policy repository
  const repository = new InMemoryPolicyRepository(policies);

  // 4. Create ABAC engine with custom functions
  const engine = new ABACEngine({
    combiningAlgorithm: 'deny-overrides',
    attributeProviders: [subjectProvider, resourceProvider, environmentProvider],
    enableAuditLog: true,
    enablePerformanceMetrics: true
  });

  // Register custom condition functions
  engine.registerFunction('is_business_hours', (_args, _request) => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour <= 17; // 9 AM to 5 PM
  });

  engine.registerFunction('is_outside_business_hours', (_args, _request) => {
    const now = new Date();
    const hour = now.getHours();
    return hour < 9 || hour > 17;
  });

  engine.registerFunction('is_emergency_mode', (_args, _request) => {
    // In real implementation, this would check a system flag
    return false; // For demo purposes
  });

  // 5. Test different access scenarios
  const testScenarios = [
    {
      name: 'Engineering user accessing own department document',
      request: {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' },
        environment: { currentTime: new Date() }
      } as ABACRequest
    },
    {
      name: 'Finance user accessing engineering document (should be denied)',
      request: {
        subject: { id: 'user456', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' },
        environment: { currentTime: new Date() }
      } as ABACRequest
    },
    {
      name: 'User accessing their own document',
      request: {
        subject: { id: 'user456', attributes: {} },
        resource: { id: 'doc002', type: 'document', attributes: {} },
        action: { id: 'read' },
        environment: { currentTime: new Date() }
      } as ABACRequest
    },
    {
      name: 'Contractor accessing document outside business hours',
      request: {
        subject: { id: 'user456', attributes: {} },
        resource: { id: 'doc002', type: 'document', attributes: {} },
        action: { id: 'read' },
        environment: { currentTime: new Date(2024, 0, 1, 20, 0) } // 8 PM
      } as ABACRequest
    }
  ];

  // Execute test scenarios
  console.log('Testing ABAC Scenarios:\n');

  for (const scenario of testScenarios) {
    console.log(`Scenario: ${scenario.name}`);

    try {
      const allPolicies = await repository.getAllPolicies();
      const decision = await engine.evaluate(scenario.request, allPolicies);

      console.log(`  Decision: ${decision.decision}`);
      console.log(`  Matched Policies: ${decision.matchedPolicies.map(p => p.id).join(', ')}`);
      console.log(`  Obligations: ${decision.obligations.length}`);

      if (decision.evaluationDetails) {
        console.log(`  Evaluation Time: ${decision.evaluationDetails.evaluationTime}ms`);
      }

      if (decision.obligations.length > 0) {
        console.log(`  Obligations: ${decision.obligations.map(o => o.type).join(', ')}`);
      }

    } catch (error) {
      console.log(`  Error: ${error}`);
    }

    console.log('');
  }

  // 6. Show audit logs
  console.log('Audit Logs:');
  const auditLogs = engine.getAuditLogs(5); // Get last 5 logs
  auditLogs.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log.subject.id} -> ${log.resource.id} (${log.action.id}): ${log.decision}`);
  });

  console.log('\n=== End Basic ABAC Example ===\n');
}

async function advancedABACExample() {
  console.log('=== Advanced ABAC Example ===\n');

  // Create more complex policies using attribute combinations
  const policies: ABACPolicy[] = [];

  // Multi-attribute policy: Time + Location + Clearance + Department
  policies.push(
    PolicyBuilder.create('secure-facility-access')
      .version('1.0.0')
      .description('Secure documents require high clearance, correct location, and business hours')
      .permit()
      .condition(
        ConditionBuilder.equals(Attributes.resource.sensitivity, 'classified')
          .and(ConditionBuilder.greaterThan(Attributes.subject.clearanceLevel, 4))
          .and(ConditionBuilder.equals(AttributeRef.environment('location'), 'secure_facility'))
          .and(ConditionBuilder.function('is_business_hours'))
          .and(ConditionBuilder.in(Attributes.action.id, ['read', 'view']))
      )
      .logObligation({
        reason: 'classified_access',
        location: '${environment.location}',
        time: '${environment.currentTime}'
      })
      .notifyObligation({
        type: 'security_alert',
        message: 'Classified document accessed'
      })
      .build()
  );

  // Dynamic attribute policy with complex logic
  policies.push(
    PolicyBuilder.create('project-team-access')
      .version('1.0.0')
      .description('Project team members can access project resources')
      .permit()
      .condition(
        ConditionBuilder.function('is_project_team_member',
          Attributes.subject.id,
          Attributes.resource.id
        )
        .and(ConditionBuilder.in(Attributes.resource.status, ['active', 'review']))
        .and(ConditionBuilder.function('has_required_training',
          Attributes.subject.id,
          Attributes.resource.type
        ))
      )
      .build()
  );

  // Temporal policy with date ranges
  policies.push(
    PolicyBuilder.create('temporary-access')
      .version('1.0.0')
      .description('Temporary access based on date ranges')
      .permit()
      .condition(
        ConditionBuilder.greaterThan(
          Attributes.environment.currentTime,
          AttributeRef.subject('accessStartDate')
        )
        .and(ConditionBuilder.lessThan(
          Attributes.environment.currentTime,
          AttributeRef.subject('accessEndDate')
        ))
        .and(ConditionBuilder.equals(
          AttributeRef.subject('temporaryRole'),
          'consultant'
        ))
      )
      .warning({ message: 'Temporary access granted' })
      .build()
  );

  // Hierarchical access policy
  policies.push(
    PolicyBuilder.create('hierarchical-access')
      .version('1.0.0')
      .description('Managers can access subordinate resources')
      .permit()
      .condition(
        ConditionBuilder.function('is_manager_of',
          Attributes.subject.id,
          Attributes.resource.owner
        )
        .and(ConditionBuilder.in(Attributes.action.id, ['read', 'review', 'approve']))
      )
      .build()
  );

  // Show policy structure
  console.log('Complex ABAC Policies Created:');
  policies.forEach(policy => {
    console.log(`  - ${policy.id}: ${policy.description}`);
  });

  console.log('\nThese policies demonstrate true ABAC capabilities:');
  console.log('  ✓ No role dependencies - decisions based purely on attributes');
  console.log('  ✓ Complex attribute combinations across all categories');
  console.log('  ✓ Dynamic attribute evaluation with custom functions');
  console.log('  ✓ Temporal and contextual access control');
  console.log('  ✓ Multi-dimensional security policies');

  console.log('\n=== End Advanced ABAC Example ===\n');
}

async function policyPatternExamples() {
  console.log('=== ABAC Policy Patterns ===\n');

  // Use built-in policy patterns
  const ownershipPolicy = PolicyPatterns.ownership(['read', 'update', 'delete']);
  const departmentPolicy = PolicyPatterns.departmentAccess(['read'], ['public', 'internal']);
  const businessHoursPolicy = PolicyPatterns.businessHoursOnly(['create', 'update']);
  const clearancePolicy = PolicyPatterns.clearanceLevel(['read', 'download']);
  const emergencyPolicy = PolicyPatterns.emergencyAccess();

  console.log('Built-in Policy Patterns:');
  console.log(`  1. Ownership Policy: ${ownershipPolicy.description}`);
  console.log(`  2. Department Policy: ${departmentPolicy.description}`);
  console.log(`  3. Business Hours Policy: ${businessHoursPolicy.description}`);
  console.log(`  4. Clearance Policy: ${clearancePolicy.description}`);
  console.log(`  5. Emergency Policy: ${emergencyPolicy.description}`);

  // Create custom pattern
  const customDataClassificationPolicy = PolicyBuilder.create('data-classification')
    .version('1.0.0')
    .description('Multi-level data classification access control')
    .permit()
    .condition(
      // Public data: anyone can read
      ConditionBuilder.equals(Attributes.resource.classification, 'public')
        .and(ConditionBuilder.equals(Attributes.action.id, 'read'))
      .or(
        // Internal data: employees only
        ConditionBuilder.equals(Attributes.resource.classification, 'internal')
          .and(ConditionBuilder.equals(AttributeRef.subject('employeeType'), 'employee'))
          .and(ConditionBuilder.in(Attributes.action.id, ['read', 'download']))
      )
      .or(
        // Confidential data: same department + clearance
        ConditionBuilder.equals(Attributes.resource.classification, 'confidential')
          .and(ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department))
          .and(ConditionBuilder.greaterThan(Attributes.subject.clearanceLevel, 2))
          .and(ConditionBuilder.equals(Attributes.action.id, 'read'))
      )
      .or(
        // Secret data: high clearance + secure location
        ConditionBuilder.equals(Attributes.resource.classification, 'secret')
          .and(ConditionBuilder.greaterThan(Attributes.subject.clearanceLevel, 4))
          .and(ConditionBuilder.equals(AttributeRef.environment('location'), 'secure_facility'))
          .and(ConditionBuilder.equals(Attributes.action.id, 'read'))
      )
    )
    .logObligation({ reason: 'classification_access' })
    .build();

  console.log(`\nCustom Pattern: ${customDataClassificationPolicy.description}`);
  console.log('  - Demonstrates multi-level security with different rules per classification');
  console.log('  - Combines subject, resource, action, and environment attributes');
  console.log('  - Shows the power of complex boolean logic in ABAC');

  console.log('\n=== End Policy Patterns ===\n');
}

// Run all examples
async function runAllExamples() {
  await basicABACExample();
  await advancedABACExample();
  await policyPatternExamples();

  console.log('=== ABAC vs RBAC Comparison ===\n');

  console.log('Traditional RBAC approach:');
  console.log('  - User has roles: ["manager", "engineering"]');
  console.log('  - Policy: "managers can access engineering documents"');
  console.log('  - Decision: Check if user has "manager" role');
  console.log('  - Limitation: Cannot consider time, location, document sensitivity, etc.');

  console.log('\nTrue ABAC approach:');
  console.log('  - User attributes: {department: "engineering", clearance: 3, location: "office"}');
  console.log('  - Resource attributes: {department: "engineering", classification: 2, owner: "user123"}');
  console.log('  - Environment: {time: "business_hours", location: "secure_office"}');
  console.log('  - Policy: Complex conditions using any combination of attributes');
  console.log('  - Decision: Evaluate all relevant attributes dynamically');
  console.log('  - Advantage: Fine-grained, contextual, and flexible access control');

  console.log('\nThis implementation is TRUE ABAC because:');
  console.log('  ✓ Policies are attribute-based, not role-based');
  console.log('  ✓ Any attribute from any category can be used in conditions');
  console.log('  ✓ No dependency on predefined roles');
  console.log('  ✓ Dynamic attribute evaluation with custom functions');
  console.log('  ✓ Contextual decisions based on environment');
  console.log('  ✓ Support for complex boolean logic in policies');
  console.log('  ✓ Proper ABAC architecture (PDP, PIP, PAP, PEP)');
}

// Export for use in other files
export {
    advancedABACExample, basicABACExample, policyPatternExamples, runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
