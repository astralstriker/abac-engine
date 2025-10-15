/**
 * Only-One-Applicable Combining Algorithm
 *
 * This algorithm ensures that only one policy is applicable.
 * If more than one policy is applicable, it returns Indeterminate (error condition).
 *
 * Decision logic:
 * 1. Count how many policies are applicable (not NotApplicable)
 * 2. If exactly one policy is applicable, return its decision
 * 3. If more than one policy is applicable, return Indeterminate
 * 4. If no policies are applicable, return NotApplicable
 *
 * Use case: Ensures policy conflicts are detected and reported as errors.
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class OnlyOneApplicableAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    let applicableResult: PolicyResult | null = null;

    for (const result of results) {
      if (result.decision !== Decision.NotApplicable) {
        if (applicableResult !== null) {
          // More than one applicable policy - error condition
          return Decision.Indeterminate;
        }
        applicableResult = result;
      }
    }

    return applicableResult ? applicableResult.decision : Decision.NotApplicable;
  }

  getName(): string {
    return 'only-one-applicable';
  }

  getDescription(): string {
    return 'Returns Indeterminate if more than one policy is applicable. Detects conflicts.';
  }
}
