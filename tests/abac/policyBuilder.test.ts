/**
 * Policy Builder Tests
 *
 * Comprehensive tests for PolicyBuilder, ConditionBuilder, TargetBuilder, and AttributeRef
 */

import {
  AttributeRef,
  Attributes,
  ConditionBuilder,
  PolicyBuilder,
  PolicyPatterns,
  TargetBuilder
} from '../../src/abac/policyBuilder';
import { ComparisonOperator, LogicalOperator } from '../../src/abac/types';

describe('Policy Builder', () => {
  describe('ConditionBuilder', () => {
    test('should create equals condition', () => {
      const condition = ConditionBuilder.equals('value1', 'value2').build();

      expect(condition).toEqual({
        operator: ComparisonOperator.Equals,
        left: 'value1',
        right: 'value2'
      });
    });

    test('should create not equals condition', () => {
      const condition = ConditionBuilder.notEquals('value1', 'value2').build();

      expect(condition).toEqual({
        operator: ComparisonOperator.NotEquals,
        left: 'value1',
        right: 'value2'
      });
    });

    test('should create greater than condition', () => {
      const condition = ConditionBuilder.greaterThan(10, 5).build();

      expect(condition).toEqual({
        operator: 'greater_than',
        left: 10,
        right: 5
      });
    });

    test('should create less than condition', () => {
      const condition = ConditionBuilder.lessThan(5, 10).build();

      expect(condition).toEqual({
        operator: 'less_than',
        left: 5,
        right: 10
      });
    });

    test('should create greater than or equal condition', () => {
      const condition = ConditionBuilder.greaterThanOrEqual(10, 5).build();

      expect(condition).toEqual({
        operator: 'greater_than_or_equal',
        left: 10,
        right: 5
      });
    });

    test('should create less than or equal condition', () => {
      const condition = ConditionBuilder.lessThanOrEqual(5, 10).build();

      expect(condition).toEqual({
        operator: 'less_than_or_equal',
        left: 5,
        right: 10
      });
    });

    test('should create in condition', () => {
      const condition = ConditionBuilder.in('value', ['value', 'other']).build();

      expect(condition).toEqual({
        operator: 'in',
        left: 'value',
        right: ['value', 'other']
      });
    });

    test('should create contains condition', () => {
      const condition = ConditionBuilder.contains('hello world', 'world').build();

      expect(condition).toEqual({
        operator: 'contains',
        left: 'hello world',
        right: 'world'
      });
    });

    test('should create exists condition', () => {
      const ref = AttributeRef.subject('email');
      const condition = ConditionBuilder.exists(ref).build();

      expect(condition).toEqual({
        operator: 'exists',
        left: ref,
        right: true
      });
    });

    test('should create function condition', () => {
      const condition = ConditionBuilder.function('myFunction', 'arg1', 'arg2').build();

      expect(condition).toEqual({
        function: 'myFunction',
        args: ['arg1', 'arg2']
      });
    });

    test('should chain conditions with AND', () => {
      const condition = ConditionBuilder.equals('a', 'b')
        .and(ConditionBuilder.equals('c', 'd'))
        .build();

      expect(condition).toEqual({
        operator: LogicalOperator.And,
        conditions: [
          { operator: ComparisonOperator.Equals, left: 'a', right: 'b' },
          { operator: ComparisonOperator.Equals, left: 'c', right: 'd' }
        ]
      });
    });

    test('should chain conditions with OR', () => {
      const condition = ConditionBuilder.equals('a', 'b')
        .or(ConditionBuilder.equals('c', 'd'))
        .build();

      expect(condition).toEqual({
        operator: LogicalOperator.Or,
        conditions: [
          { operator: ComparisonOperator.Equals, left: 'a', right: 'b' },
          { operator: ComparisonOperator.Equals, left: 'c', right: 'd' }
        ]
      });
    });

    test('should negate condition with NOT', () => {
      const condition = ConditionBuilder.equals('a', 'b').not().build();

      expect(condition).toEqual({
        operator: LogicalOperator.Not,
        conditions: [{ operator: ComparisonOperator.Equals, left: 'a', right: 'b' }]
      });
    });

    test('should handle complex nested conditions', () => {
      const condition = ConditionBuilder.equals('a', 'b')
        .and(ConditionBuilder.equals('c', 'd').or(ConditionBuilder.equals('e', 'f')))
        .build();

      expect(condition).toHaveProperty('operator', 'and');
      expect(condition).toHaveProperty('conditions');
    });
  });

  describe('TargetBuilder', () => {
    test('should create subject target', () => {
      const target = new TargetBuilder().subject(ConditionBuilder.equals('role', 'admin')).build();

      expect(target).toHaveProperty('subject');
      expect(target.subject).toHaveProperty('operator', ComparisonOperator.Equals);
    });

    test('should create resource target', () => {
      const target = new TargetBuilder()
        .resource(ConditionBuilder.equals('type', 'document'))
        .build();

      expect(target).toHaveProperty('resource');
      expect(target.resource).toHaveProperty('operator', ComparisonOperator.Equals);
    });

    test('should create action target', () => {
      const target = new TargetBuilder()
        .action(ConditionBuilder.in('id', ['read', 'write']))
        .build();

      expect(target).toHaveProperty('action');
    });

    test('should create environment target', () => {
      const target = new TargetBuilder()
        .environment(ConditionBuilder.equals('location', 'office'))
        .build();

      expect(target).toHaveProperty('environment');
    });

    test('should create combined target', () => {
      const target = new TargetBuilder()
        .subject(ConditionBuilder.equals('role', 'admin'))
        .resource(ConditionBuilder.equals('type', 'document'))
        .action(ConditionBuilder.equals('id', 'read'))
        .environment(ConditionBuilder.equals('location', 'office'))
        .build();

      expect(target).toHaveProperty('subject');
      expect(target).toHaveProperty('resource');
      expect(target).toHaveProperty('action');
      expect(target).toHaveProperty('environment');
    });

    test('should accept Condition directly', () => {
      const condition = { operator: ComparisonOperator.Equals, left: 'a', right: 'b' };
      const target = new TargetBuilder().subject(condition).build();

      expect(target.subject).toEqual(condition);
    });
  });

  describe('PolicyBuilder', () => {
    test('should create basic policy', () => {
      const policy = PolicyBuilder.create('test-policy').version('1.0.0').permit().build();

      expect(policy).toEqual({
        id: 'test-policy',
        version: '1.0.0',
        effect: 'Permit',
        obligations: [],
        advice: []
      });
    });

    test('should create policy with description', () => {
      const policy = PolicyBuilder.create('test-policy')
        .version('1.0.0')
        .description('Test policy description')
        .permit()
        .build();

      expect(policy.description).toBe('Test policy description');
    });

    test('should create deny policy', () => {
      const policy = PolicyBuilder.create('deny-policy').version('1.0.0').deny().build();

      expect(policy.effect).toBe('Deny');
    });

    test('should set priority', () => {
      const policy = PolicyBuilder.create('priority-policy')
        .version('1.0.0')
        .priority(100)
        .permit()
        .build();

      expect(policy.priority).toBe(100);
    });

    test('should add condition', () => {
      const policy = PolicyBuilder.create('conditional-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals('a', 'b'))
        .build();

      expect(policy.condition).toHaveProperty('operator', ComparisonOperator.Equals);
    });

    test('should add target', () => {
      const policy = PolicyBuilder.create('targeted-policy')
        .version('1.0.0')
        .permit()
        .target(new TargetBuilder().subject(ConditionBuilder.equals('role', 'admin')))
        .build();

      expect(policy.target).toHaveProperty('subject');
    });

    test('should add obligation', () => {
      const policy = PolicyBuilder.create('obligation-policy')
        .version('1.0.0')
        .permit()
        .obligation({
          id: 'test-obligation',
          type: 'log',
          parameters: { reason: 'test' }
        })
        .build();

      expect(policy.obligations).toHaveLength(1);
      expect(policy.obligations?.[0]?.id).toBe('test-obligation');
    });

    test('should add log obligation', () => {
      const policy = PolicyBuilder.create('log-policy')
        .version('1.0.0')
        .permit()
        .logObligation({ reason: 'test_access' })
        .build();

      expect(policy.obligations).toHaveLength(1);
      expect(policy.obligations?.[0]?.type).toBe('log');
    });

    test('should add notify obligation', () => {
      const policy = PolicyBuilder.create('notify-policy')
        .version('1.0.0')
        .permit()
        .notifyObligation({ recipient: 'admin@example.com' })
        .build();

      expect(policy.obligations).toHaveLength(1);
      expect(policy.obligations?.[0]?.type).toBe('notify');
    });

    test('should add advice', () => {
      const policy = PolicyBuilder.create('advice-policy')
        .version('1.0.0')
        .permit()
        .advice({
          id: 'test-advice',
          type: 'warning',
          parameters: { message: 'test' }
        })
        .build();

      expect(policy.advice).toHaveLength(1);
      expect(policy.advice?.[0]?.id).toBe('test-advice');
    });

    test('should add warning advice', () => {
      const policy = PolicyBuilder.create('warning-policy')
        .version('1.0.0')
        .permit()
        .warning({ message: 'Warning message' })
        .build();

      expect(policy.advice).toHaveLength(1);
      expect(policy.advice?.[0]?.type).toBe('warning');
    });

    test('should add metadata', () => {
      const metadata = {
        createdBy: 'admin',
        createdAt: new Date(),
        tags: ['test', 'example']
      };

      const policy = PolicyBuilder.create('metadata-policy')
        .version('1.0.0')
        .permit()
        .metadata(metadata)
        .build();

      expect(policy.metadata).toEqual(metadata);
    });

    test('should add tags', () => {
      const policy = PolicyBuilder.create('tagged-policy')
        .version('1.0.0')
        .permit()
        .tags('tag1', 'tag2', 'tag3')
        .build();

      expect(policy.metadata?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should append tags to existing metadata', () => {
      const policy = PolicyBuilder.create('tagged-policy')
        .version('1.0.0')
        .permit()
        .tags('tag1')
        .tags('tag2')
        .build();

      expect(policy.metadata?.tags).toEqual(['tag1', 'tag2']);
    });

    test('should set id through method', () => {
      const policy = PolicyBuilder.create().id('my-policy').version('1.0.0').permit().build();

      expect(policy.id).toBe('my-policy');
    });

    test('should default version to 1.0.0', () => {
      const policy = PolicyBuilder.create('test-policy').permit().build();

      expect(policy.version).toBe('1.0.0');
    });

    test('should throw error if id not provided', () => {
      expect(() => {
        PolicyBuilder.create().permit().build();
      }).toThrow('Policy ID is required');
    });

    test('should throw error if effect not provided', () => {
      expect(() => {
        PolicyBuilder.create('test-policy').version('1.0.0').build();
      }).toThrow('Policy effect is required');
    });

    test('should create complex policy', () => {
      const policy = PolicyBuilder.create('complex-policy')
        .version('2.0.0')
        .description('A complex policy for testing')
        .permit()
        .priority(50)
        .target(
          new TargetBuilder()
            .subject(ConditionBuilder.equals(AttributeRef.subject('role'), 'manager'))
            .resource(ConditionBuilder.equals(AttributeRef.resource('type'), 'document'))
        )
        .condition(
          ConditionBuilder.equals(
            AttributeRef.subject('department'),
            AttributeRef.resource('department')
          )
        )
        .logObligation({ reason: 'manager_access' })
        .warning({ message: 'Department access granted' })
        .tags('department', 'manager', 'document')
        .build();

      expect(policy.id).toBe('complex-policy');
      expect(policy.version).toBe('2.0.0');
      expect(policy.effect).toBe('Permit');
      expect(policy.priority).toBe(50);
      expect(policy.target).toBeDefined();
      expect(policy.condition).toBeDefined();
      expect(policy.obligations).toHaveLength(1);
      expect(policy.advice).toHaveLength(1);
      expect(policy.metadata?.tags).toHaveLength(3);
    });
  });

  describe('AttributeRef', () => {
    test('should create subject attribute reference', () => {
      const ref = AttributeRef.subject('department');

      expect(ref).toEqual({
        category: 'subject',
        attributeId: 'department',
        path: undefined
      });
    });

    test('should create subject attribute reference with path', () => {
      const ref = AttributeRef.subject('profile', 'user.profile.name');

      expect(ref).toEqual({
        category: 'subject',
        attributeId: 'profile',
        path: 'user.profile.name'
      });
    });

    test('should create resource attribute reference', () => {
      const ref = AttributeRef.resource('owner');

      expect(ref).toEqual({
        category: 'resource',
        attributeId: 'owner',
        path: undefined
      });
    });

    test('should create action attribute reference', () => {
      const ref = AttributeRef.action('id');

      expect(ref).toEqual({
        category: 'action',
        attributeId: 'id',
        path: undefined
      });
    });

    test('should create environment attribute reference', () => {
      const ref = AttributeRef.environment('currentTime');

      expect(ref).toEqual({
        category: 'environment',
        attributeId: 'currentTime',
        path: undefined
      });
    });
  });

  describe('Attributes helper', () => {
    test('should have subject attributes', () => {
      expect(Attributes.subject.id).toEqual({
        category: 'subject',
        attributeId: 'id',
        path: undefined
      });
      expect(Attributes.subject.department).toEqual({
        category: 'subject',
        attributeId: 'department',
        path: undefined
      });
    });

    test('should have resource attributes', () => {
      expect(Attributes.resource.id).toEqual({
        category: 'resource',
        attributeId: 'id',
        path: undefined
      });
      expect(Attributes.resource.owner).toEqual({
        category: 'resource',
        attributeId: 'owner',
        path: undefined
      });
    });

    test('should have action attributes', () => {
      expect(Attributes.action.id).toEqual({
        category: 'action',
        attributeId: 'id',
        path: undefined
      });
    });

    test('should have environment attributes', () => {
      expect(Attributes.environment.currentTime).toEqual({
        category: 'environment',
        attributeId: 'currentTime',
        path: undefined
      });
    });
  });

  describe('PolicyPatterns', () => {
    test('should create ownership policy', () => {
      const policy = PolicyPatterns.ownership(['read', 'update', 'delete']);

      expect(policy.id).toBe('ownership-policy');
      expect(policy.effect).toBe('Permit');
      expect(policy.target).toBeDefined();
      expect(policy.condition).toBeDefined();
    });

    test('should create department access policy', () => {
      const policy = PolicyPatterns.departmentAccess(['read'], ['public', 'internal']);

      expect(policy.id).toBe('department-access-policy');
      expect(policy.effect).toBe('Permit');
    });

    test('should create business hours policy', () => {
      const policy = PolicyPatterns.businessHoursOnly(['create', 'update']);

      expect(policy.id).toBe('business-hours-policy');
      expect(policy.effect).toBe('Permit');
    });

    test('should create clearance level policy', () => {
      const policy = PolicyPatterns.clearanceLevel(['read', 'download']);

      expect(policy.id).toBe('clearance-policy');
      expect(policy.effect).toBe('Permit');
    });

    test('should create emergency access policy', () => {
      const policy = PolicyPatterns.emergencyAccess();

      expect(policy.id).toBe('emergency-access-policy');
      expect(policy.effect).toBe('Permit');
      expect(policy.priority).toBe(1000);
      expect(policy.obligations).toBeDefined();
    });
  });
});
