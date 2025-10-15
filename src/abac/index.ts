/**
 * ABAC (Attribute-Based Access Control) Module
 *
 * This module provides a complete, true ABAC implementation following standard
 * ABAC architecture principles. Unlike role-based access control (RBAC), this
 * system makes authorization decisions based on attributes of the subject,
 * resource, action, and environment.
 *
 * Key Components:
 * - Policy Decision Point (PDP): ABACEngine
 * - Policy Information Point (PIP): AttributeProviders
 * - Policy Administration Point (PAP): PolicyRepository
 * - Policy Enforcement Point (PEP): Middleware (separate module)
 *
 * @example
 * ```typescript
 * import { ABACEngine, PolicyBuilder, AttributeRef } from './abac';
 *
 * // Create a true ABAC policy (no roles required)
 * const policy = PolicyBuilder.create('document-access')
 *   .permit()
 *   .condition(
 *     ConditionBuilder.equals(AttributeRef.subject('department'), AttributeRef.resource('department'))
 *       .and(ConditionBuilder.greaterThan(AttributeRef.subject('clearanceLevel'), AttributeRef.resource('classification')))
 *   )
 *   .build();
 *
 * // Evaluate access based on attributes
 * const decision = await engine.evaluate(request, [policy]);
 * ```
 */

// Core types
export * from './types';

// Main ABAC engine (Policy Decision Point)
export { ABACEngine } from './engine';

// Policy building utilities
export {
  AttributeRef,
  Attributes,
  ConditionBuilder,
  PolicyBuilder,
  PolicyPatterns,
  TargetBuilder
} from './policyBuilder';

// Attribute providers (Policy Information Point)
export {
  BaseAttributeProvider,
  CachedAttributeProvider,
  CompositeAttributeProvider,
  DatabaseAttributeProvider,
  EnvironmentAttributeProvider,
  InMemoryAttributeProvider,
  LdapAttributeProvider,
  RestApiAttributeProvider
} from './attributeProviders';

// Policy validation utilities
export {
  validatePolicies,
  validatePolicy,
  validatePolicyOrThrow,
  type PolicyValidationError,
  type PolicyValidationResult,
  type PolicyValidationWarning
} from './policyValidator';

// Policy loader utilities (optional helpers)
export {
  filterPoliciesByTarget,
  groupPoliciesByEffect,
  loadAndValidatePoliciesFromFile,
  loadPoliciesFromFile,
  loadPoliciesFromJSON,
  PolicyCache,
  prismaAdapter
} from './policyLoaders';

// Services (Support services for cross-cutting concerns)
export {
  AuditService,
  FunctionRegistry,
  MetricsCollector,
  type AuditServiceConfig
} from './services';

// Combining algorithms (Strategy pattern for policy result combination)
export {
  CombiningAlgorithmFactory,
  DenyOverridesAlgorithm,
  DenyUnlessPermitAlgorithm,
  FirstApplicableAlgorithm,
  ICombiningAlgorithm,
  OnlyOneApplicableAlgorithm,
  PermitOverridesAlgorithm,
  PermitUnlessDenyAlgorithm
} from './combining';

// Evaluation components (For advanced use cases)
export { AttributeResolver, PolicyEvaluator } from './evaluation';

// Error classes (For error handling and custom error types)
export {
  ABACError,
  AttributeResolutionError,
  CombiningAlgorithmError,
  ConfigurationError,
  EvaluationError,
  formatErrorForUser,
  getErrorMessage,
  isABACError,
  PolicyNotFoundError,
  PolicyStorageError,
  RequestValidationError,
  ValidationError,
  wrapError
} from './errors';

// Re-export commonly used types for convenience
export type {
  ABACDecision,
  ABACEngineConfig,
  ABACPolicy,
  ABACRequest,
  Action,
  Advice,
  AttributeProvider,
  Condition,
  Environment,
  Obligation,
  PolicyTarget,
  Resource,
  Subject
} from './types';

// Re-export enums as values
export {
  AttributeCategory,
  AttributeDataType,
  CombiningAlgorithm,
  ComparisonOperator,
  Decision,
  Effect,
  LogicalOperator
} from './types';
