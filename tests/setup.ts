// Jest setup file for ABAC Engine tests

// Extend Jest matchers if needed
import 'jest';

// Global test utilities
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAllowed(): R;
      toBeDenied(): R;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

// Custom matchers for authorization results
expect.extend({
  toBeAllowed(received) {
    const pass = received && received.allowed === true;
    if (pass) {
      return {
        message: () => `Expected authorization to be denied, but it was allowed`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `Expected authorization to be allowed, but it was denied: ${received?.reason || 'No reason provided'}`,
        pass: false
      };
    }
  },

  toBeDenied(received) {
    const pass = received && received.allowed === false;
    if (pass) {
      return {
        message: () => `Expected authorization to be allowed, but it was denied`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `Expected authorization to be denied, but it was allowed: ${received?.reason || 'No reason provided'}`,
        pass: false
      };
    }
  }
});

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console warnings during tests unless explicitly needed
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(10000);

// Mock Date.now() for consistent testing
const mockNow = new Date('2024-01-15T10:00:00Z').getTime();
Date.now = jest.fn(() => mockNow);

// Export test utilities
export const createTestContext = (overrides = {}) => ({
  user: {
    id: 'test-user-123',
    roles: ['user'],
    attributes: {}
  },
  environment: {
    ip: '192.168.1.100',
    time: new Date(),
    userAgent: 'test-agent'
  },
  ...overrides
});

export const createTestPolicy = () => ({
  version: '1.0.0',
  roles: {
    admin: [
      {
        actions: 'manage',
        subject: 'all'
      }
    ],
    user: [
      {
        actions: ['read', 'create'],
        subject: 'Post'
      }
    ]
  }
});
