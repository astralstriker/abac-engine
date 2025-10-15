/**
 * Combining Algorithms Module
 *
 * This module exports all combining algorithm implementations and the factory.
 * Combining algorithms determine how multiple policy results are combined into
 * a single decision.
 */

export { CombiningAlgorithmFactory } from './CombiningAlgorithmFactory';
export { DenyOverridesAlgorithm } from './DenyOverridesAlgorithm';
export { DenyUnlessPermitAlgorithm } from './DenyUnlessPermitAlgorithm';
export { FirstApplicableAlgorithm } from './FirstApplicableAlgorithm';
export { ICombiningAlgorithm } from './ICombiningAlgorithm';
export { OnlyOneApplicableAlgorithm } from './OnlyOneApplicableAlgorithm';
export { PermitOverridesAlgorithm } from './PermitOverridesAlgorithm';
export { PermitUnlessDenyAlgorithm } from './PermitUnlessDenyAlgorithm';

