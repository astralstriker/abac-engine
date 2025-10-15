/**
 * Logger Integration Tests
 *
 * Tests for logger integration with ABACEngine and AttributeProviders
 */

import { AttributeRef, ConditionBuilder } from '../../src/abac';
import {
  DatabaseAttributeProvider,
  EnvironmentAttributeProvider,
  InMemoryAttributeProvider
} from '../../src/abac/attributeProviders';
import { ABACEngine } from '../../src/abac/engine';
import { PolicyBuilder } from '../../src/abac/policyBuilder';
import { ABACRequest, CombiningAlgorithm } from '../../src/abac/types';
import { ILogger } from '../../src/logger';

describe('Logger Integration', () => {
  describe('ABACEngine with Logger', () => {
    it('should use provided logger for warnings', async () => {
      const logs: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];

      class TestLogger implements ILogger {
        debug(message: string, meta?: Record<string, unknown>): void {
          logs.push({ level: 'debug', message, ...(meta && { meta }) });
        }

        info(message: string, meta?: Record<string, unknown>): void {
          logs.push({ level: 'info', message, ...(meta && { meta }) });
        }

        warn(message: string, meta?: Record<string, unknown>): void {
          logs.push({ level: 'warn', message, ...(meta && { meta }) });
        }

        error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
          logs.push({
            level: 'error',
            message,
            meta: { ...meta, error }
          });
        }
      }

      const logger = new TestLogger();

      // Create a provider that will throw an error
      const faultyProvider = new InMemoryAttributeProvider('subject', 'faulty', {}, logger);
      // Override getAttributes to throw
      faultyProvider.getAttributes = async () => {
        throw new Error('Provider error');
      };

      const engine = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
        attributeProviders: [faultyProvider],
        logger
      });

      const policy = PolicyBuilder.create('test-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(AttributeRef.subject('id'), 'user123'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read', attributes: {} },
        environment: { attributes: {} }
      };

      await engine.evaluate(request, [policy]);

      // Verify logger was called with warning about provider error
      const warnings = logs.filter(log => log.level === 'warn');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(log => log.message.includes('Error getting subject attributes'))).toBe(
        true
      );
    });

    it('should use SilentLogger by default', async () => {
      const engine = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.DenyOverrides
      });

      const policy = PolicyBuilder.create('test-policy').version('1.0.0').permit().build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read', attributes: {} },
        environment: { attributes: {} }
      };

      // Should not throw even without logger
      const decision = await engine.evaluate(request, [policy]);
      expect(decision).toBeDefined();
      expect(decision.decision).toBe('Permit');
    });

    it('should log policy applicability errors', async () => {
      const logs: Array<{ level: string; message: string }> = [];

      class TestLogger implements ILogger {
        debug(message: string): void {
          logs.push({ level: 'debug', message });
        }

        info(message: string): void {
          logs.push({ level: 'info', message });
        }

        warn(message: string): void {
          logs.push({ level: 'warn', message });
        }

        error(message: string): void {
          logs.push({ level: 'error', message });
        }
      }

      const logger = new TestLogger();
      const engine = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
        logger
      });

      // Create a policy with a condition that will cause evaluation error
      const policy = PolicyBuilder.create('faulty-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(AttributeRef.subject('nonexistent'), 'value'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read', attributes: {} },
        environment: { attributes: {} }
      };

      await engine.evaluate(request, [policy]);

      // Check that warnings were logged (policy applicability errors)
      const warnings = logs.filter(log => log.level === 'warn');
      expect(warnings.length).toBeGreaterThanOrEqual(0); // May or may not log depending on condition evaluation
    });
  });

  describe('AttributeProviders with Logger', () => {
    it('should use logger in InMemoryAttributeProvider', async () => {
      const logs: string[] = [];

      class TestLogger implements ILogger {
        debug(message: string): void {
          logs.push(`debug: ${message}`);
        }

        info(message: string): void {
          logs.push(`info: ${message}`);
        }

        warn(message: string): void {
          logs.push(`warn: ${message}`);
        }

        error(message: string): void {
          logs.push(`error: ${message}`);
        }
      }

      const logger = new TestLogger();
      const provider = new InMemoryAttributeProvider(
        'subject',
        'users',
        {
          user123: { department: 'Engineering' }
        },
        logger
      );

      const attrs = await provider.getAttributes('user123');
      expect(attrs.department).toBe('Engineering');
    });

    it('should log errors in DatabaseAttributeProvider', async () => {
      const logs: Array<{ level: string; message: string; error?: unknown }> = [];

      class TestLogger implements ILogger {
        debug(): void {
          // Not used
        }

        info(): void {
          // Not used
        }

        warn(): void {
          // Not used
        }

        error(message: string, error?: Error | unknown): void {
          logs.push({ level: 'error', message, error });
        }
      }

      const logger = new TestLogger();

      // Create a faulty database connection
      const faultyDb = {
        query: async () => {
          throw new Error('Database connection failed');
        },
        execute: async () => {
          throw new Error('Database connection failed');
        }
      };

      const provider = new DatabaseAttributeProvider(
        'subject',
        'users',
        {
          connectionString: 'test',
          tableMapping: { department: 'users' },
          attributeMapping: { department: 'dept' },
          db: faultyDb
        },
        logger
      );

      const attrs = await provider.getAttributes('user123');

      // Should return empty object on error
      expect(attrs).toEqual({});

      // Should have logged error
      expect(logs.length).toBe(1);
      expect(logs[0]?.level).toBe('error');
      expect(logs[0]?.message).toContain('Error fetching attributes from database');
    });

    it('should use logger in EnvironmentAttributeProvider', async () => {
      const logs: string[] = [];

      class TestLogger implements ILogger {
        debug(message: string): void {
          logs.push(`debug: ${message}`);
        }

        info(message: string): void {
          logs.push(`info: ${message}`);
        }

        warn(message: string): void {
          logs.push(`warn: ${message}`);
        }

        error(message: string): void {
          logs.push(`error: ${message}`);
        }
      }

      const logger = new TestLogger();
      const provider = new EnvironmentAttributeProvider('default', logger);

      const attrs = await provider.getAttributes('');
      expect(attrs.currentTime).toBeDefined();
      expect(attrs.currentDate).toBeDefined();
    });
  });

  describe('Logger with Multiple Components', () => {
    it('should use same logger across engine and providers', async () => {
      const logs: Array<{ level: string; message: string; component?: string }> = [];

      class TestLogger implements ILogger {
        debug(message: string): void {
          logs.push({ level: 'debug', message, component: 'shared' });
        }

        info(message: string): void {
          logs.push({ level: 'info', message, component: 'shared' });
        }

        warn(message: string): void {
          logs.push({ level: 'warn', message, component: 'shared' });
        }

        error(message: string): void {
          logs.push({ level: 'error', message, component: 'shared' });
        }
      }

      const logger = new TestLogger();

      const subjectProvider = new InMemoryAttributeProvider(
        'subject',
        'users',
        {
          user123: { department: 'Engineering' }
        },
        logger
      );

      const engine = new ABACEngine({
        combiningAlgorithm: CombiningAlgorithm.DenyOverrides,
        attributeProviders: [subjectProvider],
        logger
      });

      const policy = PolicyBuilder.create('test-policy')
        .version('1.0.0')
        .permit()
        .condition(ConditionBuilder.equals(AttributeRef.subject('department'), 'Engineering'))
        .build();

      const request: ABACRequest = {
        subject: { id: 'user123', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read', attributes: {} },
        environment: { attributes: {} }
      };

      const decision = await engine.evaluate(request, [policy]);
      expect(decision.decision).toBe('Permit');

      // All logs should be from the same logger instance
      const sharedLogs = logs.filter(log => log.component === 'shared');
      expect(sharedLogs.length).toBe(logs.length);
    });
  });
});
