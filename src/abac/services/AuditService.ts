/**
 * Audit Service
 *
 * Manages audit logging for ABAC engine access decisions.
 * Maintains a history of access requests and their outcomes for compliance and security monitoring.
 */

import { ConfigurationError } from '../errors';
import { ABACAccessLog, ABACDecision, ABACRequest, Decision } from '../types';

/**
 * Configuration options for the audit service
 */
export interface AuditServiceConfig {
  /**
   * Enable audit logging
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum number of audit logs to keep in memory
   * @default 10000
   */
  maxLogs?: number;

  /**
   * Optional callback for custom audit log handling
   */
  onLog?: (log: ABACAccessLog) => void | Promise<void>;
}

/**
 * Service for managing audit logs
 */
export class AuditService {
  private logs: ABACAccessLog[] = [];
  private enabled: boolean;
  private maxLogs: number;
  private onLog: ((log: ABACAccessLog) => void | Promise<void>) | undefined;

  constructor(config: AuditServiceConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxLogs = config.maxLogs ?? 10000;
    this.onLog = config.onLog ?? undefined;
  }

  /**
   * Log an access decision
   *
   * @param requestId - Unique request identifier
   * @param request - The access request
   * @param decision - The decision result
   * @param evaluationTime - Time taken to evaluate (in milliseconds)
   * @param errors - Any errors that occurred during evaluation
   */
  async log(
    requestId: string,
    request: ABACRequest,
    decision: ABACDecision,
    evaluationTime: number,
    errors: string[] = []
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const logEntry: ABACAccessLog = {
      timestamp: new Date(),
      requestId,
      subject: {
        id: request.subject.id,
        attributes: request.subject.attributes
      },
      resource: {
        id: request.resource.id,
        type: request.resource.type,
        attributes: request.resource.attributes
      },
      action: {
        id: request.action.id,
        attributes: request.action.attributes || {}
      },
      ...(request.environment && {
        environment: {
          attributes: request.environment.attributes || {}
        }
      }),
      decision: decision.decision,
      matchedPolicies: decision.matchedPolicies.map(p => p.id),
      obligations: decision.obligations,
      evaluationTime,
      ...(errors.length > 0 && { errors })
    };

    this.logs.push(logEntry);

    // Keep only last N entries to prevent memory leaks
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Call custom handler if provided
    if (this.onLog) {
      await this.onLog(logEntry);
    }
  }

  /**
   * Get audit logs
   *
   * @param limit - Maximum number of logs to return (most recent first)
   * @returns Array of audit logs
   */
  getLogs(limit?: number): ABACAccessLog[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }

  /**
   * Clear all audit logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get the total number of audit logs
   *
   * @returns Number of logs stored
   */
  getCount(): number {
    return this.logs.length;
  }

  /**
   * Enable audit logging
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable audit logging
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if audit logging is enabled
   *
   * @returns true if enabled, false otherwise
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get logs for a specific subject
   *
   * @param subjectId - Subject identifier
   * @returns Array of audit logs for the subject
   */
  getLogsBySubject(subjectId: string): ABACAccessLog[] {
    return this.logs.filter(log => log.subject.id === subjectId);
  }

  /**
   * Get logs for a specific resource
   *
   * @param resourceId - Resource identifier
   * @returns Array of audit logs for the resource
   */
  getLogsByResource(resourceId: string): ABACAccessLog[] {
    return this.logs.filter(log => log.resource.id === resourceId);
  }

  /**
   * Get logs by decision type
   *
   * @param decision - Decision type to filter by
   * @returns Array of audit logs with the specified decision
   */
  getLogsByDecision(decision: Decision): ABACAccessLog[] {
    return this.logs.filter(log => log.decision === decision);
  }

  /**
   * Get logs within a time range
   *
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Array of audit logs within the time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): ABACAccessLog[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * Get logs that resulted in errors
   *
   * @returns Array of audit logs with errors
   */
  getErrorLogs(): ABACAccessLog[] {
    return this.logs.filter(log => log.errors && log.errors.length > 0);
  }

  /**
   * Get statistics about audit logs
   *
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    byDecision: Record<Decision, number>;
    withErrors: number;
    averageEvaluationTime: number;
  } {
    const stats = {
      total: this.logs.length,
      byDecision: {
        [Decision.Permit]: 0,
        [Decision.Deny]: 0,
        [Decision.NotApplicable]: 0,
        [Decision.Indeterminate]: 0
      },
      withErrors: 0,
      averageEvaluationTime: 0
    };

    if (this.logs.length === 0) {
      return stats;
    }

    let totalTime = 0;

    for (const log of this.logs) {
      stats.byDecision[log.decision]++;
      if (log.errors && log.errors.length > 0) {
        stats.withErrors++;
      }
      totalTime += log.evaluationTime;
    }

    stats.averageEvaluationTime = totalTime / this.logs.length;

    return stats;
  }

  /**
   * Export logs as JSON
   *
   * @returns JSON string of all logs
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Import logs from JSON
   *
   * @param json - JSON string of logs
   */
  importLogs(json: string): void {
    try {
      const imported = JSON.parse(json) as ABACAccessLog[];
      if (Array.isArray(imported)) {
        this.logs = imported;
      } else {
        throw ConfigurationError.invalidConfiguration(
          'audit logs',
          'Expected an array of audit logs'
        );
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw ConfigurationError.invalidConfiguration(
        'audit logs JSON',
        error instanceof Error ? error.message : 'Invalid JSON format'
      );
    }
  }
}
