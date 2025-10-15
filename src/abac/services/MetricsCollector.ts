/**
 * Metrics Collector Service
 *
 * Tracks and aggregates performance metrics for ABAC engine evaluations.
 * Provides insights into engine performance, decision distribution, and error rates.
 */

import { ABACDecision, Decision, EvaluationMetrics } from '../types';

/**
 * Service for collecting and managing performance metrics
 */
export class MetricsCollector {
  private metrics: EvaluationMetrics = {
    totalRequests: 0,
    averageEvaluationTime: 0,
    policyHitRate: {},
    decisionDistribution: {
      [Decision.Permit]: 0,
      [Decision.Deny]: 0,
      [Decision.NotApplicable]: 0,
      [Decision.Indeterminate]: 0
    },
    errorRate: 0
  };

  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Record a policy evaluation
   *
   * @param decision - The decision result
   * @param evaluationTime - Time taken to evaluate (in milliseconds)
   * @param policyIds - IDs of policies that were evaluated
   */
  record(decision: ABACDecision, evaluationTime: number, policyIds: string[] = []): void {
    if (!this.enabled) {
      return;
    }

    this.metrics.totalRequests++;

    // Update average evaluation time (use at least 0.001ms to avoid division issues)
    const actualTime = Math.max(evaluationTime, 0.001);
    const totalTime =
      this.metrics.averageEvaluationTime * (this.metrics.totalRequests - 1) + actualTime;
    this.metrics.averageEvaluationTime = totalTime / this.metrics.totalRequests;

    // Update decision distribution
    this.metrics.decisionDistribution[decision.decision]++;

    // Update policy hit rate
    for (const policyId of policyIds) {
      this.metrics.policyHitRate[policyId] = (this.metrics.policyHitRate[policyId] || 0) + 1;
    }

    // Update error rate
    if (decision.evaluationDetails?.errors && decision.evaluationDetails.errors.length > 0) {
      const currentErrors = this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1;
      this.metrics.errorRate = currentErrors / this.metrics.totalRequests;
    } else {
      // Adjust error rate for successful request
      const currentErrors = this.metrics.errorRate * (this.metrics.totalRequests - 1);
      this.metrics.errorRate = currentErrors / this.metrics.totalRequests;
    }
  }

  /**
   * Get current metrics
   *
   * @returns Copy of current metrics
   */
  getMetrics(): EvaluationMetrics {
    return {
      ...this.metrics,
      policyHitRate: { ...this.metrics.policyHitRate },
      decisionDistribution: { ...this.metrics.decisionDistribution }
    };
  }

  /**
   * Reset all metrics to initial state
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      averageEvaluationTime: 0,
      policyHitRate: {},
      decisionDistribution: {
        [Decision.Permit]: 0,
        [Decision.Deny]: 0,
        [Decision.NotApplicable]: 0,
        [Decision.Indeterminate]: 0
      },
      errorRate: 0
    };
  }

  /**
   * Enable metrics collection
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable metrics collection
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if metrics collection is enabled
   *
   * @returns true if enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get metrics summary as a formatted string
   *
   * @returns Formatted metrics summary
   */
  getSummary(): string {
    const m = this.metrics;
    const lines = [
      '=== ABAC Engine Metrics ===',
      `Total Requests: ${m.totalRequests}`,
      `Average Evaluation Time: ${m.averageEvaluationTime.toFixed(2)}ms`,
      `Error Rate: ${(m.errorRate * 100).toFixed(2)}%`,
      '',
      'Decision Distribution:',
      `  Permit: ${m.decisionDistribution[Decision.Permit]} (${this.getPercentage(Decision.Permit)}%)`,
      `  Deny: ${m.decisionDistribution[Decision.Deny]} (${this.getPercentage(Decision.Deny)}%)`,
      `  NotApplicable: ${m.decisionDistribution[Decision.NotApplicable]} (${this.getPercentage(Decision.NotApplicable)}%)`,
      `  Indeterminate: ${m.decisionDistribution[Decision.Indeterminate]} (${this.getPercentage(Decision.Indeterminate)}%)`
    ];

    if (Object.keys(m.policyHitRate).length > 0) {
      lines.push('', 'Top Policies:');
      const sorted = Object.entries(m.policyHitRate)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [policyId, count] of sorted) {
        lines.push(`  ${policyId}: ${count} hits`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get percentage for a decision type
   */
  private getPercentage(decision: Decision): string {
    if (this.metrics.totalRequests === 0) {
      return '0.00';
    }
    const count = this.metrics.decisionDistribution[decision];
    return ((count / this.metrics.totalRequests) * 100).toFixed(2);
  }

  /**
   * Get metrics for a specific policy
   *
   * @param policyId - Policy ID
   * @returns Hit count for the policy
   */
  getPolicyMetrics(policyId: string): number {
    return this.metrics.policyHitRate[policyId] || 0;
  }

  /**
   * Get top N policies by hit count
   *
   * @param limit - Number of policies to return
   * @returns Array of [policyId, hitCount] tuples
   */
  getTopPolicies(limit: number = 10): Array<[string, number]> {
    return Object.entries(this.metrics.policyHitRate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}
