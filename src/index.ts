/**
 * @abac-engine - True Attribute-Based Access Control Engine
 *
 * A complete ABAC implementation that makes authorization decisions based purely
 * on attributes without relying on predefined roles. This follows standard ABAC
 * architecture with proper separation of concerns.
 *
 * Key Components:
 * - Policy Decision Point (PDP): ABACEngine
 * - Policy Information Point (PIP): AttributeProviders
 * - Policy Administration Point (PAP): PolicyRepository
 * - Policy Enforcement Point (PEP): Middleware (separate implementation)
 *
 * @example
 * ```typescript
 * import { ABACEngine, PolicyBuilder, AttributeRef } from '@abac-engine/core';
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

// Core ABAC Engine and Types
export * from './abac';

// Logger interface and implementations
export { ConsoleLogger, createLogger, ILogger, LogLevel, SilentLogger } from './logger';

// Re-export commonly used types for convenience
export type {
  ABACDecision,
  Action,
  Advice,
  AttributeProvider,
  Condition,
  ABACEngineConfig as EngineConfig,
  Environment,
  Obligation,
  ABACPolicy as Policy,
  PolicyTarget,
  ABACRequest as Request,
  Resource,
  Subject
} from './abac/types';

// Re-export enums as values
export {
  AttributeCategory,
  AttributeDataType,
  CombiningAlgorithm,
  ComparisonOperator,
  Decision,
  Effect,
  LogicalOperator
} from './abac/types';

// Main engine as default export and named export
export { ABACEngine, ABACEngine as default, ABACEngine as Engine } from './abac/engine';

// Policy validation utilities
export {
  validatePolicies,
  validatePolicy,
  validatePolicyOrThrow,
  type PolicyValidationError,
  type PolicyValidationResult,
  type PolicyValidationWarning
} from './abac/policyValidator';

// Policy loader utilities (optional helpers)
export {
  filterPoliciesByTarget,
  groupPoliciesByEffect,
  loadAndValidatePoliciesFromFile,
  loadPoliciesFromFile,
  loadPoliciesFromJSON,
  PolicyCache,
  prismaAdapter
} from './abac/policyLoaders';

/**
 * Package version and metadata
 */
export const VERSION = '2.0.0';
export const ENGINE_TYPE = 'ABAC';
export const SUPPORTED_POLICY_VERSIONS = ['1.0.0', '2.0.0'];

/**
 * Quick start helpers for common ABAC scenarios
 */
export const QuickStart = {
  /**
   * Create a basic ABAC engine with in-memory providers
   */
  createBasicEngine() {
    const { ABACEngine, EnvironmentAttributeProvider } = require('./abac');

    return new ABACEngine({
      combiningAlgorithm: 'deny-overrides',
      attributeProviders: [new EnvironmentAttributeProvider()],
      enableAuditLog: true,
      enablePerformanceMetrics: true
    });
  },

  /**
   * Create an ABAC engine optimized for document management
   */
  createDocumentEngine() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      ABACEngine,
      InMemoryAttributeProvider,
      EnvironmentAttributeProvider
    } = require('./abac');

    const subjectProvider = new InMemoryAttributeProvider('subject', 'users');
    const resourceProvider = new InMemoryAttributeProvider('resource', 'documents');
    const environmentProvider = new EnvironmentAttributeProvider();

    const engine = new ABACEngine({
      combiningAlgorithm: 'deny-overrides',
      attributeProviders: [subjectProvider, resourceProvider, environmentProvider],
      enableAuditLog: true,
      enablePerformanceMetrics: true
    });

    // Register common document-related functions
    engine.registerFunction('is_business_hours', () => {
      const hour = new Date().getHours();
      return hour >= 9 && hour <= 17;
    });

    engine.registerFunction('is_owner', (_args: unknown, request: unknown) => {
      const req = request as {
        subject: { id: string };
        resource: { attributes: { owner: string } };
      };
      const subjectId = req.subject.id;
      const resourceOwner = req.resource.attributes.owner;
      return subjectId === resourceOwner;
    });

    return engine;
  },

  /**
   * Create an ABAC engine for multi-tenant applications
   */
  createMultiTenantEngine() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      ABACEngine,
      InMemoryAttributeProvider,
      EnvironmentAttributeProvider
    } = require('./abac');

    const subjectProvider = new InMemoryAttributeProvider('subject', 'users');
    const resourceProvider = new InMemoryAttributeProvider('resource', 'resources');
    const environmentProvider = new EnvironmentAttributeProvider();

    const engine = new ABACEngine({
      combiningAlgorithm: 'deny-overrides',
      attributeProviders: [subjectProvider, resourceProvider, environmentProvider],
      enableAuditLog: true,
      enablePerformanceMetrics: true
    });

    // Register tenant isolation functions
    engine.registerFunction('same_tenant', (_args: unknown, request: unknown) => {
      const req = request as {
        subject: { attributes: { tenantId: string } };
        resource: { attributes: { tenantId: string } };
      };
      const subjectTenant = req.subject.attributes.tenantId;
      const resourceTenant = req.resource.attributes.tenantId;
      return subjectTenant === resourceTenant;
    });

    return engine;
  }
};

/**
 * Common ABAC patterns and utilities
 */
export const ABACPatterns = {
  /**
   * Common attribute references
   */
  Attributes: {
    subject: {
      id: { category: 'subject' as const, attributeId: 'id' },
      department: { category: 'subject' as const, attributeId: 'department' },
      clearanceLevel: { category: 'subject' as const, attributeId: 'clearanceLevel' },
      role: { category: 'subject' as const, attributeId: 'role' },
      tenantId: { category: 'subject' as const, attributeId: 'tenantId' }
    },
    resource: {
      id: { category: 'resource' as const, attributeId: 'id' },
      type: { category: 'resource' as const, attributeId: 'type' },
      owner: { category: 'resource' as const, attributeId: 'owner' },
      department: { category: 'resource' as const, attributeId: 'department' },
      classification: { category: 'resource' as const, attributeId: 'classification' },
      sensitivity: { category: 'resource' as const, attributeId: 'sensitivity' },
      status: { category: 'resource' as const, attributeId: 'status' },
      tenantId: { category: 'resource' as const, attributeId: 'tenantId' }
    },
    action: {
      id: { category: 'action' as const, attributeId: 'id' },
      type: { category: 'action' as const, attributeId: 'type' }
    },
    environment: {
      currentTime: { category: 'environment' as const, attributeId: 'currentTime' },
      ipAddress: { category: 'environment' as const, attributeId: 'ipAddress' },
      location: { category: 'environment' as const, attributeId: 'location' },
      userAgent: { category: 'environment' as const, attributeId: 'userAgent' },
      sessionId: { category: 'environment' as const, attributeId: 'sessionId' }
    }
  },

  /**
   * Common condition builders
   */
  Conditions: {
    /**
     * User owns the resource
     */
    ownership: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConditionBuilder, AttributeRef } = require('./abac');
      return ConditionBuilder.equals(AttributeRef.subject('id'), AttributeRef.resource('owner'));
    },

    /**
     * Same department access
     */
    sameDepartment: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConditionBuilder, AttributeRef } = require('./abac');
      return ConditionBuilder.equals(
        AttributeRef.subject('department'),
        AttributeRef.resource('department')
      );
    },

    /**
     * Sufficient clearance level
     */
    sufficientClearance: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConditionBuilder, AttributeRef } = require('./abac');
      return ConditionBuilder.greaterThan(
        AttributeRef.subject('clearanceLevel'),
        AttributeRef.resource('classification')
      );
    },

    /**
     * Business hours only
     */
    businessHours: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConditionBuilder } = require('./abac');
      return ConditionBuilder.function('is_business_hours');
    },

    /**
     * Same tenant isolation
     */
    sameTenant: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConditionBuilder, AttributeRef } = require('./abac');
      return ConditionBuilder.equals(
        AttributeRef.subject('tenantId'),
        AttributeRef.resource('tenantId')
      );
    }
  }
};

/**
 * Validation utilities
 */
export const Validation = {
  /**
   * Check if a policy is valid ABAC format
   */
  isValidABACPolicy(policy: unknown): boolean {
    if (!policy || typeof policy !== 'object') {
      return false;
    }
    const p = policy as Record<string, unknown>;
    return (
      typeof p.id === 'string' &&
      typeof p.version === 'string' &&
      ['Permit', 'Deny'].includes(p.effect as string) &&
      (!p.condition || typeof p.condition === 'object')
    );
  },

  /**
   * Check if a request is valid ABAC format
   */
  isValidABACRequest(request: unknown): boolean {
    if (!request || typeof request !== 'object') {
      return false;
    }
    const r = request as Record<string, unknown>;
    const subject = r.subject as Record<string, unknown> | undefined;
    const resource = r.resource as Record<string, unknown> | undefined;
    const action = r.action as Record<string, unknown> | undefined;

    return (
      subject !== undefined &&
      typeof subject === 'object' &&
      typeof subject.id === 'string' &&
      resource !== undefined &&
      typeof resource === 'object' &&
      typeof resource.id === 'string' &&
      action !== undefined &&
      typeof action === 'object' &&
      typeof action.id === 'string'
    );
  }
};

/**
 * Migration utilities (if coming from RBAC systems)
 */
export const Migration = {
  /**
   * Convert role-based thinking to attribute-based
   */
  roleToAttributes(roleName: string): Record<string, unknown> {
    const roleAttributeMap: Record<string, Record<string, unknown>> = {
      admin: { role: 'admin', clearanceLevel: 10, permissions: ['*'] },
      manager: { role: 'manager', clearanceLevel: 5, canApprove: true },
      user: { role: 'user', clearanceLevel: 1, canApprove: false },
      guest: { role: 'guest', clearanceLevel: 0, permissions: ['read'] }
    };

    return roleAttributeMap[roleName] || { role: roleName };
  },

  /**
   * Suggest ABAC attributes based on common RBAC roles
   */
  suggestAttributes(context: 'healthcare' | 'finance' | 'government' | 'corporate'): string[] {
    const suggestions = {
      healthcare: [
        'medicalLicense',
        'department',
        'clearanceLevel',
        'patientRelationship',
        'specialization',
        'yearsExperience',
        'shiftType'
      ],
      finance: [
        'tradingLicense',
        'riskLevel',
        'approvalLimit',
        'region',
        'clientType',
        'complianceTraining',
        'auditStatus'
      ],
      government: [
        'securityClearance',
        'agency',
        'classification',
        'needToKnow',
        'citizenship',
        'backgroundCheck',
        'project'
      ],
      corporate: [
        'department',
        'level',
        'manager',
        'project',
        'office',
        'contractType',
        'skillLevel',
        'certifications'
      ]
    };

    return suggestions[context] || suggestions.corporate;
  }
};
