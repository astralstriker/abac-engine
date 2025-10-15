/**
 * PolicyEvaluator - Handles core policy evaluation logic
 *
 * Responsibilities:
 * - Evaluate policies and conditions
 * - Check policy applicability
 * - Resolve values and attribute references
 * - Collect obligations and advice
 * - Coordinate with FunctionRegistry and AttributeResolver
 */

import { ILogger } from '../../logger';
import { EvaluationError, getErrorMessage } from '../errors';
import { FunctionRegistry } from '../services/FunctionRegistry';
import {
  ABACPolicy,
  ABACRequest,
  Advice,
  AttributeReference,
  AttributeValue,
  ComparisonCondition,
  ComparisonOperator,
  Condition,
  Decision,
  Effect,
  FunctionCondition,
  LogicalCondition,
  LogicalOperator,
  Obligation,
  PolicyResult
} from '../types';
import { AttributeResolver } from './AttributeResolver';

export class PolicyEvaluator {
  private logger: ILogger;
  private functionRegistry: FunctionRegistry;
  private attributeResolver: AttributeResolver;

  constructor(
    logger: ILogger,
    functionRegistry: FunctionRegistry,
    attributeResolver: AttributeResolver
  ) {
    this.logger = logger;
    this.functionRegistry = functionRegistry;
    this.attributeResolver = attributeResolver;
  }

  /**
   * Find applicable policies for the request
   */
  public async findApplicablePolicies(
    request: ABACRequest,
    policies: ABACPolicy[]
  ): Promise<ABACPolicy[]> {
    const applicable: ABACPolicy[] = [];

    for (const policy of policies) {
      try {
        if (await this.isPolicyApplicable(request, policy)) {
          applicable.push(policy);
        }
      } catch (error) {
        // Log error but continue with other policies
        this.logger.warn(`Error checking policy applicability for ${policy.id}`, { error });
      }
    }

    return applicable;
  }

  /**
   * Check if a policy is applicable to the request
   */
  public async isPolicyApplicable(request: ABACRequest, policy: ABACPolicy): Promise<boolean> {
    if (!policy.target) {
      return true; // No target means policy applies to all requests
    }

    const target = policy.target;

    // Check each target category
    if (target.subject && !(await this.evaluateCondition(target.subject, request))) {
      return false;
    }

    if (target.resource && !(await this.evaluateCondition(target.resource, request))) {
      return false;
    }

    if (target.action && !(await this.evaluateCondition(target.action, request))) {
      return false;
    }

    if (target.environment && !(await this.evaluateCondition(target.environment, request))) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate applicable policies
   */
  public async evaluatePolicies(
    request: ABACRequest,
    policies: ABACPolicy[],
    errors: string[] = []
  ): Promise<PolicyResult[]> {
    const results: PolicyResult[] = [];

    for (const policy of policies) {
      try {
        const result = await this.evaluatePolicy(request, policy);
        results.push(result);
      } catch (error) {
        const errorMessage = `Policy evaluation error: ${getErrorMessage(error)}`;
        errors.push(errorMessage);

        this.logger.error(`Error evaluating policy ${policy.id}`, {
          error: error instanceof Error ? error.message : String(error),
          policyId: policy.id
        });

        // Policy evaluation error - treat as Indeterminate
        results.push({
          decision: Decision.Indeterminate,
          policy,
          reason: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Evaluate a single policy
   */
  public async evaluatePolicy(request: ABACRequest, policy: ABACPolicy): Promise<PolicyResult> {
    // If policy has a condition, evaluate it
    if (policy.condition) {
      const conditionMet = await this.evaluateCondition(policy.condition, request);

      if (!conditionMet) {
        return {
          decision: Decision.NotApplicable,
          policy,
          reason: 'Policy condition not met'
        };
      }
    }

    // Policy condition met or no condition - return policy effect
    const decision = policy.effect === Effect.Permit ? Decision.Permit : Decision.Deny;

    return {
      decision,
      policy,
      obligations: policy.obligations || [],
      advice: policy.advice || [],
      reason: `Policy ${policy.id} ${policy.effect.toLowerCase()}s access`
    };
  }

  /**
   * Evaluate a condition
   */
  public async evaluateCondition(condition: Condition, request: ABACRequest): Promise<boolean> {
    if ('operator' in condition && condition.operator) {
      // Handle different condition types
      if (['and', 'or', 'not'].includes(condition.operator)) {
        return this.evaluateLogicalCondition(condition as LogicalCondition, request);
      } else {
        return this.evaluateComparisonCondition(condition as ComparisonCondition, request);
      }
    }

    if ('function' in condition) {
      return this.evaluateFunctionCondition(condition as FunctionCondition, request);
    }

    throw EvaluationError.invalidCondition(condition);
  }

  /**
   * Evaluate logical condition (and, or, not)
   */
  private async evaluateLogicalCondition(
    condition: LogicalCondition,
    request: ABACRequest
  ): Promise<boolean> {
    const { operator, conditions } = condition;

    switch (operator) {
      case LogicalOperator.And:
        for (const subCondition of conditions) {
          if (!(await this.evaluateCondition(subCondition, request))) {
            return false;
          }
        }
        return true;

      case LogicalOperator.Or:
        for (const subCondition of conditions) {
          if (await this.evaluateCondition(subCondition, request)) {
            return true;
          }
        }
        return false;

      case LogicalOperator.Not:
        if (conditions.length !== 1) {
          throw EvaluationError.invalidOperatorArity(operator, 1, conditions.length);
        }
        if (!conditions[0]) {
          throw EvaluationError.invalidOperatorArity(operator, 'exactly one valid condition', 0);
        }
        return !(await this.evaluateCondition(conditions[0], request));
      default:
        throw EvaluationError.unknownOperator(operator);
    }
  }

  /**
   * Evaluate comparison condition
   */
  private async evaluateComparisonCondition(
    condition: ComparisonCondition,
    request: ABACRequest
  ): Promise<boolean> {
    const { operator, left, right } = condition;

    // For Exists and NotExists operators, we need to check the raw attribute value
    // without the default empty string conversion
    if (operator === ComparisonOperator.Exists || operator === ComparisonOperator.NotExists) {
      let rawValue: AttributeValue | undefined;

      if (
        typeof left === 'object' &&
        left !== null &&
        'category' in left &&
        'attributeId' in left
      ) {
        const ref = left as AttributeReference;
        rawValue = this.attributeResolver.getAttributeValue(
          request,
          ref.category,
          ref.attributeId,
          ref.path
        );
      } else {
        rawValue = left as AttributeValue;
      }

      if (operator === ComparisonOperator.Exists) {
        return rawValue !== undefined && rawValue !== null;
      } else {
        return rawValue === undefined || rawValue === null;
      }
    }

    const leftValue = await this.resolveValue(left, request);
    const rightValue = right ? await this.resolveValue(right, request) : undefined;

    switch (operator) {
      case ComparisonOperator.Equals:
        return leftValue === rightValue;
      case ComparisonOperator.NotEquals:
        return leftValue !== rightValue;
      case ComparisonOperator.GreaterThan:
        return Number(leftValue) > Number(rightValue);
      case ComparisonOperator.GreaterThanOrEqual:
        return Number(leftValue) >= Number(rightValue);
      case ComparisonOperator.LessThan:
        return Number(leftValue) < Number(rightValue);
      case ComparisonOperator.LessThanOrEqual:
        return Number(leftValue) <= Number(rightValue);
      case ComparisonOperator.In:
        return Array.isArray(rightValue) && (rightValue as unknown[]).includes(leftValue);
      case ComparisonOperator.NotIn:
        return Array.isArray(rightValue) && !(rightValue as unknown[]).includes(leftValue);
      case ComparisonOperator.Contains:
        return String(leftValue).includes(String(rightValue));
      case ComparisonOperator.StartsWith:
        return String(leftValue).startsWith(String(rightValue));
      case ComparisonOperator.EndsWith:
        return String(leftValue).endsWith(String(rightValue));
      case ComparisonOperator.MatchesRegex:
        return new RegExp(String(rightValue)).test(String(leftValue));
      default:
        return false;
    }
  }

  /**
   * Evaluate function condition
   */
  private async evaluateFunctionCondition(
    condition: FunctionCondition,
    request: ABACRequest
  ): Promise<boolean> {
    const func = this.functionRegistry.get(condition.function);
    if (!func) {
      throw EvaluationError.functionError(condition.function, 'Function not registered');
    }

    const resolvedArgs = await Promise.all(
      condition.args.map(arg => this.resolveValue(arg, request))
    );

    return func(resolvedArgs, request, this.attributeResolver.getProviders());
  }

  /**
   * Resolve a value (could be a literal value or attribute reference)
   */
  public async resolveValue(
    value: AttributeReference | AttributeValue | Condition,
    request: ABACRequest
  ): Promise<AttributeValue> {
    // If it's an attribute reference
    if (
      typeof value === 'object' &&
      value !== null &&
      'category' in value &&
      'attributeId' in value
    ) {
      const ref = value as AttributeReference;
      const attrValue = this.attributeResolver.getAttributeValue(
        request,
        ref.category,
        ref.attributeId,
        ref.path
      );
      // If attribute is not found, return empty string as default
      return attrValue !== undefined ? attrValue : '';
    }

    // If it's a condition, evaluate it
    if (
      typeof value === 'object' &&
      value !== null &&
      ('operator' in value || 'function' in value)
    ) {
      return this.evaluateCondition(value as Condition, request);
    }

    // Otherwise, it's a literal value
    return value as AttributeValue;
  }

  /**
   * Collect obligations from policy results
   */
  public collectObligations(results: PolicyResult[]): Obligation[] {
    const obligations: Obligation[] = [];
    for (const result of results) {
      if (result.obligations) {
        obligations.push(...result.obligations);
      }
    }
    return obligations;
  }

  /**
   * Collect advice from policy results
   */
  public collectAdvice(results: PolicyResult[]): Advice[] {
    const advice: Advice[] = [];
    for (const result of results) {
      if (result.advice) {
        advice.push(...result.advice);
      }
    }
    return advice;
  }
}
