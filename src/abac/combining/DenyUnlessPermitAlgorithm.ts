/**
 * Deny-Unless-Permit Combining Algorithm
 *
 * This algorithm returns Deny unless at least one policy explicitly permits.
 * It's a very restrictive algorithm that defaults to denial.
 *
 * Decision logic:
 * 1. If any policy permits, return Permit
 * 2. Otherwise, return Deny (regardless of other results)
 *
 * Use case: High-security scenarios where access must be explicitly granted.
 * All other outcomes (Deny, NotApplicable, Indeterminate) result in Deny.
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class DenyUnlessPermitAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    for (const result of results) {
      if (result.decision === Decision.Permit) {
        return Decision.Permit;
      }
    }
    return Decision.Deny;
  }

  getName(): string {
    return 'deny-unless-permit';
  }

  getDescription(): string {
    return 'Returns Deny unless at least one policy explicitly permits. Very restrictive.';
  }
}
