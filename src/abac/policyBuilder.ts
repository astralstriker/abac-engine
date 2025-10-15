/**
 * ABAC Policy Builder
 *
 * Provides a fluent API for building ABAC policies programmatically.
 * This makes it easier to construct complex policies with proper type safety.
 /**
  * Policy Builder for creating ABAC policies with a fluent API
  */

import { ValidationError } from './errors';
import {
  ABACPolicy,
  Advice,
  AttributeReference,
  AttributeValue,
  ComparisonCondition,
  ComparisonOperator,
  Condition,
  Effect,
  FunctionCondition,
  LogicalCondition,
  LogicalOperator,
  Obligation,
  PolicyTarget
} from './types';

/**
 * Builder for creating policy conditions
 */
export class ConditionBuilder {
  private condition: Condition;

  constructor(condition?: Condition) {
    this.condition =
      condition || ({ operator: 'equals', left: '', right: '' } as ComparisonCondition);
  }

  /**
   * Create a comparison condition
   */
  static compare(
    left: AttributeReference | AttributeValue,
    operator: ComparisonOperator,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return new ConditionBuilder({
      operator,
      left,
      right
    } as ComparisonCondition);
  }

  /**
   * Create an equals condition
   */
  static equals(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.Equals, right);
  }

  /**
   * Create a not equals condition
   */
  static notEquals(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.NotEquals, right);
  }

  /**
   * Create a greater than condition
   */
  static greaterThan(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.GreaterThan, right);
  }

  /**
   * Create a less than condition
   */
  static lessThan(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.LessThan, right);
  }

  /**
   * Create a greater than or equal condition
   */
  static greaterThanOrEqual(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.GreaterThanOrEqual, right);
  }

  /**
   * Create a less than or equal condition
   */
  static lessThanOrEqual(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.LessThanOrEqual, right);
  }

  /**
   * Create an 'in' condition
   */
  static in(left: AttributeReference | AttributeValue, right: AttributeValue[]): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.In, right as AttributeValue);
  }

  /**
   * Create a 'contains' condition
   */
  static contains(
    left: AttributeReference | AttributeValue,
    right: AttributeReference | AttributeValue
  ): ConditionBuilder {
    return ConditionBuilder.compare(left, ComparisonOperator.Contains, right);
  }

  /**
   * Create an 'exists' condition
   */
  static exists(attribute: AttributeReference): ConditionBuilder {
    return ConditionBuilder.compare(attribute, ComparisonOperator.Exists, true);
  }

  /**
   * Create a function condition
   */
  static function(
    functionName: string,
    ...args: (AttributeReference | AttributeValue | Condition)[]
  ): ConditionBuilder {
    return new ConditionBuilder({
      function: functionName,
      args
    } as FunctionCondition);
  }

  /**
   * Combine with AND logic
   */
  and(...conditions: (ConditionBuilder | Condition)[]): ConditionBuilder {
    const allConditions = [
      this.condition,
      ...conditions.map(c => (c instanceof ConditionBuilder ? c.build() : c))
    ];

    return new ConditionBuilder({
      operator: LogicalOperator.And,
      conditions: allConditions
    } as LogicalCondition);
  }

  /**
   * Combine with OR logic
   */
  or(...conditions: (ConditionBuilder | Condition)[]): ConditionBuilder {
    const allConditions = [
      this.condition,
      ...conditions.map(c => (c instanceof ConditionBuilder ? c.build() : c))
    ];

    return new ConditionBuilder({
      operator: LogicalOperator.Or,
      conditions: allConditions
    } as LogicalCondition);
  }

  /**
   * Negate the condition
   */
  not(): ConditionBuilder {
    return new ConditionBuilder({
      operator: LogicalOperator.Not,
      conditions: [this.condition]
    } as LogicalCondition);
  }

  /**
   * Build the final condition
   */
  build(): Condition {
    return this.condition;
  }
}

/**
 * Builder for creating policy targets
 */
export class TargetBuilder {
  private target: PolicyTarget = {};

  /**
   * Set subject target condition
   */
  subject(condition: ConditionBuilder | Condition): TargetBuilder {
    this.target.subject = condition instanceof ConditionBuilder ? condition.build() : condition;
    return this;
  }

  /**
   * Set resource target condition
   */
  resource(condition: ConditionBuilder | Condition): TargetBuilder {
    this.target.resource = condition instanceof ConditionBuilder ? condition.build() : condition;
    return this;
  }

  /**
   * Set action target condition
   */
  action(condition: ConditionBuilder | Condition): TargetBuilder {
    this.target.action = condition instanceof ConditionBuilder ? condition.build() : condition;
    return this;
  }

  /**
   * Set environment target condition
   */
  environment(condition: ConditionBuilder | Condition): TargetBuilder {
    this.target.environment = condition instanceof ConditionBuilder ? condition.build() : condition;
    return this;
  }

  /**
   * Build the final target
   */
  build(): PolicyTarget {
    return this.target;
  }
}

/**
 * Main policy builder class
 */
export class PolicyBuilder {
  private policy: Partial<ABACPolicy> = {
    obligations: [],
    advice: []
  };

  constructor(id?: string) {
    if (id) {
      this.policy.id = id;
    }
  }

  /**
   * Create a new policy builder
   */
  static create(id?: string): PolicyBuilder {
    return new PolicyBuilder(id);
  }

  /**
   * Set policy ID
   */
  id(id: string): PolicyBuilder {
    this.policy.id = id;
    return this;
  }

  /**
   * Set policy version
   */
  version(version: string): PolicyBuilder {
    this.policy.version = version;
    return this;
  }

  /**
   * Set policy description
   */
  description(description: string): PolicyBuilder {
    this.policy.description = description;
    return this;
  }

  /**
   * Set policy effect
   */
  effect(effect: Effect): PolicyBuilder {
    this.policy.effect = effect;
    return this;
  }

  /**
   * Permit access
   */
  permit(): PolicyBuilder {
    return this.effect(Effect.Permit);
  }

  /**
   * Deny access
   */
  deny(): PolicyBuilder {
    return this.effect(Effect.Deny);
  }

  /**
   * Set policy target
   */
  target(target: TargetBuilder | PolicyTarget): PolicyBuilder {
    this.policy.target = target instanceof TargetBuilder ? target.build() : target;
    return this;
  }

  /**
   * Set policy condition
   */
  condition(condition: ConditionBuilder | Condition): PolicyBuilder {
    this.policy.condition = condition instanceof ConditionBuilder ? condition.build() : condition;
    return this;
  }

  /**
   * Set policy priority
   */
  priority(priority: number): PolicyBuilder {
    this.policy.priority = priority;
    return this;
  }

  /**
   * Add an obligation
   */
  obligation(obligation: Obligation): PolicyBuilder {
    if (!this.policy.obligations) {
      this.policy.obligations = [];
    }
    this.policy.obligations.push(obligation);
    return this;
  }

  /**
   * Add a logging obligation
   */
  logObligation(parameters?: Record<string, AttributeValue>): PolicyBuilder {
    return this.obligation({
      id: `log_${Date.now()}`,
      type: 'log',
      parameters: parameters ?? undefined
    });
  }

  /**
   * Add a notification obligation
   */
  notifyObligation(parameters?: Record<string, AttributeValue>): PolicyBuilder {
    return this.obligation({
      id: `notify_${Date.now()}`,
      type: 'notify',
      parameters: parameters ?? undefined
    });
  }

  /**
   * Add advice
   */
  advice(advice: Advice): PolicyBuilder {
    if (!this.policy.advice) {
      this.policy.advice = [];
    }
    this.policy.advice.push(advice);
    return this;
  }

  /**
   * Add warning advice
   */
  warning(parameters?: Record<string, AttributeValue>): PolicyBuilder {
    return this.advice({
      id: `warning_${Date.now()}`,
      type: 'warning',
      parameters: parameters ?? undefined
    });
  }

  /**
   * Set metadata
   */
  metadata(metadata: ABACPolicy['metadata']): PolicyBuilder {
    this.policy.metadata = metadata ?? undefined;
    return this;
  }

  /**
   * Add tags
   */
  tags(...tags: string[]): PolicyBuilder {
    if (!this.policy.metadata) {
      this.policy.metadata = {};
    }
    if (!this.policy.metadata.tags) {
      this.policy.metadata.tags = [];
    }
    this.policy.metadata.tags.push(...tags);
    return this;
  }

  /**
   * Build the final policy
   */
  build(): ABACPolicy {
    if (!this.policy.id) {
      throw new ValidationError('Policy ID is required', [
        { field: 'id', message: 'Policy ID is required' }
      ]);
    }
    if (!this.policy.version) {
      this.policy.version = '1.0.0';
    }
    if (!this.policy.effect) {
      throw new ValidationError('Policy effect is required', [
        { field: 'effect', message: 'Policy effect is required' }
      ]);
    }

    return this.policy as ABACPolicy;
  }
}

/**
 * Utility functions for creating attribute references
 */
export class AttributeRef {
  /**
   * Create a subject attribute reference
   */
  static subject(attributeId: string, path?: string): AttributeReference {
    return {
      category: 'subject',
      attributeId,
      path: path ?? undefined
    };
  }

  /**
   * Create a resource attribute reference
   */
  static resource(attributeId: string, path?: string): AttributeReference {
    return {
      category: 'resource',
      attributeId,
      path: path ?? undefined
    };
  }

  /**
   * Create an action attribute reference
   */
  static action(attributeId: string, path?: string): AttributeReference {
    return {
      category: 'action',
      attributeId,
      path: path ?? undefined
    };
  }

  /**
   * Create an environment attribute reference
   */
  static environment(attributeId: string, path?: string): AttributeReference {
    return {
      category: 'environment',
      attributeId,
      path: path ?? undefined
    };
  }
}

/**
 * Common attribute references for convenience
 */
export const Attributes = {
  // Subject attributes
  subject: {
    id: AttributeRef.subject('id'),
    userId: AttributeRef.subject('userId'),
    username: AttributeRef.subject('username'),
    email: AttributeRef.subject('email'),
    roles: AttributeRef.subject('roles'),
    department: AttributeRef.subject('department'),
    clearanceLevel: AttributeRef.subject('clearanceLevel'),
    groups: AttributeRef.subject('groups'),
    employeeType: AttributeRef.subject('employeeType')
  },

  // Resource attributes
  resource: {
    id: AttributeRef.resource('id'),
    type: AttributeRef.resource('type'),
    owner: AttributeRef.resource('owner'),
    classification: AttributeRef.resource('classification'),
    department: AttributeRef.resource('department'),
    sensitivity: AttributeRef.resource('sensitivity'),
    status: AttributeRef.resource('status'),
    createdAt: AttributeRef.resource('createdAt'),
    modifiedAt: AttributeRef.resource('modifiedAt')
  },

  // Action attributes
  action: {
    id: AttributeRef.action('id'),
    type: AttributeRef.action('type')
  },

  // Environment attributes
  environment: {
    currentTime: AttributeRef.environment('currentTime'),
    ipAddress: AttributeRef.environment('ipAddress'),
    userAgent: AttributeRef.environment('userAgent'),
    location: AttributeRef.environment('location'),
    sessionId: AttributeRef.environment('sessionId')
  }
};

/**
 * Example usage and common policy patterns
 */
export class PolicyPatterns {
  /**
   * Create a simple ownership policy
   */
  static ownership(actions: string[]): ABACPolicy {
    return PolicyBuilder.create('ownership-policy')
      .version('1.0.0')
      .description('Users can only access resources they own')
      .permit()
      .target(new TargetBuilder().action(ConditionBuilder.in(Attributes.action.id, actions)))
      .condition(ConditionBuilder.equals(Attributes.subject.id, Attributes.resource.owner))
      .build();
  }

  /**
   * Create a department access policy
   */
  static departmentAccess(actions: string[], allowedSensitivity: string[]): ABACPolicy {
    return PolicyBuilder.create('department-access-policy')
      .version('1.0.0')
      .description('Users can access resources from their department with appropriate sensitivity')
      .permit()
      .target(new TargetBuilder().action(ConditionBuilder.in(Attributes.action.id, actions)))
      .condition(
        ConditionBuilder.equals(Attributes.subject.department, Attributes.resource.department).and(
          ConditionBuilder.in(Attributes.resource.sensitivity, allowedSensitivity)
        )
      )
      .build();
  }

  /**
   * Create a time-based access policy
   */
  static businessHoursOnly(actions: string[]): ABACPolicy {
    return PolicyBuilder.create('business-hours-policy')
      .version('1.0.0')
      .description('Access only allowed during business hours')
      .permit()
      .target(new TargetBuilder().action(ConditionBuilder.in(Attributes.action.id, actions)))
      .condition(ConditionBuilder.function('is_business_hours', Attributes.environment.currentTime))
      .build();
  }

  /**
   * Create a clearance-based access policy
   */
  static clearanceLevel(actions: string[]): ABACPolicy {
    return PolicyBuilder.create('clearance-policy')
      .version('1.0.0')
      .description('Users can only access resources within their clearance level')
      .permit()
      .target(new TargetBuilder().action(ConditionBuilder.in(Attributes.action.id, actions)))
      .condition(
        ConditionBuilder.greaterThan(
          Attributes.subject.clearanceLevel,
          Attributes.resource.classification
        )
      )
      .logObligation({ reason: 'clearance_access' })
      .build();
  }

  /**
   * Create an emergency access policy
   */
  static emergencyAccess(): ABACPolicy {
    return PolicyBuilder.create('emergency-access-policy')
      .version('1.0.0')
      .description('Emergency access overrides normal restrictions')
      .permit()
      .condition(ConditionBuilder.function('is_emergency_mode'))
      .priority(1000) // High priority
      .logObligation({ reason: 'emergency_access' })
      .notifyObligation({ recipients: ['security-team@company.com'] })
      .warning({ message: 'Emergency access granted' })
      .build();
  }
}
