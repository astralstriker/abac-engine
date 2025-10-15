/**
 * ABAC Engine Tests
 *
 * Comprehensive tests for the true ABAC (Attribute-Based Access Control) engine.
 * These tests verify that the engine makes decisions based purely on attributes
 * without relying on roles.
 */

import {
  ABACEngine,
  AttributeRef,
  Attributes,
  CombiningAlgorithm,
  ConditionBuilder,
  Decision,
  Effect,
  EnvironmentAttributeProvider,
  InMemoryAttributeProvider,
  PolicyBuilder
} from '../../src/abac';

import type { ABACPolicy, ABACRequest } from '../../src/abac/types';

describe('ABAC Engine', () => {
  let engine: ABACEngine;
  let subjectProvider: InMemoryAttributeProvider;
  let resourceProvider: InMemoryAttributeProvider;
  let environmentProvider: EnvironmentAttributeProvider;

  beforeEach(() => {
    // Setup attribute providers
    subjectProvider = new InMemoryAttributeProvider('subject', 'users', {
      user123: {
        department: 'Engineering',
        clearanceLevel: 3,
        employeeType: 'FullTime',
        role: 'Senior Developer'
      },
      user456: {
        department: 'Finance',
        clearanceLevel: 2,
        employeeType: 'Contractor',
        role: 'Analyst'
      },
      user789: {
        department: 'Security',
        clearanceLevel: 5,
        employeeType: 'FullTime',
        role: 'Security Officer'
      }
    });

    resourceProvider = new InMemoryAttributeProvider('resource', 'documents', {
      doc001: {
        classification: 2,
        department: 'Engineering',
        owner: 'user123',
        sensitivity: 'internal',
        status: 'published'
      },
      doc002: {
        classification: 4,
        department: 'Finance',
        owner: 'user456',
        sensitivity: 'confidential',
        status: 'draft'
      },
      doc003: {
        classification: 1,
        department: 'Engineering',
        owner: 'user123',
        sensitivity: 'public',
        status: 'published'
      }
    });

    environmentProvider = new EnvironmentAttributeProvider();

    // Create ABAC engine
    engine = new ABACEngine({
      combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
      attributeProviders: [subjectProvider, resourceProvider, environmentProvider],
      enableAuditLog: true,
      enablePerformanceMetrics: true
    });

    // Register custom functions
    engine.registerFunction('is_business_hours', (_args, _request) => {
      const now = new Date();
      const hour = now.getHours();
      return hour >= 9 && hour <= 17;
    });

    engine.registerFunction('is_outside_business_hours', (_args, _request) => {
      const now = new Date();
      const hour = now.getHours();
      return hour < 9 || hour > 17;
    });

    engine.registerFunction('is_emergency_mode', (_args, _request) => {
      return false; // Default to false for testing
    });
  });

  describe('Attribute-Based Policy Evaluation', () => {
    test('should permit access based on ownership attribute', async () => {
      const policy = PolicyBuilder.create('ownership-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
      expect(decision.matchedPolicies).toHaveLength(1);
      expect(decision.matchedPolicies[0]?.id).toBe('ownership-policy');
    });

    test('should deny access when ownership attribute does not match', async () => {
      const policy = PolicyBuilder.create('ownership-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user456', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('NotApplicable');
    });

    test('should evaluate complex attribute combinations', async () => {
      const policy = PolicyBuilder.create('department-clearance-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department)
            .and(
              ConditionBuilder.greaterThan(
                Attributes.subject.clearanceLevel,
                Attributes.resource.classification
              )
            )
            .and(ConditionBuilder.equals(Attributes.resource.status, 'published'))
        )
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
    });

    test('should deny when clearance level is insufficient', async () => {
      const policy = PolicyBuilder.create('clearance-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.greaterThan(
            Attributes.subject.clearanceLevel,
            Attributes.resource.classification
          )
        )
        .build();

      const request: ABACRequest = {
        subject: { id: 'user456', attributes: {} }, // clearance 2
        resource: { id: 'doc002', type: 'document', attributes: {} }, // classification 4
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('NotApplicable');
    });
  });

  describe('Custom Function Conditions', () => {
    test('should evaluate custom function conditions', async () => {
      const policy = PolicyBuilder.create('business-hours-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.function('is_business_hours'))
        .build();

      // Mock current time to be during business hours
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14); // 2 PM

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');

      jest.restoreAllMocks();
    });

    test('should deny when custom function returns false', async () => {
      const policy = PolicyBuilder.create('business-hours-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.function('is_business_hours'))
        .build();

      // Mock current time to be outside business hours
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20); // 8 PM

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('NotApplicable');

      jest.restoreAllMocks();
    });
  });

  describe('Policy Combining Algorithms', () => {
    test('deny-overrides should deny when any policy denies', async () => {
      const permitPolicy = PolicyBuilder.create('permit-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.department, 'Engineering'))
        .build();

      const denyPolicy = PolicyBuilder.create('deny-policy')
        .version('1.0.0')
        .deny()
        .condition(ConditionBuilder.equals(AttributeRef.subject('employeeType'), 'Contractor'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user456', attributes: {} }, // Contractor in Finance
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const engineWithDenyOverrides = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
        attributeProviders: [subjectProvider, resourceProvider, environmentProvider]
      });

      const decision = await engineWithDenyOverrides.evaluate(request, [permitPolicy, denyPolicy]);

      expect(decision.decision).toBe('Deny');
    });

    test('permit-overrides should permit when any policy permits', async () => {
      const permitPolicy = PolicyBuilder.create('permit-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, 'user456'))
        .build();

      const denyPolicy = PolicyBuilder.create('deny-policy')
        .version('1.0.0')
        .deny()
        .condition(ConditionBuilder.equals(AttributeRef.subject('employeeType'), 'Contractor'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user456', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const engineWithPermitOverrides = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.PermitOverrides,
        attributeProviders: [subjectProvider, resourceProvider, environmentProvider]
      });

      const decision = await engineWithPermitOverrides.evaluate(request, [
        permitPolicy,
        denyPolicy
      ]);

      expect(decision.decision).toBe('Permit');
    });
  });

  describe('Policy Targets', () => {
    test('should only apply policy when target matches', async () => {
      const policy = PolicyBuilder.create('specific-action-policy')
        .version('1.0.0')
        .permit()
        .target(
          new (require('../../src/abac/policyBuilder').TargetBuilder)().action(
            ConditionBuilder.equals(Attributes.action.id, 'delete')
          )
        )
        .condition(ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner))
        .build();

      // Test with matching target
      const deleteRequest: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'delete' }
      };

      const deleteDecision = await engine.evaluate(deleteRequest, [policy]);
      expect(deleteDecision.decision).toBe('Permit');

      // Test with non-matching target
      const readRequest: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const readDecision = await engine.evaluate(readRequest, [policy]);
      expect(readDecision.decision).toBe('NotApplicable');
    });
  });

  describe('Obligations and Advice', () => {
    test('should collect obligations from applicable policies', async () => {
      const policy = PolicyBuilder.create('policy-with-obligations')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, 'user123'))
        .logObligation({ reason: 'test_access' })
        .notifyObligation({ recipients: ['admin@test.com'] })
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
      expect(decision.obligations).toHaveLength(2);
      expect(decision.obligations.some(o => o.type === 'log')).toBe(true);
      expect(decision.obligations.some(o => o.type === 'notify')).toBe(true);
    });

    test('should collect advice from applicable policies', async () => {
      const policy = PolicyBuilder.create('policy-with-advice')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, 'user123'))
        .warning({ message: 'This is a test warning' })
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
      expect(decision.advice).toHaveLength(1);
      expect(decision.advice[0]?.type).toBe('warning');
    });
  });

  describe('Attribute Enhancement', () => {
    test('should enhance request with attributes from providers', async () => {
      const policy = PolicyBuilder.create('enhanced-attributes-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(Attributes.subject.department, 'Engineering').and(
            ConditionBuilder.equals(Attributes.resource.owner, 'user123')
          )
        )
        .build();

      // Request with minimal attributes (will be enhanced by providers)
      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics', async () => {
      const policy = PolicyBuilder.create('metrics-test-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, 'user123'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      await engine.evaluate(request, [policy]);

      const metrics = engine.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.averageEvaluationTime).toBeGreaterThan(0);
      expect(metrics.decisionDistribution.Permit).toBeGreaterThan(0);
    });

    test('should create audit logs', async () => {
      const policy = PolicyBuilder.create('audit-test-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(Attributes.subject.id, 'user123'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      await engine.evaluate(request, [policy]);

      const auditLogs = engine.getAuditLogs(1);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]?.subject.id).toBe('user123');
      expect(auditLogs[0]?.resource.id).toBe('doc001');
      expect(auditLogs[0]?.action.id).toBe('read');
      expect(auditLogs[0]?.decision).toBe('Permit');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid conditions gracefully', async () => {
      const policy: ABACPolicy = {
        id: 'invalid-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: 'invalid_operator',
          left: 'test',
          right: 'test'
        } as any
      };

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe(Decision.NotApplicable);
      // Invalid operator is now handled gracefully, policy becomes NotApplicable
      expect(decision.evaluationDetails).toBeDefined();
    });

    test('should handle missing attributes gracefully', async () => {
      const policy = PolicyBuilder.create('missing-attribute-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(AttributeRef.subject('nonExistentAttribute'), 'someValue')
        )
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('NotApplicable');
    });
  });

  describe('Complex Logical Conditions', () => {
    test('should evaluate OR conditions correctly', async () => {
      const policy = PolicyBuilder.create('or-condition-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner).or(
            ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department)
          )
        )
        .build();

      // Test case where user is not owner but same department
      const request: ABACRequest = {
        subject: { id: 'user789', attributes: {} }, // Security user
        resource: { id: 'doc001', type: 'document', attributes: {} }, // Engineering document owned by user123
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('NotApplicable'); // Different departments
    });

    test('should evaluate NOT conditions correctly', async () => {
      const policy = PolicyBuilder.create('not-condition-policy')
        .version('1.0.0')
        .deny()
        .condition(
          ConditionBuilder.equals(AttributeRef.subject('employeeType'), 'Contractor').not()
        )
        .build();

      // Test with full-time employee (should be denied because NOT contractor = true)
      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} }, // FullTime employee
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Deny');
    });
  });

  describe('Comparison Operators', () => {
    test('should handle various comparison operators', async () => {
      const testCases = [
        {
          operator: 'greater_than',
          left: 5,
          right: 3,
          expected: 'Permit'
        },
        {
          operator: 'less_than',
          left: 2,
          right: 4,
          expected: 'Permit'
        },
        {
          operator: 'in',
          left: 'engineering',
          right: ['engineering', 'finance'],
          expected: 'Permit'
        },
        {
          operator: 'contains',
          left: 'engineering-team',
          right: 'engineering',
          expected: 'Permit'
        }
      ];

      for (const testCase of testCases) {
        const policy: ABACPolicy = {
          id: `test-${testCase.operator}`,
          version: '1.0.0',
          effect: Effect.Permit,
          condition: {
            operator: testCase.operator as any,
            left: testCase.left,
            right: testCase.right
          }
        };

        const request: ABACRequest = {
          subject: { id: 'user123', attributes: {} },
          resource: { id: 'doc001', type: 'document', attributes: {} },
          action: { id: 'read' }
        };

        const decision = await engine.evaluate(request, [policy]);
        expect(decision.decision).toBe(testCase.expected);
      }
    });
  });

  describe('Environment Context', () => {
    test('should use environment attributes in decisions', async () => {
      // Add static environment attribute
      environmentProvider.addStaticAttribute('location', 'office');

      const policy = PolicyBuilder.create('location-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(AttributeRef.environment('location'), 'office'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc001', type: 'document', attributes: {} },
        action: { id: 'read' },
        environment: { currentTime: new Date() }
      };

      const decision = await engine.evaluate(request, [policy]);

      expect(decision.decision).toBe('Permit');
    });
  });
});
