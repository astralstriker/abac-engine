/**
 * Custom Error Classes for ABAC Engine
 *
 * Provides a hierarchical error system with proper context and categorization
 * for different types of failures in the ABAC engine.
 */

/**
 * Base error class for all ABAC-related errors
 */
export class ABACError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown> | undefined;
  public readonly timestamp: Date;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a formatted error message with context
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Thrown when policy or request validation fails
 */
export class ValidationError extends ABACError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.validationErrors = validationErrors;
  }

  static fromValidationResult(
    policyId: string,
    errors: Array<{ path: string; message: string }>
  ): ValidationError {
    const validationErrors = errors.map(e => ({
      field: e.path,
      message: e.message
    }));

    return new ValidationError(
      `Policy validation failed: ${errors.map(e => e.message).join(', ')}`,
      validationErrors,
      { policyId }
    );
  }
}

/**
 * Thrown when configuration or initialization fails
 */
export class ConfigurationError extends ABACError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }

  static missingConfiguration(field: string): ConfigurationError {
    return new ConfigurationError(`Missing required configuration: ${field}`, { field });
  }

  static invalidConfiguration(field: string, reason: string): ConfigurationError {
    return new ConfigurationError(`Invalid configuration for ${field}: ${reason}`, {
      field,
      reason
    });
  }
}

/**
 * Thrown when policy evaluation fails
 */
export class EvaluationError extends ABACError {
  public readonly policyId: string | undefined;
  public readonly requestId: string | undefined;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'EVALUATION_ERROR', context);
    this.policyId = context?.policyId as string | undefined;
    this.requestId = context?.requestId as string | undefined;
  }

  static invalidCondition(condition: unknown, policyId?: string): EvaluationError {
    return new EvaluationError('Invalid condition format', { condition, policyId });
  }

  static unknownOperator(operator: string, policyId?: string): EvaluationError {
    return new EvaluationError(`Unknown logical operator: ${operator}`, { operator, policyId });
  }

  static invalidOperatorArity(
    operator: string,
    expected: number | string,
    actual: number,
    policyId?: string
  ): EvaluationError {
    return new EvaluationError(
      `${operator} operator expects ${expected} condition(s), got ${actual}`,
      { operator, expected, actual, policyId }
    );
  }

  static functionError(functionName: string, reason: string, policyId?: string): EvaluationError {
    return new EvaluationError(`Function '${functionName}' evaluation failed: ${reason}`, {
      functionName,
      reason,
      policyId
    });
  }
}

/**
 * Thrown when attribute resolution fails
 */
export class AttributeResolutionError extends ABACError {
  public readonly category: string;
  public readonly entityId: string;
  public readonly providerName: string | undefined;

  constructor(
    message: string,
    category: string,
    entityId: string,
    providerName?: string,
    cause?: Error
  ) {
    super(message, 'ATTRIBUTE_RESOLUTION_ERROR', {
      category,
      entityId,
      providerName,
      cause: cause?.message
    });
    this.category = category;
    this.entityId = entityId;
    this.providerName = providerName;
  }

  static providerError(
    category: string,
    entityId: string,
    providerName: string,
    cause: Error
  ): AttributeResolutionError {
    return new AttributeResolutionError(
      `Failed to resolve attributes from ${providerName} for ${category}:${entityId}`,
      category,
      entityId,
      providerName,
      cause
    );
  }

  static notInitialized(providerName: string): AttributeResolutionError {
    return new AttributeResolutionError(
      `Attribute provider '${providerName}' not properly initialized`,
      'unknown',
      'unknown',
      providerName
    );
  }
}

/**
 * Thrown when a required policy is not found
 */
export class PolicyNotFoundError extends ABACError {
  public readonly policyId: string;

  constructor(policyId: string, context?: Record<string, unknown>) {
    super(`Policy not found: ${policyId}`, 'POLICY_NOT_FOUND', { ...context, policyId });
    this.policyId = policyId;
  }
}

/**
 * Thrown when combining algorithm operations fail
 */
export class CombiningAlgorithmError extends ABACError {
  public readonly algorithm: string;

  constructor(message: string, algorithm: string, context?: Record<string, unknown>) {
    super(message, 'COMBINING_ALGORITHM_ERROR', { ...context, algorithm });
    this.algorithm = algorithm;
  }

  static unknownAlgorithm(algorithm: string): CombiningAlgorithmError {
    return new CombiningAlgorithmError(`Unknown combining algorithm: ${algorithm}`, algorithm);
  }

  static evaluationFailed(algorithm: string, reason: string): CombiningAlgorithmError {
    return new CombiningAlgorithmError(
      `Combining algorithm '${algorithm}' failed: ${reason}`,
      algorithm,
      { reason }
    );
  }
}

/**
 * Thrown when request validation fails
 */
export class RequestValidationError extends ABACError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(message, 'REQUEST_VALIDATION_ERROR', { field });
    this.field = field;
  }

  static missingField(field: string): RequestValidationError {
    return new RequestValidationError(field, `${field} is required`);
  }

  static invalidField(field: string, reason: string): RequestValidationError {
    return new RequestValidationError(field, `Invalid ${field}: ${reason}`);
  }
}

/**
 * Thrown when policy storage operations fail
 */
export class PolicyStorageError extends ABACError {
  public readonly operation: 'save' | 'load' | 'delete' | 'list';
  public readonly policyId: string | undefined;

  constructor(
    operation: 'save' | 'load' | 'delete' | 'list',
    message: string,
    policyId?: string,
    cause?: Error
  ) {
    super(message, 'POLICY_STORAGE_ERROR', {
      operation,
      policyId,
      cause: cause?.message
    });
    this.operation = operation;
    this.policyId = policyId;
  }

  static loadFailed(source: string, cause?: Error): PolicyStorageError {
    return new PolicyStorageError(
      'load',
      `Failed to load policies from ${source}`,
      undefined,
      cause
    );
  }

  static saveFailed(policyId: string, cause?: Error): PolicyStorageError {
    return new PolicyStorageError('save', `Failed to save policy ${policyId}`, policyId, cause);
  }

  static deleteFailed(policyId: string, cause?: Error): PolicyStorageError {
    return new PolicyStorageError('delete', `Failed to delete policy ${policyId}`, policyId, cause);
  }
}

/**
 * Type guard to check if an error is an ABACError
 */
export function isABACError(error: unknown): error is ABACError {
  return error instanceof ABACError;
}

/**
 * Wraps unknown errors into ABACError instances
 */
export function wrapError(error: unknown, defaultMessage = 'Unknown error'): ABACError {
  if (isABACError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ABACError(error.message, 'WRAPPED_ERROR', {
      originalName: error.name,
      originalStack: error.stack
    });
  }

  return new ABACError(defaultMessage, 'UNKNOWN_ERROR', { originalError: String(error) });
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Creates a user-friendly error message from ABACError
 */
export function formatErrorForUser(error: ABACError): string {
  let message = `[${error.code}] ${error.message}`;

  if (error instanceof ValidationError) {
    message += '\nValidation errors:\n';
    message += error.validationErrors.map(e => `  - ${e.field}: ${e.message}`).join('\n');
  }

  if (error.context && Object.keys(error.context).length > 0) {
    const contextStr = Object.entries(error.context)
      .filter(([key]) => !['cause', 'originalStack'].includes(key))
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    if (contextStr) {
      message += '\nContext:\n' + contextStr;
    }
  }

  return message;
}
