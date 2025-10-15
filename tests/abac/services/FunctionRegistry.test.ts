/**
 * FunctionRegistry Tests
 *
 * Tests for the FunctionRegistry service
 */

import { FunctionRegistry } from '../../../src/abac/services/FunctionRegistry';
import { ABACRequest } from '../../../src/abac/types';

describe('FunctionRegistry', () => {
  let registry: FunctionRegistry;
  let mockRequest: ABACRequest;

  beforeEach(() => {
    registry = new FunctionRegistry();
    mockRequest = {
      subject: { id: 'user1', attributes: {} },
      resource: { id: 'res1', type: 'document', attributes: {} },
      action: { id: 'read', attributes: {} }
    };
  });

  describe('Built-in Functions', () => {
    test('should register built-in functions on construction', () => {
      expect(registry.has('is_current_time')).toBe(true);
      expect(registry.has('is_current_date')).toBe(true);
      expect(registry.has('string_length_equals')).toBe(true);
      expect(registry.has('is_upper_case')).toBe(true);
      expect(registry.has('is_lower_case')).toBe(true);
      expect(registry.has('array_size_equals')).toBe(true);
      expect(registry.has('array_contains')).toBe(true);
    });

    test('should execute is_current_date function', () => {
      const func = registry.get('is_current_date');
      expect(func).toBeDefined();

      const today = new Date().toISOString().split('T')[0] || '';
      const result = func!([today], mockRequest);
      expect(result).toBe(true);

      const result2 = func!(['2020-01-01'], mockRequest);
      expect(result2).toBe(false);
    });

    test('should execute string_length_equals function', () => {
      const func = registry.get('string_length_equals');
      expect(func).toBeDefined();

      expect(func!(['hello', 5], mockRequest)).toBe(true);
      expect(func!(['hello', 3], mockRequest)).toBe(false);
      expect(func!(['', 0], mockRequest)).toBe(true);
    });

    test('should execute is_upper_case function', () => {
      const func = registry.get('is_upper_case');
      expect(func).toBeDefined();

      expect(func!(['HELLO'], mockRequest)).toBe(true);
      expect(func!(['hello'], mockRequest)).toBe(false);
      expect(func!(['HeLLo'], mockRequest)).toBe(false);
    });

    test('should execute is_lower_case function', () => {
      const func = registry.get('is_lower_case');
      expect(func).toBeDefined();

      expect(func!(['hello'], mockRequest)).toBe(true);
      expect(func!(['HELLO'], mockRequest)).toBe(false);
      expect(func!(['HeLLo'], mockRequest)).toBe(false);
    });

    test('should execute array_size_equals function', () => {
      const func = registry.get('array_size_equals');
      expect(func).toBeDefined();

      expect(func!([[1, 2, 3], 3], mockRequest)).toBe(true);
      expect(func!([[1, 2, 3], 2], mockRequest)).toBe(false);
      expect(func!([[], 0], mockRequest)).toBe(true);
    });

    test('should execute array_contains function', () => {
      const func = registry.get('array_contains');
      expect(func).toBeDefined();

      expect(func!([[1, 2, 3], 2], mockRequest)).toBe(true);
      expect(func!([[1, 2, 3], 5], mockRequest)).toBe(false);
      expect(func!([['a', 'b'], 'a'], mockRequest)).toBe(true);
    });
  });

  describe('Custom Functions', () => {
    test('should register a custom function', () => {
      const customFunc = (args: unknown[]) => args[0] === 'test';
      registry.register('my_custom_func', customFunc);

      expect(registry.has('my_custom_func')).toBe(true);
      const func = registry.get('my_custom_func');
      expect(func).toBe(customFunc);
    });

    test('should execute a custom function', () => {
      const customFunc = (args: unknown[]) => {
        const num = args[0] as number;
        return num > 10;
      };
      registry.register('is_greater_than_ten', customFunc);

      const func = registry.get('is_greater_than_ten');
      expect(func!([15], mockRequest)).toBe(true);
      expect(func!([5], mockRequest)).toBe(false);
    });

    test('should override built-in function with custom one', () => {
      const customFunc = () => true;
      registry.register('is_upper_case', customFunc);

      const func = registry.get('is_upper_case');
      expect(func).toBe(customFunc);
      expect(func!([], mockRequest)).toBe(true);
    });
  });

  describe('Function Management', () => {
    test('should get function by name', () => {
      const func = registry.get('is_upper_case');
      expect(func).toBeDefined();
      expect(typeof func).toBe('function');
    });

    test('should return undefined for non-existent function', () => {
      const func = registry.get('non_existent');
      expect(func).toBeUndefined();
    });

    test('should check if function exists', () => {
      expect(registry.has('is_upper_case')).toBe(true);
      expect(registry.has('non_existent')).toBe(false);
    });

    test('should remove a function', () => {
      registry.register('temp_func', () => true);
      expect(registry.has('temp_func')).toBe(true);

      const removed = registry.remove('temp_func');
      expect(removed).toBe(true);
      expect(registry.has('temp_func')).toBe(false);
    });

    test('should return false when removing non-existent function', () => {
      const removed = registry.remove('non_existent');
      expect(removed).toBe(false);
    });

    test('should get all registered function names', () => {
      const names = registry.getRegisteredFunctions();
      expect(names).toContain('is_upper_case');
      expect(names).toContain('is_lower_case');
      expect(names).toContain('array_contains');
      expect(names.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Clear Functions', () => {
    test('should clear only custom functions', () => {
      registry.register('custom1', () => true);
      registry.register('custom2', () => false);

      expect(registry.has('custom1')).toBe(true);
      expect(registry.has('is_upper_case')).toBe(true);

      registry.clearCustomFunctions();

      expect(registry.has('custom1')).toBe(false);
      expect(registry.has('custom2')).toBe(false);
      expect(registry.has('is_upper_case')).toBe(true);
      expect(registry.has('array_contains')).toBe(true);
    });

    test('should clear all functions', () => {
      registry.register('custom1', () => true);

      registry.clearAll();

      expect(registry.has('custom1')).toBe(false);
      expect(registry.has('is_upper_case')).toBe(false);
      expect(registry.getRegisteredFunctions().length).toBe(0);
    });

    test('should reset to default state', () => {
      registry.register('custom1', () => true);
      registry.remove('is_upper_case');

      registry.reset();

      expect(registry.has('custom1')).toBe(false);
      expect(registry.has('is_upper_case')).toBe(true);
      expect(registry.has('array_contains')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string function name', () => {
      const func = () => true;
      registry.register('', func);
      expect(registry.has('')).toBe(true);
      expect(registry.get('')).toBe(func);
    });

    test('should handle function names with special characters', () => {
      const func = () => true;
      registry.register('my-special_func.v2', func);
      expect(registry.has('my-special_func.v2')).toBe(true);
    });

    test('should handle functions that throw errors', () => {
      const errorFunc = () => {
        throw new Error('Function error');
      };
      registry.register('error_func', errorFunc);

      const func = registry.get('error_func');
      expect(() => func!([], mockRequest)).toThrow('Function error');
    });

    test('should handle async functions', async () => {
      const asyncFunc = async () => {
        return Promise.resolve(true);
      };
      registry.register('async_func', asyncFunc);

      const func = registry.get('async_func');
      const result = await func!([], mockRequest);
      expect(result).toBe(true);
    });
  });

  describe('Function with Request Context', () => {
    test('should pass request context to function', () => {
      const contextFunc = (args: unknown[], request: ABACRequest) => {
        return request !== undefined && request.subject !== undefined;
      };
      registry.register('context_func', contextFunc);

      const func = registry.get('context_func');
      expect(func!([], mockRequest)).toBe(true);
    });

    test('should pass attribute providers to function', () => {
      const providersFunc = (args: unknown[], request: ABACRequest, providers?: unknown[]) => {
        return providers !== undefined && providers.length >= 0;
      };
      registry.register('providers_func', providersFunc);

      const func = registry.get('providers_func');
      expect(func!([], mockRequest, [])).toBe(true);
    });
  });
});
