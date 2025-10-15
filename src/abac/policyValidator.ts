/**
 * ABAC Policy Validation Utilities
 *
 * Standalone validation functions for ABAC policies.
 * These utilities help ensure policies are well-formed before evaluation.
 */

import { ValidationError } from './errors';
import { ABACPolicy, ComparisonOperator, Condition, LogicalOperator } from './types';

export interface PolicyValidationError {
  type: 'syntax' | 'semantic' | 'reference';
  message: string;
  path: string;
  policyId: string;
}

export interface PolicyValidationWarning {
  type: 'unused' | 'unreachable' | 'performance' | 'best-practice';
  message: string;
  path: string;
  policyId: string;
}

export interface PolicyValidationResult {
  valid: boolean;
  errors: PolicyValidationError[];
  warnings: PolicyValidationWarning[];
  policyId: string;
}

/**
 * Validate a single ABAC policy
 */
export function validatePolicy(policy: ABACPolicy): PolicyValidationResult {
  const errors: PolicyValidationError[] = [];
  const warnings: PolicyValidationWarning[] = [];

  // Validate required fields
  if (!policy.id || typeof policy.id !== 'string') {
    errors.push({
      type: 'syntax',
      message: 'Policy must have a valid id',
      path: 'id',
      policyId: policy.id || 'unknown'
    });
  }

  if (!policy.version || typeof policy.version !== 'string') {
    errors.push({
      type: 'syntax',
      message: 'Policy must have a valid version',
      path: 'version',
      policyId: policy.id
    });
  }

  if (!policy.effect || !['Permit', 'Deny'].includes(policy.effect)) {
    errors.push({
      type: 'syntax',
      message: 'Policy effect must be either "Permit" or "Deny"',
      path: 'effect',
      policyId: policy.id
    });
  }

  // Validate condition if present
  if (policy.condition) {
    validateCondition(policy, policy.condition, errors, warnings, 'condition');
  }

  // Validate obligations if present
  if (policy.obligations) {
    validateObligations(policy, errors, warnings);
  }

  // Validate advice if present
  if (policy.advice) {
    validateAdvice(policy, errors, warnings);
  }

  // Performance warnings
  checkPerformanceWarnings(policy, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    policyId: policy.id
  };
}

/**
 * Validate multiple policies
 */
export function validatePolicies(policies: ABACPolicy[]): PolicyValidationResult[] {
  return policies.map(policy => validatePolicy(policy));
}

/**
 * Validate and throw on first error
 */
export function validatePolicyOrThrow(policy: ABACPolicy): void {
  const result = validatePolicy(policy);
  if (!result.valid) {
    const validationErrors = result.errors.map(e => ({
      path: e.path,
      message: e.message
    }));

    throw ValidationError.fromValidationResult(policy.id, validationErrors);
  }
}

/**
 * Validate condition recursively
 */
function validateCondition(
  policy: ABACPolicy,
  condition: Condition,
  errors: PolicyValidationError[],
  warnings: PolicyValidationWarning[],
  path: string = 'condition'
): void {
  if (!condition || typeof condition !== 'object') {
    errors.push({
      type: 'syntax',
      message: `Invalid condition format at ${path}`,
      path,
      policyId: policy.id
    });
    return;
  }

  const cond = condition as unknown as Record<string, unknown>;

  // Check for function condition
  if ('function' in cond) {
    validateFunctionCondition(policy, cond, errors, warnings, path);
    return;
  }

  // Must have operator
  if (!cond.operator || typeof cond.operator !== 'string') {
    errors.push({
      type: 'syntax',
      message: `Missing operator in condition at ${path}`,
      path,
      policyId: policy.id
    });
    return;
  }

  const validComparisonOperators = Object.values(ComparisonOperator);
  const validLogicalOperators = Object.values(LogicalOperator);

  if (validLogicalOperators.includes(cond.operator as LogicalOperator)) {
    // Logical condition
    if (!cond.conditions || !Array.isArray(cond.conditions)) {
      errors.push({
        type: 'syntax',
        message: `Logical operator ${cond.operator} requires conditions array at ${path}`,
        path,
        policyId: policy.id
      });
      return;
    }

    if (cond.operator === LogicalOperator.Not && cond.conditions.length !== 1) {
      errors.push({
        type: 'syntax',
        message: `NOT operator must have exactly one condition at ${path}`,
        path,
        policyId: policy.id
      });
    }

    // Recursively validate sub-conditions
    cond.conditions.forEach((subCondition: unknown, index: number) => {
      validateCondition(
        policy,
        subCondition as Condition,
        errors,
        warnings,
        `${path}.conditions[${index}]`
      );
    });
  } else if (validComparisonOperators.includes(cond.operator as ComparisonOperator)) {
    // Comparison condition
    if (cond.left === undefined) {
      errors.push({
        type: 'syntax',
        message: `Missing left operand in comparison at ${path}`,
        path,
        policyId: policy.id
      });
    }

    // Check for required right operand (except for exists/not_exists)
    const noRightOperators = [ComparisonOperator.Exists, ComparisonOperator.NotExists];
    if (
      cond.right === undefined &&
      !noRightOperators.includes(cond.operator as ComparisonOperator)
    ) {
      errors.push({
        type: 'syntax',
        message: `Missing right operand in comparison at ${path}`,
        path,
        policyId: policy.id
      });
    }

    // Validate attribute references
    if (cond.left) {
      validateAttributeReference(policy, cond.left, errors, warnings, `${path}.left`);
    }
    if (cond.right) {
      validateAttributeReference(policy, cond.right, errors, warnings, `${path}.right`);
    }
  } else {
    errors.push({
      type: 'syntax',
      message: `Unknown operator: ${cond.operator} at ${path}`,
      path,
      policyId: policy.id
    });
  }
}

/**
 * Validate function condition
 */
function validateFunctionCondition(
  policy: ABACPolicy,
  funcCond: Record<string, unknown>,
  errors: PolicyValidationError[],
  warnings: PolicyValidationWarning[],
  path: string
): void {
  if (!funcCond.function || typeof funcCond.function !== 'string') {
    errors.push({
      type: 'syntax',
      message: `Invalid function name at ${path}`,
      path,
      policyId: policy.id
    });
    return;
  }

  if (!funcCond.args || !Array.isArray(funcCond.args)) {
    warnings.push({
      type: 'best-practice',
      message: `Function condition "${funcCond.function}" at ${path} has no arguments`,
      path,
      policyId: policy.id
    });
  }

  // Validate function arguments
  if (funcCond.args && Array.isArray(funcCond.args)) {
    funcCond.args.forEach((arg: unknown, index: number) => {
      if (typeof arg === 'object' && arg !== null) {
        if ('category' in arg && 'attributeId' in arg) {
          // Attribute reference
          validateAttributeReference(
            policy,
            arg as { category?: string; attributeId?: string },
            errors,
            warnings,
            `${path}.args[${index}]`
          );
        } else if ('operator' in arg || 'function' in arg) {
          // Nested condition
          validateCondition(policy, arg as Condition, errors, warnings, `${path}.args[${index}]`);
        }
      }
    });
  }
}

/**
 * Validate attribute reference
 */
function validateAttributeReference(
  policy: ABACPolicy,
  reference: unknown,
  errors: PolicyValidationError[],
  warnings: PolicyValidationWarning[],
  path: string
): void {
  if (typeof reference !== 'object' || reference === null) {
    return; // Literal value, not an attribute reference
  }

  const ref = reference as { category?: string; attributeId?: string };

  if ('category' in ref && 'attributeId' in ref) {
    const validCategories = ['subject', 'resource', 'action', 'environment'];

    if (!ref.category || !validCategories.includes(ref.category)) {
      errors.push({
        type: 'reference',
        message: `Invalid attribute category "${ref.category}" at ${path}`,
        path,
        policyId: policy.id
      });
    }

    if (!ref.attributeId || typeof ref.attributeId !== 'string') {
      errors.push({
        type: 'reference',
        message: `Invalid attributeId at ${path}`,
        path,
        policyId: policy.id
      });
    }
  }
}

/**
 * Validate obligations
 */
function validateObligations(
  policy: ABACPolicy,
  errors: PolicyValidationError[],
  warnings: PolicyValidationWarning[]
): void {
  if (!policy.obligations) return;

  policy.obligations.forEach((obligation, index) => {
    if (!obligation.id) {
      errors.push({
        type: 'syntax',
        message: `Obligation at index ${index} missing id`,
        path: `obligations[${index}]`,
        policyId: policy.id
      });
    }

    if (!obligation.parameters) {
      warnings.push({
        type: 'best-practice',
        message: `Obligation "${obligation.id}" has no parameters`,
        path: `obligations[${index}]`,
        policyId: policy.id
      });
    }
  });
}

/**
 * Validate advice
 */
function validateAdvice(
  policy: ABACPolicy,
  errors: PolicyValidationError[],
  warnings: PolicyValidationWarning[]
): void {
  if (!policy.advice) return;

  policy.advice.forEach((advice, index) => {
    if (!advice.id) {
      errors.push({
        type: 'syntax',
        message: `Advice at index ${index} missing id`,
        path: `advice[${index}]`,
        policyId: policy.id
      });
    }

    if (!advice.parameters) {
      warnings.push({
        type: 'best-practice',
        message: `Advice "${advice.id}" has no parameters`,
        path: `advice[${index}]`,
        policyId: policy.id
      });
    }
  });
}

/**
 * Check for performance issues
 */
function checkPerformanceWarnings(policy: ABACPolicy, warnings: PolicyValidationWarning[]): void {
  // Check for deeply nested conditions
  const maxDepth = getConditionDepth(policy.condition);
  if (maxDepth > 5) {
    warnings.push({
      type: 'performance',
      message: `Condition depth is ${maxDepth}, consider simplifying (max recommended: 5)`,
      path: 'condition',
      policyId: policy.id
    });
  }

  // Check for too many obligations
  if (policy.obligations && policy.obligations.length > 10) {
    warnings.push({
      type: 'performance',
      message: `Policy has ${policy.obligations.length} obligations, consider reducing`,
      path: 'obligations',
      policyId: policy.id
    });
  }
}

/**
 * Calculate condition nesting depth
 */
function getConditionDepth(condition: unknown, currentDepth: number = 0): number {
  if (!condition || typeof condition !== 'object') {
    return currentDepth;
  }

  if ('conditions' in condition && Array.isArray(condition.conditions)) {
    return Math.max(
      ...condition.conditions.map((c: unknown) => getConditionDepth(c, currentDepth + 1))
    );
  }

  return currentDepth;
}
