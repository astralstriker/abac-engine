/**
 * First-Applicable Combining Algorithm
 *
 * This algorithm returns the decision of the first applicable policy.
 * Policies are evaluated in order, and the first one that is not NotApplicable wins.
 *
 * Decision logic:
 * 1. Iterate through policy results in order
 * 2. Return the first decision that is not NotApplicable
 * 3. If all policies are NotApplicable, return NotApplicable
 *
 * Note: Policy order matters with this algorithm.
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class FirstApplicableAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    for (const result of results) {
      if (result.decision !== Decision.NotApplicable) {
        return result.decision;
      }
    }
    return Decision.NotApplicable;
  }

  getName(): string {
    return 'first-applicable';
  }

  getDescription(): string {
    return 'Returns the decision of the first applicable policy. Order matters.';
  }
}
