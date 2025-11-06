/**
 * ABAC Policy Loader Utilities
 *
 * Optional helper functions for loading and saving policies from common sources.
 * These are convenience utilities - users can load/save policies however they want.
 */

import { PolicyStorageError, ValidationError } from './errors';
import { PolicyValidationResult, validatePolicy } from './policyValidator';
import { ABACPolicy } from './types';

/**
 * Export a single policy to JSON string
 *
 * @param policy - The policy to export
 * @param pretty - Whether to format the JSON with indentation (default: true)
 * @returns JSON string representation of the policy
 */
export function exportPolicyToJSON(policy: ABACPolicy, pretty = true): string {
  return JSON.stringify(policy, null, pretty ? 2 : 0);
}

/**
 * Export multiple policies to JSON string
 *
 * @param policies - The policies to export
 * @param pretty - Whether to format the JSON with indentation (default: true)
 * @returns JSON string representation of the policies array
 */
export function exportPoliciesToJSON(policies: ABACPolicy[], pretty = true): string {
  return JSON.stringify(policies, null, pretty ? 2 : 0);
}

/**
 * Save a single policy to a JSON file
 *
 * @param policy - The policy to save
 * @param filePath - Path to the file where the policy should be saved
 * @param pretty - Whether to format the JSON with indentation (default: true)
 */
export async function savePolicyToFile(
  policy: ABACPolicy,
  filePath: string,
  pretty = true
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, exportPolicyToJSON(policy, pretty), 'utf-8');
  } catch (error) {
    throw new PolicyStorageError(
      'save',
      `Failed to save policy to ${filePath}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Save multiple policies to a JSON file
 *
 * @param policies - The policies to save
 * @param filePath - Path to the file where the policies should be saved
 * @param pretty - Whether to format the JSON with indentation (default: true)
 */
export async function savePoliciesToFile(
  policies: ABACPolicy[],
  filePath: string,
  pretty = true
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, exportPoliciesToJSON(policies, pretty), 'utf-8');
  } catch (error) {
    throw new PolicyStorageError(
      'save',
      `Failed to save policies to ${filePath}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Save and validate a single policy to a JSON file
 *
 * @param policy - The policy to save
 * @param filePath - Path to the file where the policy should be saved
 * @param pretty - Whether to format the JSON with indentation (default: true)
 * @throws ValidationError if the policy is invalid
 */
export async function saveAndValidatePolicyToFile(
  policy: ABACPolicy,
  filePath: string,
  pretty = true
): Promise<PolicyValidationResult> {
  const validationResult = validatePolicy(policy);

  if (!validationResult.valid) {
    const validationErrors = validationResult.errors.map(err => ({
      field: `${validationResult.policyId}.${err.path}`,
      message: err.message
    }));

    throw new ValidationError('Policy validation failed', validationErrors, {
      filePath,
      failedPolicies: [validationResult.policyId]
    });
  }

  await savePolicyToFile(policy, filePath, pretty);
  return validationResult;
}

/**
 * Save and validate multiple policies to a JSON file
 *
 * @param policies - The policies to save
 * @param filePath - Path to the file where the policies should be saved
 * @param pretty - Whether to format the JSON with indentation (default: true)
 * @throws ValidationError if any policy is invalid
 */
export async function saveAndValidatePoliciesToFile(
  policies: ABACPolicy[],
  filePath: string,
  pretty = true
): Promise<PolicyValidationResult[]> {
  const validationResults = policies.map(policy => validatePolicy(policy));
  const errors = validationResults.filter(r => !r.valid);

  if (errors.length > 0) {
    const validationErrors = errors.flatMap(e =>
      e.errors.map(err => ({
        field: `${e.policyId}.${err.path}`,
        message: err.message
      }))
    );

    throw new ValidationError(
      `Policy validation failed for ${errors.length} policy/policies`,
      validationErrors,
      { filePath, failedPolicies: errors.map(e => e.policyId) }
    );
  }

  await savePoliciesToFile(policies, filePath, pretty);
  return validationResults;
}

/**
 * Load policies from JSON file
 */
export async function loadPoliciesFromFile(filePath: string): Promise<ABACPolicy[]> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Support both single policy and array of policies
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    throw PolicyStorageError.loadFailed(filePath, error instanceof Error ? error : undefined);
  }
}

/**
 * Load and validate policies from JSON file
 */
export async function loadAndValidatePoliciesFromFile(
  filePath: string
): Promise<{ policies: ABACPolicy[]; validationResults: PolicyValidationResult[] }> {
  const policies = await loadPoliciesFromFile(filePath);
  const validationResults = policies.map(policy => validatePolicy(policy));

  const errors = validationResults.filter(r => !r.valid);
  if (errors.length > 0) {
    const validationErrors = errors.flatMap(e =>
      e.errors.map(err => ({
        field: `${e.policyId}.${err.path}`,
        message: err.message
      }))
    );

    throw new ValidationError(
      `Policy validation failed for ${errors.length} policy/policies`,
      validationErrors,
      { filePath, failedPolicies: errors.map(e => e.policyId) }
    );
  }

  return { policies, validationResults };
}

/**
 * Load policies from JSON string
 */
export function loadPoliciesFromJSON(json: string): ABACPolicy[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    throw PolicyStorageError.loadFailed('JSON string', error instanceof Error ? error : undefined);
  }
}

/**
 * Helper adapter for Prisma
 *
 * @example
 * ```typescript
 * const policies = await prismaAdapter(prisma.abacPolicy.findMany({
 *   where: { active: true }
 * }));
 * ```
 */
export async function prismaAdapter<T>(
  query: Promise<T[]>,
  mapper?: (row: T) => ABACPolicy
): Promise<ABACPolicy[]> {
  const rows = await query;

  if (mapper) {
    return rows.map(mapper);
  }

  // Assume rows are already in ABACPolicy format
  return rows as unknown as ABACPolicy[];
}

/**
 * Helper for caching policies
 */
export class PolicyCache {
  private policies: ABACPolicy[] = [];
  private lastLoaded: number = 0;
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  /**
   * Get cached policies or load fresh ones
   */
  async get(loader: () => Promise<ABACPolicy[]>): Promise<ABACPolicy[]> {
    const now = Date.now();

    if (this.policies.length === 0 || now - this.lastLoaded > this.ttl) {
      this.policies = await loader();
      this.lastLoaded = now;
    }

    return this.policies;
  }

  /**
   * Invalidate cache
   */
  invalidate(): void {
    this.policies = [];
    this.lastLoaded = 0;
  }

  /**
   * Manually set policies
   */
  set(policies: ABACPolicy[]): void {
    this.policies = policies;
    this.lastLoaded = Date.now();
  }
}

/**
 * Filter policies by target criteria
 * Useful for optimizing policy evaluation
 */
export function filterPoliciesByTarget(
  policies: ABACPolicy[],
  criteria: {
    resourceType?: string;
    actionId?: string;
    subjectAttributes?: Record<string, unknown>;
  }
): ABACPolicy[] {
  return policies.filter(policy => {
    // If policy has no target, it's always applicable
    if (!policy.target) {
      return true;
    }

    // Check resource type if specified
    if (criteria.resourceType && policy.target.resource) {
      // Simple check - could be enhanced based on policy target structure
      return true; // Default to include
    }

    // Check action if specified
    if (criteria.actionId && policy.target.action) {
      // Simple check - could be enhanced based on policy target structure
      return true; // Default to include
    }

    return true;
  });
}

/**
 * Group policies by effect for optimization
 */
export function groupPoliciesByEffect(policies: ABACPolicy[]): {
  permit: ABACPolicy[];
  deny: ABACPolicy[];
} {
  return policies.reduce(
    (acc, policy) => {
      if (policy.effect === 'Permit') {
        acc.permit.push(policy);
      } else {
        acc.deny.push(policy);
      }
      return acc;
    },
    { permit: [] as ABACPolicy[], deny: [] as ABACPolicy[] }
  );
}
