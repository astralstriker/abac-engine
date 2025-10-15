/**
 * Combining Algorithms Tests
 *
 * Tests for all combining algorithm implementations
 */

import {
  CombiningAlgorithmFactory,
  DenyOverridesAlgorithm,
  DenyUnlessPermitAlgorithm,
  FirstApplicableAlgorithm,
  OnlyOneApplicableAlgorithm,
  PermitOverridesAlgorithm,
  PermitUnlessDenyAlgorithm
} from '../../src/abac/combining';
import { CombiningAlgorithm, Decision, Effect, PolicyResult } from '../../src/abac/types';

describe('Combining Algorithms', () => {
  // Helper to create policy results
  const createResult = (decision: Decision): PolicyResult => ({
    decision,
    policy: {
      id: `policy-${decision}`,
      version: '1.0.0',
      effect: Effect.Permit
    }
  });

  describe('DenyOverridesAlgorithm', () => {
    const algorithm = new DenyOverridesAlgorithm();

    test('should return Deny if any policy denies', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Permit),
        createResult(Decision.Deny),
        createResult(Decision.Permit)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return Permit if any permits and none deny', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Permit),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Indeterminate if any indeterminate and none deny/permit', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Indeterminate),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Indeterminate);
    });

    test('should return NotApplicable if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.NotApplicable);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('deny-overrides');
      expect(algorithm.getDescription()).toContain('Deny');
    });
  });

  describe('PermitOverridesAlgorithm', () => {
    const algorithm = new PermitOverridesAlgorithm();

    test('should return Permit if any policy permits', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Deny),
        createResult(Decision.Permit),
        createResult(Decision.Deny)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Deny if any denies and none permit', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Deny),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return Indeterminate if any indeterminate and none permit/deny', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Indeterminate),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Indeterminate);
    });

    test('should return NotApplicable if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.NotApplicable);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('permit-overrides');
      expect(algorithm.getDescription()).toContain('Permit');
    });
  });

  describe('FirstApplicableAlgorithm', () => {
    const algorithm = new FirstApplicableAlgorithm();

    test('should return first applicable decision', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Permit),
        createResult(Decision.Deny)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Deny if first applicable is Deny', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Deny),
        createResult(Decision.Permit)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return NotApplicable if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.NotApplicable);
    });

    test('should return Indeterminate if first applicable is Indeterminate', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Indeterminate)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Indeterminate);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('first-applicable');
      expect(algorithm.getDescription()).toContain('first');
    });
  });

  describe('OnlyOneApplicableAlgorithm', () => {
    const algorithm = new OnlyOneApplicableAlgorithm();

    test('should return decision if only one policy is applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.Permit),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Indeterminate if multiple policies are applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Permit),
        createResult(Decision.Deny),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Indeterminate);
    });

    test('should return Indeterminate if two Permits', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Permit),
        createResult(Decision.Permit)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Indeterminate);
    });

    test('should return NotApplicable if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.NotApplicable);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('only-one-applicable');
      expect(algorithm.getDescription()).toContain('one');
    });
  });

  describe('DenyUnlessPermitAlgorithm', () => {
    const algorithm = new DenyUnlessPermitAlgorithm();

    test('should return Permit if any policy permits', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Deny),
        createResult(Decision.Permit),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Deny if no policy permits', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Deny),
        createResult(Decision.NotApplicable),
        createResult(Decision.Indeterminate)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return Deny if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return Deny for empty results', () => {
      expect(algorithm.combine([])).toBe(Decision.Deny);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('deny-unless-permit');
      expect(algorithm.getDescription()).toContain('Deny');
    });
  });

  describe('PermitUnlessDenyAlgorithm', () => {
    const algorithm = new PermitUnlessDenyAlgorithm();

    test('should return Deny if any policy denies', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Permit),
        createResult(Decision.Deny),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Deny);
    });

    test('should return Permit if no policy denies', () => {
      const results: PolicyResult[] = [
        createResult(Decision.Permit),
        createResult(Decision.NotApplicable),
        createResult(Decision.Indeterminate)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Permit if all not applicable', () => {
      const results: PolicyResult[] = [
        createResult(Decision.NotApplicable),
        createResult(Decision.NotApplicable)
      ];

      expect(algorithm.combine(results)).toBe(Decision.Permit);
    });

    test('should return Permit for empty results', () => {
      expect(algorithm.combine([])).toBe(Decision.Permit);
    });

    test('should have correct name and description', () => {
      expect(algorithm.getName()).toBe('permit-unless-deny');
      expect(algorithm.getDescription()).toContain('Permit');
    });
  });

  describe('CombiningAlgorithmFactory', () => {
    test('should return DenyOverrides algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.DenyOverrides);
      expect(algorithm).toBeInstanceOf(DenyOverridesAlgorithm);
    });

    test('should return PermitOverrides algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.PermitOverrides);
      expect(algorithm).toBeInstanceOf(PermitOverridesAlgorithm);
    });

    test('should return FirstApplicable algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.FirstApplicable);
      expect(algorithm).toBeInstanceOf(FirstApplicableAlgorithm);
    });

    test('should return OnlyOneApplicable algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(
        CombiningAlgorithm.OnlyOneApplicable
      );
      expect(algorithm).toBeInstanceOf(OnlyOneApplicableAlgorithm);
    });

    test('should return DenyUnlessPermit algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.DenyUnlessPermit);
      expect(algorithm).toBeInstanceOf(DenyUnlessPermitAlgorithm);
    });

    test('should return PermitUnlessDeny algorithm', () => {
      const algorithm = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.PermitUnlessDeny);
      expect(algorithm).toBeInstanceOf(PermitUnlessDenyAlgorithm);
    });

    test('should throw error for unknown algorithm', () => {
      expect(() => {
        CombiningAlgorithmFactory.getAlgorithm('unknown' as CombiningAlgorithm);
      }).toThrow('Unknown combining algorithm');
    });

    test('should check if algorithm is supported', () => {
      expect(CombiningAlgorithmFactory.isSupported(CombiningAlgorithm.DenyOverrides)).toBe(true);
      expect(CombiningAlgorithmFactory.isSupported('invalid' as CombiningAlgorithm)).toBe(false);
    });

    test('should get algorithm info', () => {
      const info = CombiningAlgorithmFactory.getAlgorithmInfo(CombiningAlgorithm.DenyOverrides);
      expect(info.name).toBe('deny-overrides');
      expect(info.description).toBeTruthy();
    });

    test('should return all algorithms', () => {
      const allAlgorithms = CombiningAlgorithmFactory.getAllAlgorithms();
      expect(allAlgorithms.size).toBe(6);
      expect(allAlgorithms.has(CombiningAlgorithm.DenyOverrides)).toBe(true);
      expect(allAlgorithms.has(CombiningAlgorithm.PermitOverrides)).toBe(true);
      expect(allAlgorithms.has(CombiningAlgorithm.FirstApplicable)).toBe(true);
      expect(allAlgorithms.has(CombiningAlgorithm.OnlyOneApplicable)).toBe(true);
      expect(allAlgorithms.has(CombiningAlgorithm.DenyUnlessPermit)).toBe(true);
      expect(allAlgorithms.has(CombiningAlgorithm.PermitUnlessDeny)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('all algorithms handle empty results array', () => {
      const algorithms = [
        new DenyOverridesAlgorithm(),
        new PermitOverridesAlgorithm(),
        new FirstApplicableAlgorithm(),
        new OnlyOneApplicableAlgorithm()
      ];

      algorithms.forEach(algorithm => {
        const result = algorithm.combine([]);
        expect([
          Decision.Permit,
          Decision.Deny,
          Decision.NotApplicable,
          Decision.Indeterminate
        ]).toContain(result);
      });
    });

    test('all algorithms handle single result', () => {
      const result = createResult(Decision.Permit);
      const algorithms = CombiningAlgorithmFactory.getAllAlgorithms();

      algorithms.forEach(algorithm => {
        const decision = algorithm.combine([result]);
        expect([
          Decision.Permit,
          Decision.Deny,
          Decision.NotApplicable,
          Decision.Indeterminate
        ]).toContain(decision);
      });
    });

    test('algorithms are singleton instances', () => {
      const algo1 = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.DenyOverrides);
      const algo2 = CombiningAlgorithmFactory.getAlgorithm(CombiningAlgorithm.DenyOverrides);
      expect(algo1).toBe(algo2);
    });
  });
});
