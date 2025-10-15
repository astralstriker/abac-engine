/**
 * ABAC Policy Decision Point (PDP) Engine
 *
 * This is the core engine that evaluates ABAC policies and makes authorization decisions
 * based on subject, resource, action, and environment attributes.
 */

import { ILogger, SilentLogger } from '../logger';
import { CombiningAlgorithmFactory } from './combining';
import { getErrorMessage, RequestValidationError, wrapError } from './errors';
import { AttributeResolver, PolicyEvaluator } from './evaluation';
import { AuditService, FunctionRegistry, MetricsCollector } from './services';
import {
  ABACAccessLog,
  ABACDecision,
  ABACEngineConfig,
  ABACPolicy,
  ABACRequest,
  AttributeProvider,
  CombiningAlgorithm,
  ConditionFunction,
  Decision,
  EvaluationMetrics,
  PolicyResult
} from './types';

/**
 * Main ABAC Engine implementing Policy Decision Point (PDP)
 */
export class ABACEngine {
  private config: ABACEngineConfig;
  private logger: ILogger;
  private functionRegistry: FunctionRegistry;
  private auditService: AuditService;
  private metricsCollector: MetricsCollector;
  private attributeResolver: AttributeResolver;
  private policyEvaluator: PolicyEvaluator;

  constructor(config: ABACEngineConfig) {
    this.config = {
      enableAuditLog: true,
      enablePerformanceMetrics: true,
      cacheResults: false,
      cacheTTL: 300,
      maxEvaluationTime: 5000,
      ...config
    };

    // Initialize logger (default to SilentLogger if not provided)
    this.logger = config.logger ?? new SilentLogger();

    // Initialize services
    this.functionRegistry = new FunctionRegistry();
    this.auditService = new AuditService({
      enabled: this.config.enableAuditLog ?? true
    });
    this.metricsCollector = new MetricsCollector(this.config.enablePerformanceMetrics ?? true);

    // Initialize attribute resolver
    this.attributeResolver = new AttributeResolver(this.logger, config.attributeProviders || []);

    // Initialize policy evaluator
    this.policyEvaluator = new PolicyEvaluator(
      this.logger,
      this.functionRegistry,
      this.attributeResolver
    );

    // Set default combining algorithm if not provided
    if (!this.config.combiningAlgorithm) {
      this.config.combiningAlgorithm = CombiningAlgorithm.DenyOverrides;
    }

    // Register custom functions from config
    if (config.functionRegistry) {
      for (const [name, fn] of config.functionRegistry.entries()) {
        this.functionRegistry.register(name, fn);
      }
    }
  }

  /**
   * Main evaluation method - Policy Decision Point (PDP)
   */
  public async evaluate(request: ABACRequest, policies: ABACPolicy[]): Promise<ABACDecision> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const errors: string[] = [];

    try {
      // Validate request
      this.validateRequest(request);

      // Enhance request with additional attributes from providers
      const enhancedRequest = await this.attributeResolver.enhanceRequest(request);

      // Find applicable policies
      const applicablePolicies = await this.policyEvaluator.findApplicablePolicies(
        enhancedRequest,
        policies
      );

      // Evaluate applicable policies
      const policyResults = await this.policyEvaluator.evaluatePolicies(
        enhancedRequest,
        applicablePolicies,
        errors
      );

      // Combine results using combining algorithm
      const algorithm = this.config.combiningAlgorithm || CombiningAlgorithm.DenyOverrides;
      const finalDecision = this.combineResults(policyResults, algorithm);

      // Collect obligations and advice
      const allObligations = this.policyEvaluator.collectObligations(policyResults);
      const allAdvice = this.policyEvaluator.collectAdvice(policyResults);

      const evaluationTime = Date.now() - startTime;

      const decision: ABACDecision = {
        decision: finalDecision,
        obligations: allObligations,
        advice: allAdvice,
        matchedPolicies: policyResults
          .filter(result => result.decision === 'Permit' || result.decision === 'Deny')
          .map(result => result.policy)
          .filter((policy): policy is ABACPolicy => policy !== undefined),
        evaluationDetails: {
          totalPolicies: policies.length,
          applicablePolicies: applicablePolicies.length,
          evaluationTime,
          ...(errors.length > 0 && { errors })
        }
      };

      // Update metrics
      if (this.config.enablePerformanceMetrics) {
        this.metricsCollector.record(
          decision,
          evaluationTime,
          applicablePolicies.map(p => p.id)
        );
      }

      // Log audit entry
      if (this.config.enableAuditLog) {
        await this.auditService.log(requestId, request, decision, evaluationTime, errors);
      }

      return decision;
    } catch (error) {
      const evaluationTime = Date.now() - startTime;
      const wrappedError = wrapError(error);
      const errorMessage = getErrorMessage(error);
      errors.push(errorMessage);

      const errorDecision: ABACDecision = {
        decision: Decision.Indeterminate,
        obligations: [],
        advice: [],
        matchedPolicies: [],
        evaluationDetails: {
          totalPolicies: policies.length,
          applicablePolicies: 0,
          evaluationTime,
          errors
        }
      };

      this.logger.error('Error during policy evaluation', {
        error: wrappedError.toJSON(),
        requestId
      });

      if (this.config.enableAuditLog) {
        await this.auditService.log(requestId, request, errorDecision, evaluationTime, errors);
      }

      return errorDecision;
    }
  }

  /**
   * Combine policy results using the specified combining algorithm
   */
  private combineResults(results: PolicyResult[], algorithm: CombiningAlgorithm): Decision {
    if (results.length === 0) {
      return Decision.NotApplicable;
    }

    const combiningAlgorithm = CombiningAlgorithmFactory.getAlgorithm(algorithm);
    return combiningAlgorithm.combine(results);
  }

  /**
   * Validate the access request
   */
  private validateRequest(request: ABACRequest): void {
    if (!request.subject || !request.subject.id) {
      throw RequestValidationError.missingField('Subject ID');
    }
    if (!request.resource || !request.resource.id) {
      throw RequestValidationError.missingField('Resource ID');
    }
    if (!request.action || !request.action.id) {
      throw RequestValidationError.missingField('Action ID');
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public methods for engine management
   */

  public getMetrics(): EvaluationMetrics {
    return this.metricsCollector.getMetrics();
  }

  public getAuditLogs(limit?: number): ABACAccessLog[] {
    return this.auditService.getLogs(limit);
  }

  public clearAuditLogs(): void {
    this.auditService.clear();
  }

  /**
   * Register a custom function for use in conditions
   */
  public registerFunction(name: string, fn: ConditionFunction): void {
    this.functionRegistry.register(name, fn);
  }

  /**
   * Add an attribute provider
   */
  public addAttributeProvider(provider: AttributeProvider): void {
    this.attributeResolver.addProvider(provider);
  }

  /**
   * Remove an attribute provider
   */
  public removeAttributeProvider(key: string): void {
    this.attributeResolver.removeProvider(key);
  }
}
