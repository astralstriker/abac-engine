/**
 * Policy Validator Tests
 *
 * Tests for standalone policy validation utilities
 */

import { AttributeRef, ConditionBuilder, PolicyBuilder } from '../../src/abac/policyBuilder';
import {
  validatePolicies,
  validatePolicy,
  validatePolicyOrThrow
} from '../../src/abac/policyValidator';
import { ComparisonOperator, Effect, LogicalOperator } from '../../src/abac/types';

describe('Policy Validator', () => {
  describe('validatePolicy', () => {
    test('should validate a correct policy', () => {
      const policy = PolicyBuilder.create('test-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(AttributeRef.subject('id'), 'user123'))
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.policyId).toBe('test-policy');
    });

    test('should reject policy without id', () => {
      const policy = {
        version: '1.0.0',
        effect: Effect.Permit
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('valid id');
    });

    test('should reject policy without version', () => {
      const policy = {
        id: 'test-policy',
        effect: Effect.Permit
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('version'))).toBe(true);
    });

    test('should reject policy with invalid effect', () => {
      const policy = {
        id: 'test-policy',
        version: '1.0.0',
        effect: 'Invalid'
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('effect'))).toBe(true);
    });

    test('should validate policy with complex conditions', () => {
      const policy = PolicyBuilder.create('complex-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering')
            .and(ConditionBuilder.greaterThan(AttributeRef.subject('level'), 3))
            .or(ConditionBuilder.equals(AttributeRef.subject('role'), 'admin'))
        )
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate policy with obligations', () => {
      const policy = PolicyBuilder.create('test-policy')
        .version('1.0.0')
        .permit()
        .logObligation({ action: 'test', timestamp: new Date() })
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should warn about deeply nested conditions', () => {
      // Create a deeply nested condition (depth > 5)
      let condition = ConditionBuilder.equals('a', 'b');
      for (let i = 0; i < 6; i++) {
        condition = condition.and(ConditionBuilder.equals(`x${i}`, `y${i}`));
      }

      const policy = PolicyBuilder.create('nested-policy')
        .version('1.0.0')
        .permit()
        .condition(condition)
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });

    test('should validate logical operators', () => {
      const policy = PolicyBuilder.create('logical-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals('a', 'b')
            .and(ConditionBuilder.equals('c', 'd'))
            .or(ConditionBuilder.equals('e', 'f'))
        )
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should reject condition with invalid operator', () => {
      const policy = {
        id: 'invalid-operator-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: 'invalid_operator',
          left: 'a',
          right: 'b'
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown operator'))).toBe(true);
    });

    test('should reject logical condition without conditions array', () => {
      const policy = {
        id: 'bad-logical-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: LogicalOperator.And
          // Missing conditions array
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('conditions array'))).toBe(true);
    });

    test('should reject NOT operator with multiple conditions', () => {
      const policy = {
        id: 'bad-not-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: LogicalOperator.Not,
          conditions: [
            { operator: ComparisonOperator.Equals, left: 'a', right: 'b' },
            { operator: ComparisonOperator.Equals, left: 'c', right: 'd' }
          ]
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exactly one condition'))).toBe(true);
    });

    test('should reject comparison condition without left operand', () => {
      const policy = {
        id: 'missing-left-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: ComparisonOperator.Equals,
          right: 'value'
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('left operand'))).toBe(true);
    });

    test('should allow exists/not_exists without right operand', () => {
      const policy = PolicyBuilder.create('exists-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.exists(AttributeRef.subject('email')))
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should validate function conditions', () => {
      const policy = {
        id: 'function-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          function: 'is_business_hours',
          args: []
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should reject function condition without function name', () => {
      const policy = {
        id: 'bad-function-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          function: '',
          args: []
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
    });

    test('should warn about function without arguments', () => {
      const policy = {
        id: 'no-args-function-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          function: 'test_function'
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('no arguments'))).toBe(true);
    });

    test('should validate attribute references in conditions', () => {
      const policy = PolicyBuilder.create('attr-ref-policy')
        .version('1.0.0')
        .permit()
        .condition(
          ConditionBuilder.equals(
            AttributeRef.subject('department'),
            AttributeRef.resource('department')
          )
        )
        .build();

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should reject invalid attribute category', () => {
      const policy = {
        id: 'bad-category-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: ComparisonOperator.Equals,
          left: {
            category: 'invalid_category',
            attributeId: 'test'
          },
          right: 'value'
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid attribute category'))).toBe(true);
    });

    test('should reject obligation without id', () => {
      const policy = {
        id: 'bad-obligation-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        obligations: [
          {
            attributeAssignment: { key: 'value' }
          }
        ]
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Obligation'))).toBe(true);
    });

    test('should reject advice without id', () => {
      const policy = {
        id: 'bad-advice-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        advice: [
          {
            attributeAssignment: { key: 'value' }
          }
        ]
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Advice'))).toBe(true);
    });
  });

  describe('validatePolicies', () => {
    test('should validate multiple policies', () => {
      const policies = [
        PolicyBuilder.create('policy-1').version('1.0.0').permit().build(),
        PolicyBuilder.create('policy-2').version('1.0.0').deny().build()
      ];

      const results = validatePolicies(policies);

      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(true);
    });

    test('should return validation result for each policy', () => {
      const policies = [
        PolicyBuilder.create('valid-policy').version('1.0.0').permit().build(),
        { id: 'invalid-policy', effect: 'Permit' } as any // Missing version
      ];

      const results = validatePolicies(policies);

      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(false);
    });
  });

  describe('validatePolicyOrThrow', () => {
    test('should not throw for valid policy', () => {
      const policy = PolicyBuilder.create('test-policy').version('1.0.0').permit().build();

      expect(() => validatePolicyOrThrow(policy)).not.toThrow();
    });

    test('should throw for invalid policy', () => {
      const policy = {
        id: 'invalid-policy',
        effect: Effect.Permit
      } as any;

      expect(() => validatePolicyOrThrow(policy)).toThrow('Policy validation failed');
    });

    test('should include error details in exception', () => {
      const policy = {
        effect: Effect.Permit
      } as any;

      expect(() => validatePolicyOrThrow(policy)).toThrow('valid id');
    });
  });

  describe('Edge Cases', () => {
    test('should handle policy with null condition', () => {
      const policy = {
        id: 'null-condition-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: null
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should handle policy with empty obligations array', () => {
      const policy = {
        id: 'empty-obligations-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        obligations: []
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should handle policy with empty advice array', () => {
      const policy = {
        id: 'empty-advice-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        advice: []
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should validate nested conditions recursively', () => {
      const policy = {
        id: 'nested-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: LogicalOperator.And,
          conditions: [
            {
              operator: LogicalOperator.Or,
              conditions: [
                { operator: ComparisonOperator.Equals, left: 'a', right: 'b' },
                { operator: ComparisonOperator.Equals, left: 'c', right: 'd' }
              ]
            },
            { operator: ComparisonOperator.Equals, left: 'e', right: 'f' }
          ]
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
    });

    test('should detect errors in nested conditions', () => {
      const policy = {
        id: 'bad-nested-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        condition: {
          operator: LogicalOperator.And,
          conditions: [
            {
              operator: 'invalid_operator',
              left: 'a',
              right: 'b'
            }
          ]
        }
      } as any;

      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown operator'))).toBe(true);
    });
  });
});
