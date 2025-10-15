/**
 * Function Registry Service
 *
 * Manages custom and built-in condition functions for the ABAC engine.
 * Functions can be used in FunctionCondition evaluations within policies.
 */

import { ConditionFunction } from '../types';

/**
 * Service for managing condition functions
 */
export class FunctionRegistry {
  private functions: Map<string, ConditionFunction> = new Map();

  constructor() {
    this.registerBuiltInFunctions();
  }

  /**
   * Register a custom function
   *
   * @param name - Function name (used in policies)
   * @param fn - Function implementation
   */
  register(name: string, fn: ConditionFunction): void {
    this.functions.set(name, fn);
  }

  /**
   * Get a function by name
   *
   * @param name - Function name
   * @returns Function implementation or undefined
   */
  get(name: string): ConditionFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Check if a function is registered
   *
   * @param name - Function name
   * @returns true if registered, false otherwise
   */
  has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Remove a function
   *
   * @param name - Function name
   * @returns true if removed, false if not found
   */
  remove(name: string): boolean {
    return this.functions.delete(name);
  }

  /**
   * Get all registered function names
   *
   * @returns Array of function names
   */
  getRegisteredFunctions(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Clear all custom functions (keeps built-in functions)
   */
  clearCustomFunctions(): void {
    const builtInNames = this.getBuiltInFunctionNames();
    const allNames = this.getRegisteredFunctions();

    for (const name of allNames) {
      if (!builtInNames.includes(name)) {
        this.functions.delete(name);
      }
    }
  }

  /**
   * Clear all functions including built-in ones
   */
  clearAll(): void {
    this.functions.clear();
  }

  /**
   * Get built-in function names
   *
   * @returns Array of built-in function names
   */
  private getBuiltInFunctionNames(): string[] {
    return [
      'is_current_time',
      'is_current_date',
      'string_length_equals',
      'is_upper_case',
      'is_lower_case',
      'array_size_equals',
      'array_contains'
    ];
  }

  /**
   * Register built-in functions
   */
  private registerBuiltInFunctions(): void {
    // Time-based functions
    this.functions.set('is_current_time', (args, _request) => {
      const now = new Date();
      const targetTime = args[0];
      return now.getTime() === new Date(targetTime as string).getTime();
    });

    this.functions.set('is_current_date', (args, _request) => {
      const today = new Date().toISOString().split('T')[0];
      const targetDate = String(args[0] || '');
      return today === targetDate;
    });

    // String utility functions
    this.functions.set('string_length_equals', args => {
      const str = String(args[0] || '');
      const expectedLength = Number(args[1] || 0);
      return str.length === expectedLength;
    });

    this.functions.set('is_upper_case', args => {
      const str = String(args[0] || '');
      return str === str.toUpperCase();
    });

    this.functions.set('is_lower_case', args => {
      const str = String(args[0] || '');
      return str === str.toLowerCase();
    });

    // Array functions
    this.functions.set('array_size_equals', args => {
      const arr = args[0];
      const expectedSize = Number(args[1] || 0);
      return Array.isArray(arr) && arr.length === expectedSize;
    });

    this.functions.set('array_contains', args => {
      const arr = args[0];
      const value = args[1];
      return Array.isArray(arr) && (arr as unknown[]).includes(value);
    });
  }

  /**
   * Reset to default state (only built-in functions)
   */
  reset(): void {
    this.functions.clear();
    this.registerBuiltInFunctions();
  }
}
