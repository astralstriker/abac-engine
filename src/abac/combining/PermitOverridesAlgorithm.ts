/**
 * Permit-Overrides Combining Algorithm
 *
 * This algorithm returns Permit if any policy evaluates to Permit.
 * It's more permissive than deny-overrides.
 *
 * Decision logic:
 * 1. If any policy permits, return Permit
 * 2. If any policy denies (and none permit), return Deny
 * 3. If any policy is indeterminate (and none permit/deny), return Indeterminate
 * 4. Otherwise, return NotApplicable
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class PermitOverridesAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    let hasDeny = false;
    let hasIndeterminate = false;

    for (const result of results) {
      if (result.decision === Decision.Permit) {
        return Decision.Permit;
      }
      if (result.decision === Decision.Deny) {
        hasDeny = true;
      }
      if (result.decision === Decision.Indeterminate) {
        hasIndeterminate = true;
      }
    }

    if (hasDeny) {
      return Decision.Deny;
    }
    if (hasIndeterminate) {
      return Decision.Indeterminate;
    }
    return Decision.NotApplicable;
  }

  getName(): string {
    return 'permit-overrides';
  }

  getDescription(): string {
    return 'Returns Permit if any policy permits. More permissive algorithm.';
  }
}
