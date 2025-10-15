/**
 * Permit-Unless-Deny Combining Algorithm
 *
 * This algorithm returns Permit unless at least one policy explicitly denies.
 * It's a very permissive algorithm that defaults to allowing access.
 *
 * Decision logic:
 * 1. If any policy denies, return Deny
 * 2. Otherwise, return Permit (regardless of other results)
 *
 * Use case: Low-security scenarios or development environments where access
 * is generally allowed unless explicitly denied.
 * All other outcomes (Permit, NotApplicable, Indeterminate) result in Permit.
 */

import { Decision, PolicyResult } from '../types';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';

export class PermitUnlessDenyAlgorithm implements ICombiningAlgorithm {
  combine(results: PolicyResult[]): Decision {
    for (const result of results) {
      if (result.decision === Decision.Deny) {
        return Decision.Deny;
      }
    }
    return Decision.Permit;
  }

  getName(): string {
    return 'permit-unless-deny';
  }

  getDescription(): string {
    return 'Returns Permit unless at least one policy explicitly denies. Very permissive.';
  }
}
