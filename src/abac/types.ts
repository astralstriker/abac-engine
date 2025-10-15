/**
 * True ABAC (Attribute-Based Access Control) Types and Interfaces
 *
 * This module defines the core types for a proper ABAC implementation
 * following standard ABAC architecture and XACML-inspired design.
 */

import { ILogger } from '../logger';

/**
 * Core ABAC decision values
 */
export enum Decision {
  Permit = 'Permit',
  Deny = 'Deny',
  NotApplicable = 'NotApplicable',
  Indeterminate = 'Indeterminate'
}

/**
 * Policy effect - the intended result if policy matches
 */
export enum Effect {
  Permit = 'Permit',
  Deny = 'Deny'
}

/**
 * Attribute data types
 */
export type AttributeValue = string | number | boolean | Date | string[] | number[] | boolean[];

/**
 * Attribute identifier with category and id
 */
export enum AttributeCategory {
  Subject = 'subject',
  Resource = 'resource',
  Action = 'action',
  Environment = 'environment'
}

export interface AttributeId {
  category: AttributeCategory;
  id: string;
}

/**
 * Attribute definition
 */
export enum AttributeDataType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date',
  Array = 'array'
}

export interface Attribute {
  id: AttributeId;
  value: AttributeValue;
  dataType: AttributeDataType;
  issuer?: string;
}

/**
 * Subject attributes (user/entity requesting access)
 */
export interface Subject {
  id: string;
  attributes: Record<string, AttributeValue>;
}

/**
 * Resource attributes (what is being accessed)
 */
export interface Resource {
  id: string;
  type: string;
  attributes: Record<string, AttributeValue>;
}

/**
 * Action attributes (what operation is being performed)
 */
export interface Action {
  id: string;
  attributes?: Record<string, AttributeValue>;
}

/**
 * Environment attributes (contextual information)
 */
export interface Environment {
  currentTime?: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  sessionId?: string;
  attributes?: Record<string, AttributeValue>;
}

/**
 * ABAC request containing all attributes for evaluation
 */
export interface ABACRequest {
  subject: Subject;
  resource: Resource;
  action: Action;
  environment?: Environment;
}

/**
 * Condition operators for policy expressions
 */
export enum ComparisonOperator {
  Equals = 'equals',
  NotEquals = 'not_equals',
  GreaterThan = 'greater_than',
  GreaterThanOrEqual = 'greater_than_or_equal',
  LessThan = 'less_than',
  LessThanOrEqual = 'less_than_or_equal',
  In = 'in',
  NotIn = 'not_in',
  Contains = 'contains',
  StartsWith = 'starts_with',
  EndsWith = 'ends_with',
  MatchesRegex = 'matches_regex',
  Exists = 'exists',
  NotExists = 'not_exists'
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  And = 'and',
  Or = 'or',
  Not = 'not'
}

/**
 * Function-based condition
 */
export interface FunctionCondition {
  function: string;
  args: (AttributeReference | AttributeValue | Condition)[];
}

/**
 * Comparison-based condition
 */
export interface ComparisonCondition {
  operator: ComparisonOperator;
  left: AttributeReference | AttributeValue;
  right: AttributeReference | AttributeValue;
}

/**
 * Logical condition combining multiple conditions
 */
export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: Condition[];
}

/**
 * Reference to an attribute in a condition
 */
export interface AttributeReference {
  category: 'subject' | 'resource' | 'action' | 'environment';
  attributeId: string;
  path?: string | undefined; // For nested attributes like "user.profile.department"
}

/**
 * Union type for all condition types
 */
export type Condition = ComparisonCondition | LogicalCondition | FunctionCondition;

/**
 * Target specification for when a policy applies
 */
export interface PolicyTarget {
  subject?: Condition;
  resource?: Condition;
  action?: Condition;
  environment?: Condition;
}

/**
 * Obligation - action that must be performed
 */
export interface Obligation {
  id: string;
  type: 'log' | 'notify' | 'transform' | 'custom';
  parameters?: Record<string, AttributeValue> | undefined;
}

/**
 * Advice - recommended action (non-binding)
 */
export interface Advice {
  id: string;
  type: 'warning' | 'info' | 'recommendation' | 'custom';
  parameters?: Record<string, AttributeValue> | undefined;
}

/**
 * ABAC Policy definition
 */
export interface ABACPolicy {
  id: string;
  version: string;
  description?: string;
  target?: PolicyTarget;
  condition?: Condition;
  effect: Effect;
  priority?: number;
  obligations?: Obligation[];
  advice?: Advice[];
  metadata?:
    | {
        createdBy?: string | undefined;
        createdAt?: Date | undefined;
        modifiedBy?: string | undefined;
        modifiedAt?: Date | undefined;
        tags?: string[] | undefined;
      }
    | undefined;
}

/**
 * Policy Set for grouping related policies
 */
export interface PolicySet {
  id: string;
  version: string;
  description?: string;
  target?: PolicyTarget;
  policies: (ABACPolicy | PolicySet)[];
  combiningAlgorithm: CombiningAlgorithm;
  obligations?: Obligation[];
  advice?: Advice[];
}

/**
 * Policy combining algorithms
 */
export enum CombiningAlgorithm {
  DenyOverrides = 'deny-overrides',
  PermitOverrides = 'permit-overrides',
  FirstApplicable = 'first-applicable',
  OnlyOneApplicable = 'only-one-applicable',
  DenyUnlessPermit = 'deny-unless-permit',
  PermitUnlessDeny = 'permit-unless-deny'
}

/**
 * Policy evaluation result
 */
export interface PolicyResult {
  decision: Decision;
  policy: ABACPolicy;
  obligations?: Obligation[];
  advice?: Advice[];
  reason?: string;
}

/**
 * Attribute context for providers
 */
export interface AttributeContext {
  request?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    method?: string;
    path?: string;
  };
  session?: {
    id: string;
    createdAt: number;
  };
  attributes?: Record<string, AttributeValue>;
}

/**
 * Database interface for repository and providers
 */
export interface DatabaseConnection {
  query(sql: string, params?: unknown[]): Promise<DatabaseRow[]>;
  execute(sql: string, params?: unknown[]): Promise<DatabaseExecuteResult>;
  close?(): Promise<void>;
}

export interface DatabaseRow {
  [key: string]: unknown;
}

export interface DatabaseExecuteResult {
  affectedRows?: number;
  insertId?: number;
}

/**
 * LDAP client interface
 */
export interface LdapClient {
  search(base: string, options: LdapSearchOptions): Promise<LdapSearchResult[]>;
  bind?(dn: string, password: string): Promise<void>;
  unbind?(): Promise<void>;
}

export interface LdapSearchOptions {
  filter?: string;
  scope?: 'base' | 'one' | 'sub';
  attributes?: string[];
}

export interface LdapSearchResult {
  dn: string;
  [key: string]: unknown;
}

/**
 * File watcher interface
 */
export interface FileWatcher {
  on(event: 'change', listener: (filename: string) => void): void;
  close(): void;
}

/**
 * Final authorization decision
 */
export interface ABACDecision {
  decision: Decision;
  obligations: Obligation[];
  advice: Advice[];
  matchedPolicies: ABACPolicy[];
  evaluationDetails?: {
    totalPolicies: number;
    applicablePolicies: number;
    evaluationTime: number;
    errors?: string[];
  };
}

/**
 * Attribute provider interface for dynamic attribute retrieval
 */
export interface AttributeProvider {
  category: 'subject' | 'resource' | 'environment';
  name: string;
  getAttributes(id: string, context?: AttributeContext): Promise<Record<string, AttributeValue>>;
  supportsAttribute(attributeId: string): boolean;
}

/**
 * Policy repository interface
 */

/**
 * Custom condition function signature
 */
export type ConditionFunction = (
  args: (AttributeValue | Condition)[],
  request: ABACRequest,
  attributeProvider?: AttributeProvider[]
) => boolean | Promise<boolean>;

/**
 * ABAC Engine configuration
 */
export interface ABACEngineConfig {
  combiningAlgorithm?: CombiningAlgorithm;
  attributeProviders?: AttributeProvider[];
  functionRegistry?: Map<string, ConditionFunction>;
  enableAuditLog?: boolean;
  enablePerformanceMetrics?: boolean;
  cacheResults?: boolean;
  cacheTTL?: number;
  maxEvaluationTime?: number;
  logger?: ILogger;
}

/**
 * Audit log entry for ABAC decisions
 */
export interface ABACAccessLog {
  timestamp: Date;
  requestId: string;
  subject: {
    id: string;
    attributes: Record<string, AttributeValue>;
  };
  resource: {
    id: string;
    type: string;
    attributes: Record<string, AttributeValue>;
  };
  action: {
    id: string;
    attributes?: Record<string, AttributeValue>;
  };
  environment?: {
    attributes?: Record<string, AttributeValue>;
  };
  decision: Decision;
  matchedPolicies: string[];
  obligations: Obligation[];
  evaluationTime: number;
  errors?: string[] | undefined;
}

/**
 * Performance metrics for policy evaluation
 */
export interface EvaluationMetrics {
  totalRequests: number;
  averageEvaluationTime: number;
  policyHitRate: Record<string, number>;
  decisionDistribution: Record<Decision, number>;
  errorRate: number;
}
