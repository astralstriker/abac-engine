/**
 * Combining Algorithm Interface
 *
 * Defines the contract for policy combining algorithms.
 * Each algorithm implements a different strategy for combining multiple policy results.
 */

import { Decision, PolicyResult } from '../types';

/**
 * Interface for policy combining algorithms
 *
 * Combining algorithms determine the final decision when multiple policies
 * are applicable to a request. Different algorithms have different behaviors
 * for handling conflicts (e.g., when some policies permit and others deny).
 */
export interface ICombiningAlgorithm {
  /**
   * Combine multiple policy results into a single decision
   *
   * @param results - Array of policy evaluation results
   * @returns Final decision (Permit, Deny, NotApplicable, or Indeterminate)
   */
  combine(results: PolicyResult[]): Decision;

  /**
   * Get the name/identifier of this combining algorithm
   */
  getName(): string;

  /**
   * Get a description of how this algorithm works
   */
  getDescription(): string;
}
