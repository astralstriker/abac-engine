/**
 * Combining Algorithm Factory
 *
 * Factory pattern for creating combining algorithm instances.
 * Maps CombiningAlgorithm enum values to concrete algorithm implementations.
 */

import { CombiningAlgorithmError } from '../errors';
import { CombiningAlgorithm } from '../types';
import { DenyOverridesAlgorithm } from './DenyOverridesAlgorithm';
import { DenyUnlessPermitAlgorithm } from './DenyUnlessPermitAlgorithm';
import { FirstApplicableAlgorithm } from './FirstApplicableAlgorithm';
import { ICombiningAlgorithm } from './ICombiningAlgorithm';
import { OnlyOneApplicableAlgorithm } from './OnlyOneApplicableAlgorithm';
import { PermitOverridesAlgorithm } from './PermitOverridesAlgorithm';
import { PermitUnlessDenyAlgorithm } from './PermitUnlessDenyAlgorithm';

/**
 * Factory for creating combining algorithm instances
 */
export class CombiningAlgorithmFactory {
  private static algorithms: Map<CombiningAlgorithm, ICombiningAlgorithm> = new Map([
    [CombiningAlgorithm.DenyOverrides, new DenyOverridesAlgorithm()],
    [CombiningAlgorithm.PermitOverrides, new PermitOverridesAlgorithm()],
    [CombiningAlgorithm.FirstApplicable, new FirstApplicableAlgorithm()],
    [CombiningAlgorithm.OnlyOneApplicable, new OnlyOneApplicableAlgorithm()],
    [CombiningAlgorithm.DenyUnlessPermit, new DenyUnlessPermitAlgorithm()],
    [CombiningAlgorithm.PermitUnlessDeny, new PermitUnlessDenyAlgorithm()]
  ]);

  /**
   * Get a combining algorithm instance
   *
   * @param algorithm - The combining algorithm enum value
   * @returns ICombiningAlgorithm instance
   * @throws Error if algorithm is not recognized
   */
  static getAlgorithm(algorithm: CombiningAlgorithm): ICombiningAlgorithm {
    const instance = this.algorithms.get(algorithm);

    if (!instance) {
      throw CombiningAlgorithmError.unknownAlgorithm(algorithm);
    }

    return instance;
  }

  /**
   * Get all available algorithms
   *
   * @returns Map of algorithm enum to instance
   */
  static getAllAlgorithms(): Map<CombiningAlgorithm, ICombiningAlgorithm> {
    return new Map(this.algorithms);
  }

  /**
   * Check if an algorithm is supported
   *
   * @param algorithm - The combining algorithm to check
   * @returns true if supported, false otherwise
   */
  static isSupported(algorithm: CombiningAlgorithm): boolean {
    return this.algorithms.has(algorithm);
  }

  /**
   * Get algorithm information
   *
   * @param algorithm - The combining algorithm enum value
   * @returns Object with name and description
   */
  static getAlgorithmInfo(algorithm: CombiningAlgorithm): {
    name: string;
    description: string;
  } {
    const instance = this.getAlgorithm(algorithm);
    return {
      name: instance.getName(),
      description: instance.getDescription()
    };
  }
}
