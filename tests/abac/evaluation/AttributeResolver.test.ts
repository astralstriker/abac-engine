/**
 * Tests for AttributeResolver
 */

import { AttributeResolver } from '../../../src/abac/evaluation/AttributeResolver';
import { ABACRequest, AttributeProvider, AttributeValue } from '../../../src/abac/types';
import { SilentLogger } from '../../../src/logger';

describe('AttributeResolver', () => {
  let resolver: AttributeResolver;
  let logger: SilentLogger;

  beforeEach(() => {
    logger = new SilentLogger();
    resolver = new AttributeResolver(logger);
  });

  describe('constructor', () => {
    it('should create an instance with no providers', () => {
      expect(resolver).toBeInstanceOf(AttributeResolver);
      expect(resolver.getProviders()).toHaveLength(0);
    });

    it('should create an instance with initial providers', () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'test-provider',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      const resolverWithProviders = new AttributeResolver(logger, [provider]);
      expect(resolverWithProviders.getProviders()).toHaveLength(1);
    });
  });

  describe('addProvider', () => {
    it('should add an attribute provider', () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'test-provider',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);
      expect(resolver.getProviders()).toHaveLength(1);
      expect(resolver.getProviders()[0]).toBe(provider);
    });

    it('should add multiple providers', () => {
      const provider1: AttributeProvider = {
        category: 'subject',
        name: 'provider-1',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      const provider2: AttributeProvider = {
        category: 'resource',
        name: 'provider-2',
        getAttributes: async () => ({ owner: 'user1' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider1);
      resolver.addProvider(provider2);
      expect(resolver.getProviders()).toHaveLength(2);
    });
  });

  describe('removeProvider', () => {
    it('should remove an attribute provider', () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'test-provider',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);
      expect(resolver.getProviders()).toHaveLength(1);

      resolver.removeProvider('subject-test-provider');
      expect(resolver.getProviders()).toHaveLength(0);
    });

    it('should not throw when removing non-existent provider', () => {
      expect(() => resolver.removeProvider('non-existent')).not.toThrow();
    });
  });

  describe('getProviders', () => {
    it('should return empty array when no providers', () => {
      expect(resolver.getProviders()).toEqual([]);
    });

    it('should return all providers', () => {
      const provider1: AttributeProvider = {
        category: 'subject',
        name: 'provider-1',
        getAttributes: async () => ({}),
        supportsAttribute: () => true
      };

      const provider2: AttributeProvider = {
        category: 'resource',
        name: 'provider-2',
        getAttributes: async () => ({}),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider1);
      resolver.addProvider(provider2);

      const providers = resolver.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers).toContain(provider1);
      expect(providers).toContain(provider2);
    });
  });

  describe('getAttributeValue', () => {
    const request: ABACRequest = {
      subject: {
        id: 'user1',
        attributes: { role: 'admin', department: 'IT' }
      },
      resource: {
        id: 'doc1',
        type: 'document',
        attributes: { classification: 'secret' }
      },
      action: {
        id: 'read',
        attributes: { method: 'GET' }
      },
      environment: {
        attributes: { ipAddress: '192.168.1.1' }
      }
    };

    it('should get subject id', () => {
      const value = resolver.getAttributeValue(request, 'subject', 'id');
      expect(value).toBe('user1');
    });

    it('should get resource id', () => {
      const value = resolver.getAttributeValue(request, 'resource', 'id');
      expect(value).toBe('doc1');
    });

    it('should get action id', () => {
      const value = resolver.getAttributeValue(request, 'action', 'id');
      expect(value).toBe('read');
    });

    it('should get resource type', () => {
      const value = resolver.getAttributeValue(request, 'resource', 'type');
      expect(value).toBe('document');
    });

    it('should get subject attribute', () => {
      const value = resolver.getAttributeValue(request, 'subject', 'role');
      expect(value).toBe('admin');
    });

    it('should get resource attribute', () => {
      const value = resolver.getAttributeValue(request, 'resource', 'classification');
      expect(value).toBe('secret');
    });

    it('should get action attribute', () => {
      const value = resolver.getAttributeValue(request, 'action', 'method');
      expect(value).toBe('GET');
    });

    it('should get environment attribute', () => {
      const value = resolver.getAttributeValue(request, 'environment', 'ipAddress');
      expect(value).toBe('192.168.1.1');
    });

    it('should return undefined for non-existent attribute', () => {
      const value = resolver.getAttributeValue(request, 'subject', 'nonexistent');
      expect(value).toBeUndefined();
    });

    it('should handle nested paths', () => {
      const requestWithNested: ABACRequest = {
        subject: {
          id: 'user1',
          attributes: {
            profile: {
              name: 'John Doe',
              address: { city: 'New York' }
            } as any
          }
        },
        resource: { id: 'res1', type: 'file', attributes: {} },
        action: { id: 'read' }
      };

      const value = resolver.getAttributeValue(requestWithNested, 'subject', 'profile', 'name');
      expect(value).toBe('John Doe');
    });

    it('should handle deeply nested paths', () => {
      const requestWithNested: ABACRequest = {
        subject: {
          id: 'user1',
          attributes: {
            profile: {
              address: { city: 'New York', zip: '10001' }
            } as any
          }
        },
        resource: { id: 'res1', type: 'file', attributes: {} },
        action: { id: 'read' }
      };

      const value = resolver.getAttributeValue(
        requestWithNested,
        'subject',
        'profile',
        'address.city'
      );
      expect(value).toBe('New York');
    });

    it('should return undefined for invalid nested path', () => {
      const requestWithNested: ABACRequest = {
        subject: {
          id: 'user1',
          attributes: {
            profile: { name: 'John Doe' } as any
          }
        },
        resource: { id: 'res1', type: 'file', attributes: {} },
        action: { id: 'read' }
      };

      const value = resolver.getAttributeValue(
        requestWithNested,
        'subject',
        'profile',
        'address.city'
      );
      expect(value).toBeUndefined();
    });
  });

  describe('enhanceRequest', () => {
    it('should enhance request with subject attributes from provider', async () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'user-provider',
        getAttributes: async (id: string): Promise<Record<string, AttributeValue>> => {
          if (id === 'user1') {
            return { role: 'admin', department: 'IT' };
          }
          return {};
        },
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.subject.attributes.role).toBe('admin');
      expect(enhanced.subject.attributes.department).toBe('IT');
    });

    it('should enhance request with resource attributes from provider', async () => {
      const provider: AttributeProvider = {
        category: 'resource',
        name: 'resource-provider',
        getAttributes: async (id: string): Promise<Record<string, AttributeValue>> => {
          if (id === 'doc1') {
            return { owner: 'user1', classification: 'secret' };
          }
          return {};
        },
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.resource.attributes.owner).toBe('user1');
      expect(enhanced.resource.attributes.classification).toBe('secret');
    });

    it('should enhance request with environment attributes from provider', async () => {
      const provider: AttributeProvider = {
        category: 'environment',
        name: 'env-provider',
        getAttributes: async () => ({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.environment?.attributes?.ipAddress).toBe('192.168.1.1');
      expect(enhanced.environment?.attributes?.userAgent).toBe('Mozilla/5.0');
    });

    it('should merge attributes with existing ones', async () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'user-provider',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: { department: 'IT' } },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.subject.attributes.department).toBe('IT');
      expect(enhanced.subject.attributes.role).toBe('admin');
    });

    it('should handle provider errors gracefully', async () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'failing-provider',
        getAttributes: async () => {
          throw new Error('Provider error');
        },
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: { department: 'IT' } },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      // Original attributes should remain
      expect(enhanced.subject.attributes.department).toBe('IT');
    });

    it('should not mutate the original request', async () => {
      const provider: AttributeProvider = {
        category: 'subject',
        name: 'user-provider',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      // Original should not have the new attribute
      expect(request.subject.attributes.role).toBeUndefined();
      // Enhanced should have the new attribute
      expect(enhanced.subject.attributes.role).toBe('admin');
    });

    it('should handle multiple providers for same category', async () => {
      const provider1: AttributeProvider = {
        category: 'subject',
        name: 'provider-1',
        getAttributes: async () => ({ role: 'admin' }),
        supportsAttribute: () => true
      };

      const provider2: AttributeProvider = {
        category: 'subject',
        name: 'provider-2',
        getAttributes: async () => ({ department: 'IT' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider1);
      resolver.addProvider(provider2);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.subject.attributes.role).toBe('admin');
      expect(enhanced.subject.attributes.department).toBe('IT');
    });

    it('should create environment object if not present', async () => {
      const provider: AttributeProvider = {
        category: 'environment',
        name: 'env-provider',
        getAttributes: async () => ({ ipAddress: '192.168.1.1' }),
        supportsAttribute: () => true
      };

      resolver.addProvider(provider);

      const request: ABACRequest = {
        subject: { id: 'user1', attributes: {} },
        resource: { id: 'doc1', type: 'document', attributes: {} },
        action: { id: 'read' }
      };

      const enhanced = await resolver.enhanceRequest(request);

      expect(enhanced.environment).toBeDefined();
      expect(enhanced.environment?.attributes?.ipAddress).toBe('192.168.1.1');
    });
  });
});
