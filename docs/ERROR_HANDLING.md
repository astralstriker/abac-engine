# Error Handling in ABAC Engine

## Overview

The ABAC Engine implements a comprehensive error handling system with custom error classes that provide proper context, categorization, and error propagation. This document explains how to handle errors in the ABAC Engine and use the custom error classes effectively.

## Error Class Hierarchy

All ABAC-specific errors extend from the base `ABACError` class, which provides:

- **Error Code**: A unique identifier for the error type
- **Context**: Additional metadata about the error
- **Timestamp**: When the error occurred
- **Stack Trace**: Standard JavaScript error stack

```typescript
import { ABACError, isABACError } from '@abac-engine/core';

// Check if an error is an ABAC error
if (isABACError(error)) {
  console.log('Error Code:', error.code);
  console.log('Context:', error.context);
  console.log('Timestamp:', error.timestamp);
}
```

## Error Types

### 1. ValidationError

Thrown when policy or request validation fails.

**Use Cases:**
- Invalid policy structure
- Missing required fields in policies
- Policy schema validation failures

**Example:**

```typescript
import { ValidationError } from '@abac-engine/core';

try {
  const policy = PolicyBuilder.create('test-policy')
    .permit()
    // Missing required effect - will throw ValidationError
    .build();
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message);
    console.log('Errors:', error.validationErrors);
    // Output: Array of { field: string, message: string }
  }
}
```

### 2. ConfigurationError

Thrown when engine configuration or initialization fails.

**Use Cases:**
- Missing required configuration
- Invalid configuration values
- Initialization failures

**Example:**

```typescript
import { ConfigurationError } from '@abac-engine/core';

try {
  // Invalid audit log JSON
  auditService.importLogs('invalid json');
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.log('Configuration error:', error.message);
    console.log('Field:', error.context?.field);
  }
}
```

### 3. EvaluationError

Thrown when policy evaluation fails at runtime.

**Use Cases:**
- Invalid condition format
- Unknown operators
- Function evaluation failures
- Runtime evaluation errors

**Example:**

```typescript
import { EvaluationError } from '@abac-engine/core';

try {
  await engine.evaluate(request, policies);
} catch (error) {
  if (error instanceof EvaluationError) {
    console.log('Evaluation failed:', error.message);
    console.log('Policy ID:', error.policyId);
    console.log('Request ID:', error.requestId);
  }
}
```

**Static Factory Methods:**

```typescript
// Invalid condition
EvaluationError.invalidCondition(condition, policyId);

// Unknown operator
EvaluationError.unknownOperator('unknown-op', policyId);

// Invalid operator arity
EvaluationError.invalidOperatorArity('NOT', 1, 2, policyId);

// Function error
EvaluationError.functionError('myFunc', 'reason', policyId);
```

### 4. AttributeResolutionError

Thrown when attribute resolution from providers fails.

**Use Cases:**
- Attribute provider failures
- Database connection errors
- External API failures
- Provider not initialized

**Example:**

```typescript
import { AttributeResolutionError } from '@abac-engine/core';

try {
  const attributes = await provider.getAttributes('user-123');
} catch (error) {
  if (error instanceof AttributeResolutionError) {
    console.log('Provider error:', error.message);
    console.log('Category:', error.category);
    console.log('Entity ID:', error.entityId);
    console.log('Provider:', error.providerName);
  }
}
```

**Static Factory Methods:**

```typescript
// Provider error
AttributeResolutionError.providerError(category, entityId, providerName, cause);

// Not initialized
AttributeResolutionError.notInitialized(providerName);
```

### 5. RequestValidationError

Thrown when an access request is invalid.

**Use Cases:**
- Missing subject ID
- Missing resource ID
- Missing action ID
- Invalid request structure

**Example:**

```typescript
import { RequestValidationError } from '@abac-engine/core';

try {
  await engine.evaluate({
    subject: { id: '' }, // Invalid - empty ID
    resource: { id: 'doc-123' },
    action: { id: 'read' }
  }, policies);
} catch (error) {
  if (error instanceof RequestValidationError) {
    console.log('Invalid request:', error.message);
    console.log('Field:', error.field);
  }
}
```

**Static Factory Methods:**

```typescript
// Missing field
RequestValidationError.missingField('Subject ID');

// Invalid field
RequestValidationError.invalidField('resourceType', 'must be a string');
```

### 6. PolicyNotFoundError

Thrown when a required policy cannot be found.

**Example:**

```typescript
import { PolicyNotFoundError } from '@abac-engine/core';

try {
  // Policy lookup that fails
  const policy = policyStore.get('non-existent-policy');
  if (!policy) {
    throw new PolicyNotFoundError('non-existent-policy');
  }
} catch (error) {
  if (error instanceof PolicyNotFoundError) {
    console.log('Policy not found:', error.policyId);
  }
}
```

### 7. CombiningAlgorithmError

Thrown when combining algorithm operations fail.

**Example:**

```typescript
import { CombiningAlgorithmError } from '@abac-engine/core';

try {
  const algorithm = CombiningAlgorithmFactory.getAlgorithm('invalid-algorithm');
} catch (error) {
  if (error instanceof CombiningAlgorithmError) {
    console.log('Algorithm error:', error.message);
    console.log('Algorithm:', error.algorithm);
  }
}
```

**Static Factory Methods:**

```typescript
// Unknown algorithm
CombiningAlgorithmError.unknownAlgorithm('invalid-algorithm');

// Evaluation failed
CombiningAlgorithmError.evaluationFailed('permit-overrides', 'reason');
```

### 8. PolicyStorageError

Thrown when policy storage operations fail.

**Use Cases:**
- Failed to load policies from file
- Failed to save policy
- Failed to delete policy
- JSON parse errors

**Example:**

```typescript
import { PolicyStorageError } from '@abac-engine/core';

try {
  const policies = await loadPoliciesFromFile('./policies.json');
} catch (error) {
  if (error instanceof PolicyStorageError) {
    console.log('Storage error:', error.message);
    console.log('Operation:', error.operation);
    console.log('Policy ID:', error.policyId);
  }
}
```

**Static Factory Methods:**

```typescript
// Load failed
PolicyStorageError.loadFailed('policies.json', cause);

// Save failed
PolicyStorageError.saveFailed('policy-123', cause);

// Delete failed
PolicyStorageError.deleteFailed('policy-123', cause);
```

## Error Utilities

### wrapError()

Wraps unknown errors into ABACError instances for consistent error handling.

```typescript
import { wrapError } from '@abac-engine/core';

try {
  // Some operation that might throw any error
  await externalAPI.call();
} catch (error) {
  const wrappedError = wrapError(error, 'External API call failed');
  logger.error('API error:', wrappedError.toJSON());
  throw wrappedError;
}
```

### getErrorMessage()

Safely extracts error messages from unknown error types.

```typescript
import { getErrorMessage } from '@abac-engine/core';

try {
  await someOperation();
} catch (error) {
  const message = getErrorMessage(error);
  logger.error(message); // Always returns a string
}
```

### formatErrorForUser()

Creates user-friendly error messages from ABACError instances.

```typescript
import { formatErrorForUser } from '@abac-engine/core';

try {
  await engine.evaluate(request, policies);
} catch (error) {
  if (error instanceof ABACError) {
    const userMessage = formatErrorForUser(error);
    console.log(userMessage);
    // Output:
    // [VALIDATION_ERROR] Policy validation failed
    // Validation errors:
    //   - id: Policy ID is required
    //   - effect: Policy effect is required
    // Context:
    //   policyId: "test-policy"
  }
}
```

## Best Practices

### 1. Always Catch Specific Error Types

```typescript
try {
  await engine.evaluate(request, policies);
} catch (error) {
  if (error instanceof RequestValidationError) {
    // Handle invalid request
    return { error: 'Invalid request', field: error.field };
  } else if (error instanceof EvaluationError) {
    // Handle evaluation error
    return { error: 'Evaluation failed', policyId: error.policyId };
  } else if (error instanceof ABACError) {
    // Handle other ABAC errors
    return { error: error.message, code: error.code };
  } else {
    // Handle unknown errors
    throw error;
  }
}
```

### 2. Use Error Context for Debugging

All ABAC errors include context that helps with debugging:

```typescript
catch (error) {
  if (error instanceof ABACError) {
    logger.error('ABAC Error occurred', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    });
  }
}
```

### 3. Proper Error Propagation

Don't swallow errors silently. Use the error classes to provide context:

```typescript
// ❌ Bad - Silent failure
try {
  await provider.getAttributes(id);
} catch (error) {
  return {}; // Error is lost
}

// ✅ Good - Log and propagate
try {
  await provider.getAttributes(id);
} catch (error) {
  logger.warn('Provider error', { error: getErrorMessage(error) });
  return {}; // Graceful degradation with logging
}

// ✅ Better - Wrap and throw
try {
  await provider.getAttributes(id);
} catch (error) {
  throw AttributeResolutionError.providerError(
    category,
    id,
    providerName,
    error instanceof Error ? error : new Error(String(error))
  );
}
```

### 4. Use Static Factory Methods

Error classes provide static factory methods for common scenarios:

```typescript
// ✅ Good - Using factory method
throw RequestValidationError.missingField('Subject ID');

// ❌ Avoid - Manual construction
throw new RequestValidationError('Subject ID', 'Subject ID is required');
```

### 5. Validate Early, Fail Fast

Validate inputs at the boundaries of your system:

```typescript
function createPolicy(data: unknown): ABACPolicy {
  // Validate early
  const policy = data as ABACPolicy;
  validatePolicyOrThrow(policy); // Throws ValidationError if invalid

  return policy;
}
```

### 6. Use Error Serialization for Logging

All ABAC errors include a `toJSON()` method for structured logging:

```typescript
catch (error) {
  if (error instanceof ABACError) {
    logger.error('Error occurred', error.toJSON());
    // Logs: { name, message, code, context, timestamp, stack }
  }
}
```

## Error Recovery Strategies

### Graceful Degradation

For attribute providers, return empty objects on error to allow evaluation to continue:

```typescript
async getAttributes(id: string): Promise<Record<string, AttributeValue>> {
  try {
    return await this.fetchFromDatabase(id);
  } catch (error) {
    this.logger.warn('Database error, returning empty attributes', {
      error: getErrorMessage(error)
    });
    return {}; // Graceful degradation
  }
}
```

### Retry Logic

For transient errors, implement retry logic:

```typescript
async function evaluateWithRetry(
  request: ABACRequest,
  policies: ABACPolicy[],
  maxRetries = 3
): Promise<ABACDecision> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await engine.evaluate(request, policies);
    } catch (error) {
      if (error instanceof AttributeResolutionError && attempt < maxRetries) {
        logger.warn(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Circuit Breaker

For external services, implement circuit breaker pattern:

```typescript
class ResilientAttributeProvider extends BaseAttributeProvider {
  private failureCount = 0;
  private circuitOpen = false;
  private readonly threshold = 5;

  async getAttributes(id: string): Promise<Record<string, AttributeValue>> {
    if (this.circuitOpen) {
      this.logger.warn('Circuit breaker open, returning empty attributes');
      return {};
    }

    try {
      const attributes = await this.fetchFromExternalAPI(id);
      this.failureCount = 0; // Reset on success
      return attributes;
    } catch (error) {
      this.failureCount++;

      if (this.failureCount >= this.threshold) {
        this.circuitOpen = true;
        this.logger.error('Circuit breaker opened after threshold failures');
        setTimeout(() => {
          this.circuitOpen = false;
          this.failureCount = 0;
        }, 60000); // Reset after 1 minute
      }

      this.logger.warn('Provider error', {
        error: getErrorMessage(error),
        failureCount: this.failureCount
      });

      return {};
    }
  }
}
```

## Testing Error Handling

### Testing Error Throwing

```typescript
import { RequestValidationError, ValidationError } from '@abac-engine/core';

describe('Error Handling', () => {
  test('should throw RequestValidationError for missing subject', async () => {
    const invalidRequest = {
      subject: { id: '' },
      resource: { id: 'doc-123' },
      action: { id: 'read' }
    };

    await expect(
      engine.evaluate(invalidRequest, policies)
    ).rejects.toThrow(RequestValidationError);
  });

  test('should throw ValidationError for invalid policy', () => {
    expect(() => {
      PolicyBuilder.create('').build(); // No ID
    }).toThrow(ValidationError);
  });
});
```

### Testing Error Context

```typescript
test('should include context in errors', async () => {
  try {
    await engine.evaluate(invalidRequest, policies);
  } catch (error) {
    expect(error).toBeInstanceOf(RequestValidationError);
    expect(error.field).toBe('Subject ID');
    expect(error.code).toBe('REQUEST_VALIDATION_ERROR');
    expect(error.context).toBeDefined();
  }
});
```

## Migration Guide

If you're upgrading from a previous version that used generic `Error` classes:

### Before (Generic Errors)

```typescript
try {
  await engine.evaluate(request, policies);
} catch (error) {
  // Had to parse error message strings
  if (error.message.includes('Subject ID is required')) {
    // Handle validation error
  }
}
```

### After (Custom Error Classes)

```typescript
try {
  await engine.evaluate(request, policies);
} catch (error) {
  // Type-safe error handling
  if (error instanceof RequestValidationError) {
    console.log('Invalid field:', error.field);
  }
}
```

## Summary

The ABAC Engine's error handling system provides:

- **Type Safety**: Strongly-typed error classes for different scenarios
- **Context**: Rich metadata for debugging and logging
- **Categorization**: Clear separation of error types
- **User-Friendly**: Helper methods for formatting errors
- **Consistency**: Standardized error structure across the engine

By using these custom error classes, you can build more robust, maintainable, and debuggable ABAC implementations.
