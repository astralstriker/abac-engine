/**
 * Logger Usage Examples
 *
 * This example demonstrates how to use the logger interface with the ABAC Engine.
 */

import {
  ABACEngine,
  AttributeRef,
  CombiningAlgorithm,
  ConditionBuilder,
  ConsoleLogger,
  createLogger,
  ILogger,
  InMemoryAttributeProvider,
  LogLevel,
  PolicyBuilder
} from '../src';
import type { ABACRequest } from '../src/abac/types';

/**
 * Example 1: Using the default SilentLogger (no output)
 */
async function example1_SilentLogger() {
  console.log('=== Example 1: Silent Logger (Default) ===\n');

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides
    // No logger specified - uses SilentLogger by default
  });

  const policy = PolicyBuilder.create('example-policy').version('1.0.0').permit().build();

  const request: ABACRequest = {
    subject: { id: 'user123', attributes: {} },
    resource: { id: 'doc1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, [policy]);
  console.log('Decision:', decision.decision);
  console.log('Note: No internal logging output (SilentLogger is default)\n');
}

/**
 * Example 2: Using ConsoleLogger with different log levels
 */
async function example2_ConsoleLogger() {
  console.log('=== Example 2: Console Logger with Log Levels ===\n');

  // Create logger with Warn level (only warnings and errors)
  const logger = new ConsoleLogger(LogLevel.Warn);

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    logger
  });

  const policy = PolicyBuilder.create('test-policy')
    .version('1.0.0')
    .permit()
    .condition(ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering'))
    .build();

  const request: ABACRequest = {
    subject: { id: 'user123', attributes: { department: 'Sales' } },
    resource: { id: 'doc1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, [policy]);
  console.log('Decision:', decision.decision);
  console.log('\n');
}

/**
 * Example 3: Custom Logger Implementation
 */
async function example3_CustomLogger() {
  console.log('=== Example 3: Custom Logger Implementation ===\n');

  class CustomLogger implements ILogger {
    private logs: Array<{ level: string; message: string; timestamp: Date }> = [];

    debug(message: string, meta?: Record<string, unknown>): void {
      this.log('DEBUG', message, meta);
    }

    info(message: string, meta?: Record<string, unknown>): void {
      this.log('INFO', message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
      this.log('WARN', message, meta);
    }

    error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('ERROR', `${message} - ${errorMsg}`, meta);
    }

    private log(level: string, message: string, meta?: Record<string, unknown>): void {
      const timestamp = new Date();
      this.logs.push({ level, message, timestamp });

      const metaStr = meta ? ` | meta: ${JSON.stringify(meta)}` : '';
      console.log(`[${timestamp.toISOString()}] [${level}] ${message}${metaStr}`);
    }

    getLogs() {
      return this.logs;
    }

    getLogCount() {
      return this.logs.length;
    }
  }

  const logger = new CustomLogger();

  // Create a faulty provider to trigger logging
  const faultyProvider = new InMemoryAttributeProvider('subject', 'users', {}, logger);
  // Override to simulate an error
  const originalGetAttributes = faultyProvider.getAttributes.bind(faultyProvider);
  faultyProvider.getAttributes = async (id: string) => {
    if (id === 'error-user') {
      throw new Error('Simulated provider error');
    }
    return originalGetAttributes(id);
  };

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    attributeProviders: [faultyProvider],
    logger
  });

  const policy = PolicyBuilder.create('test-policy').version('1.0.0').permit().build();

  const request: ABACRequest = {
    subject: { id: 'error-user', attributes: {} },
    resource: { id: 'doc1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  await engine.evaluate(request, [policy]);

  console.log(`\nTotal logs captured: ${logger.getLogCount()}`);
  console.log('\n');
}

/**
 * Example 4: Using createLogger helper
 */
async function example4_CreateLogger() {
  console.log('=== Example 4: Using createLogger Helper ===\n');

  // Quick way to create a logger
  const logger = createLogger(LogLevel.Info);

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    logger
  });

  const policy = PolicyBuilder.create('info-policy').version('1.0.0').permit().build();

  const request: ABACRequest = {
    subject: { id: 'user123', attributes: {} },
    resource: { id: 'doc1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, [policy]);
  console.log('Decision:', decision.decision);
  console.log('\n');
}

/**
 * Example 5: Shared Logger Across Multiple Components
 */
async function example5_SharedLogger() {
  console.log('=== Example 5: Shared Logger Across Components ===\n');

  const logger = new ConsoleLogger(LogLevel.Debug);

  const subjectProvider = new InMemoryAttributeProvider(
    'subject',
    'users',
    {
      alice: { department: 'Engineering', clearanceLevel: 3 },
      bob: { department: 'Sales', clearanceLevel: 1 }
    },
    logger // Use same logger
  );

  const resourceProvider = new InMemoryAttributeProvider(
    'resource',
    'documents',
    {
      'doc-1': { classification: 2, owner: 'alice' },
      'doc-2': { classification: 1, owner: 'bob' }
    },
    logger // Use same logger
  );

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    attributeProviders: [subjectProvider, resourceProvider],
    logger // Use same logger
  });

  const policy = PolicyBuilder.create('clearance-policy')
    .version('1.0.0')
    .permit()
    .description('User must have sufficient clearance level')
    .condition(
      ConditionBuilder.greaterThanOrEqual(
        AttributeRef.subject('clearanceLevel'),
        AttributeRef.resource('classification')
      )
    )
    .build();

  const request: ABACRequest = {
    subject: { id: 'alice', attributes: {} },
    resource: { id: 'doc-1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, [policy]);
  console.log('Decision for Alice accessing doc-1:', decision.decision);
  console.log('\n');
}

/**
 * Example 6: Production-Ready Logger with Winston
 */
async function example6_WinstonStyleLogger() {
  console.log('=== Example 6: Production-Ready Logger Pattern ===\n');

  // Simulating a Winston-style logger interface
  class ProductionLogger implements ILogger {
    private context: string;

    constructor(context: string = 'ABAC') {
      this.context = context;
    }

    debug(message: string, meta?: Record<string, unknown>): void {
      this.write('DEBUG', message, meta);
    }

    info(message: string, meta?: Record<string, unknown>): void {
      this.write('INFO', message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
      this.write('WARN', message, meta);
    }

    error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
      const errorDetails =
        error instanceof Error ? { stack: error.stack, message: error.message } : { error };
      this.write('ERROR', message, { ...errorDetails, ...meta });
    }

    private write(level: string, message: string, meta?: Record<string, unknown>): void {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        ...(meta && { meta })
      };

      // In production, this would write to file, send to logging service, etc.
      console.log(JSON.stringify(logEntry));
    }
  }

  const logger = new ProductionLogger('ABAC-Engine');

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    logger,
    enableAuditLog: true,
    enablePerformanceMetrics: true
  });

  const policy = PolicyBuilder.create('prod-policy').version('1.0.0').permit().build();

  const request: ABACRequest = {
    subject: { id: 'user123', attributes: {} },
    resource: { id: 'doc1', type: 'document', attributes: {} },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, [policy]);
  console.log('\nDecision:', decision.decision);
  console.log('\n');
}

/**
 * Example 7: Logging for Debugging
 */
async function example7_DebuggingWithLogs() {
  console.log('=== Example 7: Debugging with Detailed Logs ===\n');

  const logger = new ConsoleLogger(LogLevel.Debug);

  const subjectProvider = new InMemoryAttributeProvider(
    'subject',
    'users',
    {
      'user-123': { department: 'Engineering', role: 'developer' }
    },
    logger
  );

  const engine = new ABACEngine({
    combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
    attributeProviders: [subjectProvider],
    logger,
    enableAuditLog: true
  });

  const policies = [
    PolicyBuilder.create('policy-1')
      .version('1.0.0')
      .permit()
      .description('Engineering can read engineering docs')
      .condition(ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering'))
      .build(),

    PolicyBuilder.create('policy-2')
      .version('1.0.0')
      .deny()
      .description('Deny contractors')
      .condition(ConditionBuilder.equals(AttributeRef.subject('role'), 'contractor'))
      .build()
  ];

  const request: ABACRequest = {
    subject: { id: 'user-123', attributes: {} },
    resource: { id: 'eng-doc', type: 'document', attributes: { department: 'Engineering' } },
    action: { id: 'read', attributes: {} },
    environment: { attributes: {} }
  };

  const decision = await engine.evaluate(request, policies);

  console.log('\nDecision:', decision.decision);
  console.log(
    'Matched Policies:',
    decision.matchedPolicies.map(p => p.id)
  );
  console.log('\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  await example1_SilentLogger();
  await example2_ConsoleLogger();
  await example3_CustomLogger();
  await example4_CreateLogger();
  await example5_SharedLogger();
  await example6_WinstonStyleLogger();
  await example7_DebuggingWithLogs();

  console.log('=== All Logger Examples Completed ===');
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_SilentLogger,
  example2_ConsoleLogger,
  example3_CustomLogger,
  example4_CreateLogger,
  example5_SharedLogger,
  example6_WinstonStyleLogger,
  example7_DebuggingWithLogs
};
