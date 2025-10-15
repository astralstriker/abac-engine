/**
 * Deny-Overrides Combining Algorithm
 *
 * This algorithm returns Deny if any policy evaluates to Deny.
 * It's the most restrictive algorithm, prioritizing security.
 *
 * Decision logic:
 * 1. If any policy denies, return Deny
 * 2. If any policy permits (and none deny), return Permit
 * 3. If any policy is indeterminate (and none deny/permit), return Indeterminate
 * 4. Otherwise, return NotApplicable
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class DenyOverridesAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    let hasPermit = false;
    let hasIndeterminate = false;

    for (const result of results) {
      if (result.decision === Decision.Deny) {
        return Decision.Deny;
      }
      if (result.decision === Decision.Permit) {
        hasPermit = true;
      }
      if (result.decision === Decision.Indeterminate) {
        hasIndeterminate = true;
      }
    }

    if (hasPermit) {
      return Decision.Permit;
    }
    if (hasIndeterminate) {
      return Decision.Indeterminate;
    }
    return Decision.NotApplicable;
  }

  getName(): string {
    return 'deny-overrides';
  }

  getDescription(): string {
    return 'Returns Deny if any policy denies. Most restrictive algorithm.';
  }
}
