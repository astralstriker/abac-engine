/**
 * Tests for PolicyEvaluator
 */

import { AttributeResolver } from '../../../src/abac/evaluation/AttributeResolver';
import { PolicyEvaluator } from '../../../src/abac/evaluation/PolicyEvaluator';
import { FunctionRegistry } from '../../../src/abac/services/FunctionRegistry';
import {
  ABACPolicy,
  ABACRequest,
  ComparisonOperator,
  Decision,
  Effect,
  LogicalOperator
} from '../../../src/abac/types';
import { SilentLogger } from '../../../src/logger';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;
  let logger: SilentLogger;
  let functionRegistry: FunctionRegistry;
  let attributeResolver: AttributeResolver;

  beforeEach(() => {
    logger = new SilentLogger();
    functionRegistry = new FunctionRegistry();
    attributeResolver = new AttributeResolver(logger);
    evaluator = new PolicyEvaluator(logger, functionRegistry, attributeResolver);
  });

  const mockRequest: ABACRequest = {
    subject: {
      id: 'user1',
      attributes: { role: 'admin', department: 'IT', clearanceLevel: 5 }
    },
    resource: {
      id: 'doc1',
      type: 'document',
      attributes: { classification: 'secret', owner: 'user1' }
    },
    action: {
      id: 'read',
      attributes: { method: 'GET' }
    },
    environment: {
      attributes: { ipAddress: '192.168.1.1' }
    }
  };

  describe('evaluatePolicy', () => {
    it('should permit when policy has no condition', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.decision).toBe(Decision.Permit);
      expect(result.policy).toBe(policy);
    });

    it('should deny when policy has no condition and effect is Deny', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Deny
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.decision).toBe(Decision.Deny);
      expect(result.policy).toBe(policy);
    });

    it('should return NotApplicable when condition is not met', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        condition: {
          operator: ComparisonOperator.Equals,
          left: { category: 'subject', attributeId: 'role' },
          right: 'superadmin'
        }
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.decision).toBe(Decision.NotApplicable);
      expect(result.reason).toContain('condition not met');
    });

    it('should permit when condition is met', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        condition: {
          operator: ComparisonOperator.Equals,
          left: { category: 'subject', attributeId: 'role' },
          right: 'admin'
        }
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.decision).toBe(Decision.Permit);
    });

    it('should include obligations in result', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        obligations: [{ id: 'log', type: 'log' }]
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.obligations).toHaveLength(1);
      expect(result.obligations?.[0]?.id).toBe('log');
    });

    it('should include advice in result', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        advice: [{ id: 'warn', type: 'warning' }]
      };

      const result = await evaluator.evaluatePolicy(mockRequest, policy);

      expect(result.advice).toHaveLength(1);
      expect(result.advice?.[0]?.id).toBe('warn');
    });
  });

  describe('isPolicyApplicable', () => {
    it('should return true when no target is specified', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit
      };

      const result = await evaluator.isPolicyApplicable(mockRequest, policy);
      expect(result).toBe(true);
    });

    it('should return true when subject target matches', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        target: {
          subject: {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject', attributeId: 'role' },
            right: 'admin'
          }
        }
      };

      const result = await evaluator.isPolicyApplicable(mockRequest, policy);
      expect(result).toBe(true);
    });

    it('should return false when subject target does not match', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        target: {
          subject: {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject', attributeId: 'role' },
            right: 'user'
          }
        }
      };

      const result = await evaluator.isPolicyApplicable(mockRequest, policy);
      expect(result).toBe(false);
    });

    it('should return true when all targets match', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        target: {
          subject: {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject', attributeId: 'role' },
            right: 'admin'
          },
          resource: {
            operator: ComparisonOperator.Equals,
            left: { category: 'resource', attributeId: 'type' },
            right: 'document'
          },
          action: {
            operator: ComparisonOperator.Equals,
            left: { category: 'action', attributeId: 'id' },
            right: 'read'
          }
        }
      };

      const result = await evaluator.isPolicyApplicable(mockRequest, policy);
      expect(result).toBe(true);
    });

    it('should return false when any target does not match', async () => {
      const policy: ABACPolicy = {
        id: 'policy1',
        version: '1.0',
        effect: Effect.Permit,
        target: {
          subject: {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject', attributeId: 'role' },
            right: 'admin'
          },
          action: {
            operator: ComparisonOperator.Equals,
            left: { category: 'action', attributeId: 'id' },
            right: 'write'
          }
        }
      };

      const result = await evaluator.isPolicyApplicable(mockRequest, policy);
      expect(result).toBe(false);
    });
  });

  describe('findApplicablePolicies', () => {
    it('should find all applicable policies', async () => {
      const policies: ABACPolicy[] = [
        {
          id: 'policy1',
          version: '1.0',
          effect: Effect.Permit,
          target: {
            subject: {
              operator: ComparisonOperator.Equals,
              left: { category: 'subject', attributeId: 'role' },
              right: 'admin'
            }
          }
        },
        {
          id: 'policy2',
          version: '1.0',
          effect: Effect.Deny,
          target: {
            action: {
              operator: ComparisonOperator.Equals,
              left: { category: 'action', attributeId: 'id' },
              right: 'read'
            }
          }
        }
      ];

      const applicable = await evaluator.findApplicablePolicies(mockRequest, policies);
      expect(applicable).toHaveLength(2);
    });

    it('should exclude non-applicable policies', async () => {
      const policies: ABACPolicy[] = [
        {
          id: 'policy1',
          version: '1.0',
          effect: Effect.Permit,
          target: {
            subject: {
              operator: ComparisonOperator.Equals,
              left: { category: 'subject', attributeId: 'role' },
              right: 'admin'
            }
          }
        },
        {
          id: 'policy2',
          version: '1.0',
          effect: Effect.Deny,
          target: {
            subject: {
              operator: ComparisonOperator.Equals,
              left: { category: 'subject', attributeId: 'role' },
              right: 'user'
            }
          }
        }
      ];

      const applicable = await evaluator.findApplicablePolicies(mockRequest, policies);
      expect(applicable).toHaveLength(1);
      expect(applicable[0]?.id).toBe('policy1');
    });

    it('should handle errors in policy evaluation gracefully', async () => {
      const policies: ABACPolicy[] = [
        {
          id: 'policy1',
          version: '1.0',
          effect: Effect.Permit,
          target: {
            subject: {
              operator: ComparisonOperator.Equals,
              left: { category: 'subject', attributeId: 'role' },
              right: 'admin'
            }
          }
        }
      ];

      const applicable = await evaluator.findApplicablePolicies(mockRequest, policies);
      expect(applicable).toHaveLength(1);
    });
  });

  describe('evaluatePolicies', () => {
    it('should evaluate all policies', async () => {
      const policies: ABACPolicy[] = [
        {
          id: 'policy1',
          version: '1.0',
          effect: Effect.Permit
        },
        {
          id: 'policy2',
          version: '1.0',
          effect: Effect.Deny
        }
      ];

      const results = await evaluator.evaluatePolicies(mockRequest, policies);
      expect(results).toHaveLength(2);
      expect(results[0]?.decision).toBe(Decision.Permit);
      expect(results[1]?.decision).toBe(Decision.Deny);
    });

    it('should handle evaluation errors', async () => {
      const policies: ABACPolicy[] = [
        {
          id: 'policy1',
          version: '1.0',
          effect: Effect.Permit,
          condition: {
            function: 'nonExistentFunction',
            args: []
          }
        }
      ];

      const errors: string[] = [];
      const results = await evaluator.evaluatePolicies(mockRequest, policies, errors);

      expect(results).toHaveLength(1);
      expect(results[0]?.decision).toBe(Decision.Indeterminate);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate comparison conditions', async () => {
      const condition = {
        operator: ComparisonOperator.Equals,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: 'admin'
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate logical AND conditions', async () => {
      const condition = {
        operator: LogicalOperator.And,
        conditions: [
          {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject' as const, attributeId: 'role' },
            right: 'admin'
          },
          {
            operator: ComparisonOperator.Equals,
            left: { category: 'action' as const, attributeId: 'id' },
            right: 'read'
          }
        ]
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate logical OR conditions', async () => {
      const condition = {
        operator: LogicalOperator.Or,
        conditions: [
          {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject' as const, attributeId: 'role' },
            right: 'user'
          },
          {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject' as const, attributeId: 'role' },
            right: 'admin'
          }
        ]
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate logical NOT conditions', async () => {
      const condition = {
        operator: LogicalOperator.Not,
        conditions: [
          {
            operator: ComparisonOperator.Equals,
            left: { category: 'subject' as const, attributeId: 'role' },
            right: 'user'
          }
        ]
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate function conditions', async () => {
      functionRegistry.register('isAdmin', args => {
        return args[0] === 'admin';
      });

      const condition = {
        function: 'isAdmin',
        args: [{ category: 'subject' as const, attributeId: 'role' }]
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should throw error for invalid condition format', async () => {
      const invalidCondition = {} as any;

      await expect(evaluator.evaluateCondition(invalidCondition, mockRequest)).rejects.toThrow(
        'Invalid condition format'
      );
    });
  });

  describe('resolveValue', () => {
    it('should resolve literal values', async () => {
      const value = await evaluator.resolveValue('test', mockRequest);
      expect(value).toBe('test');
    });

    it('should resolve numeric values', async () => {
      const value = await evaluator.resolveValue(42, mockRequest);
      expect(value).toBe(42);
    });

    it('should resolve boolean values', async () => {
      const value = await evaluator.resolveValue(true, mockRequest);
      expect(value).toBe(true);
    });

    it('should resolve attribute references', async () => {
      const ref = { category: 'subject' as const, attributeId: 'role' };
      const value = await evaluator.resolveValue(ref, mockRequest);
      expect(value).toBe('admin');
    });

    it('should return empty string for non-existent attributes', async () => {
      const ref = { category: 'subject' as const, attributeId: 'nonexistent' };
      const value = await evaluator.resolveValue(ref, mockRequest);
      expect(value).toBe('');
    });

    it('should evaluate conditions as values', async () => {
      const condition = {
        operator: ComparisonOperator.Equals,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: 'admin'
      };

      const value = await evaluator.resolveValue(condition, mockRequest);
      expect(value).toBe(true);
    });
  });

  describe('collectObligations', () => {
    it('should collect obligations from all results', () => {
      const results = [
        {
          decision: Decision.Permit,
          policy: { id: 'p1', version: '1.0', effect: Effect.Permit },
          obligations: [{ id: 'log', type: 'log' as const }]
        },
        {
          decision: Decision.Permit,
          policy: { id: 'p2', version: '1.0', effect: Effect.Permit },
          obligations: [{ id: 'notify', type: 'notify' as const }]
        }
      ];

      const obligations = evaluator.collectObligations(results);
      expect(obligations).toHaveLength(2);
      expect(obligations[0]?.id).toBe('log');
      expect(obligations[1]?.id).toBe('notify');
    });

    it('should return empty array when no obligations', () => {
      const results = [
        {
          decision: Decision.Permit,
          policy: { id: 'p1', version: '1.0', effect: Effect.Permit }
        }
      ];

      const obligations = evaluator.collectObligations(results);
      expect(obligations).toHaveLength(0);
    });
  });

  describe('collectAdvice', () => {
    it('should collect advice from all results', () => {
      const results = [
        {
          decision: Decision.Permit,
          policy: { id: 'p1', version: '1.0', effect: Effect.Permit },
          advice: [{ id: 'warn', type: 'warning' as const }]
        },
        {
          decision: Decision.Permit,
          policy: { id: 'p2', version: '1.0', effect: Effect.Permit },
          advice: [{ id: 'info', type: 'info' as const }]
        }
      ];

      const advice = evaluator.collectAdvice(results);
      expect(advice).toHaveLength(2);
      expect(advice[0]?.id).toBe('warn');
      expect(advice[1]?.id).toBe('info');
    });

    it('should return empty array when no advice', () => {
      const results = [
        {
          decision: Decision.Permit,
          policy: { id: 'p1', version: '1.0', effect: Effect.Permit }
        }
      ];

      const advice = evaluator.collectAdvice(results);
      expect(advice).toHaveLength(0);
    });
  });

  describe('comparison operators', () => {
    it('should evaluate equals operator', async () => {
      const condition = {
        operator: ComparisonOperator.Equals,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: 'admin'
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate not equals operator', async () => {
      const condition = {
        operator: ComparisonOperator.NotEquals,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: 'user'
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate greater than operator', async () => {
      const condition = {
        operator: ComparisonOperator.GreaterThan,
        left: { category: 'subject' as const, attributeId: 'clearanceLevel' },
        right: 3
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate less than operator', async () => {
      const condition = {
        operator: ComparisonOperator.LessThan,
        left: { category: 'subject' as const, attributeId: 'clearanceLevel' },
        right: 10
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate in operator', async () => {
      const condition = {
        operator: ComparisonOperator.In,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: ['admin', 'superadmin']
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate exists operator', async () => {
      const condition = {
        operator: ComparisonOperator.Exists,
        left: { category: 'subject' as const, attributeId: 'role' },
        right: ''
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });

    it('should evaluate not exists operator', async () => {
      const condition = {
        operator: ComparisonOperator.NotExists,
        left: { category: 'subject' as const, attributeId: 'nonexistent' },
        right: ''
      };

      const result = await evaluator.evaluateCondition(condition, mockRequest);
      expect(result).toBe(true);
    });
  });
});
