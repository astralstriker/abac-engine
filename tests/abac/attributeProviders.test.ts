/**
 * Attribute Providers Tests
 *
 * Comprehensive tests for all attribute provider implementations
 */

import {
  CachedAttributeProvider,
  CompositeAttributeProvider,
  DatabaseAttributeProvider,
  EnvironmentAttributeProvider,
  InMemoryAttributeProvider,
  LdapAttributeProvider,
  RestApiAttributeProvider
} from '../../src/abac/attributeProviders';

describe('Attribute Providers', () => {
  describe('InMemoryAttributeProvider', () => {
    let provider: InMemoryAttributeProvider;

    beforeEach(() => {
      provider = new InMemoryAttributeProvider('subject', 'users', {
        user123: {
          department: 'Engineering',
          clearanceLevel: 3,
          role: 'Developer'
        },
        user456: {
          department: 'Finance',
          clearanceLevel: 2
        }
      });
    });

    test('should retrieve attributes for existing entity', async () => {
      const attributes = await provider.getAttributes('user123');

      expect(attributes).toEqual({
        department: 'Engineering',
        clearanceLevel: 3,
        role: 'Developer'
      });
    });

    test('should return empty object for non-existent entity', async () => {
      const attributes = await provider.getAttributes('user999');
      expect(attributes).toEqual({});
    });

    test('should check if attribute is supported', () => {
      expect(provider.supportsAttribute('department')).toBe(true);
      expect(provider.supportsAttribute('clearanceLevel')).toBe(true);
      expect(provider.supportsAttribute('nonexistent')).toBe(false);
    });

    test('should add and get attributes', async () => {
      provider.addAttributes('user789', { department: 'HR', clearanceLevel: 1 });

      const attributes = await provider.getAttributes('user789');
      expect(attributes).toEqual({
        department: 'HR',
        clearanceLevel: 1
      });
    });

    test('should update existing attributes', async () => {
      provider.addAttributes('user123', { clearanceLevel: 4 });

      const attributes = await provider.getAttributes('user123');
      expect(attributes.clearanceLevel).toBe(4);
    });

    test('should remove attributes', async () => {
      provider.removeAttributes('user123');

      const attributes = await provider.getAttributes('user123');
      expect(attributes).toEqual({});
    });
  });

  describe('DatabaseAttributeProvider', () => {
    let provider: DatabaseAttributeProvider;
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        query: jest.fn()
      };

      provider = new DatabaseAttributeProvider('subject', 'users', {
        connectionString: 'postgresql://localhost/test',
        tableMapping: {
          department: 'users',
          clearanceLevel: 'users',
          manager: 'user_hierarchy'
        },
        attributeMapping: {
          department: 'dept_name',
          clearanceLevel: 'security_level'
        }
      });

      provider.setDatabase(mockDb);
    });

    test('should fetch attributes from database', async () => {
      mockDb.query.mockResolvedValueOnce([{ dept_name: 'Engineering', security_level: 3 }]);

      const attributes = await provider.getAttributes('user123');

      expect(mockDb.query).toHaveBeenCalled();
      expect(attributes).toEqual({
        department: 'Engineering',
        clearanceLevel: 3
      });
    });

    test('should return empty object on database error', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const attributes = await provider.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should handle empty result set', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const attributes = await provider.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should support configured attributes', () => {
      expect(provider.supportsAttribute('department')).toBe(true);
      expect(provider.supportsAttribute('clearanceLevel')).toBe(true);
      expect(provider.supportsAttribute('unknown')).toBe(false);
    });

    test('should handle null database', async () => {
      const providerWithoutDb = new DatabaseAttributeProvider('subject', 'users', {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost/test',
        tableMapping: { department: 'users' },
        attributeMapping: {}
      });

      await expect(providerWithoutDb.getAttributes('user123')).rejects.toThrow(
        "Attribute provider 'users' not properly initialized"
      );
    });
  });

  describe('RestApiAttributeProvider', () => {
    let provider: RestApiAttributeProvider;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      provider = new RestApiAttributeProvider('resource', 'documents', {
        baseUrl: 'https://api.example.com',
        endpoints: {
          classification: '/documents/:id/classification',
          owner: '/documents/:id/owner'
        },
        headers: {
          Authorization: 'Bearer token123'
        },
        timeout: 5000
      });

      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('should fetch attributes from API', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ value: 'secret' })
      });

      const attributes = await provider.getAttributes('doc123');

      expect(global.fetch).toHaveBeenCalled();
      expect(attributes).toHaveProperty('value');
    });

    test('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const attributes = await provider.getAttributes('doc123');
      expect(attributes).toEqual({});
    });

    test('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const attributes = await provider.getAttributes('doc123');
      expect(attributes).toEqual({});
    });

    test('should handle timeout', async () => {
      global.fetch = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 10000)
            )
        );

      const attributes = await provider.getAttributes('doc123');
      expect(attributes).toEqual({});
    }, 15000);

    test('should support configured endpoints', () => {
      expect(provider.supportsAttribute('classification')).toBe(true);
      expect(provider.supportsAttribute('owner')).toBe(true);
      expect(provider.supportsAttribute('unknown')).toBe(false);
    });

    test('should merge object responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ classification: 'secret', sensitivity: 'high' })
      });

      const attributes = await provider.getAttributes('doc123');
      expect(attributes).toHaveProperty('classification');
      expect(attributes).toHaveProperty('sensitivity');
    });

    test('should handle primitive responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => 'secret'
      });

      const attributes = await provider.getAttributes('doc123');
      expect(Object.keys(attributes).length).toBeGreaterThan(0);
    });
  });

  describe('LdapAttributeProvider', () => {
    let provider: LdapAttributeProvider;
    let mockLdapClient: any;

    beforeEach(() => {
      mockLdapClient = {
        search: jest.fn()
      };

      provider = new LdapAttributeProvider('subject', 'ad', {
        url: 'ldap://ldap.example.com',
        bindDn: 'CN=service,DC=example,DC=com',
        bindPassword: 'password',
        searchBase: 'DC=example,DC=com',
        attributeMapping: {
          department: 'department',
          manager: 'manager',
          groups: 'memberOf'
        },
        ldapClient: mockLdapClient
      });
    });

    test('should fetch attributes from LDAP', async () => {
      mockLdapClient.search.mockResolvedValue([
        {
          department: 'Engineering',
          manager: 'CN=John,DC=example,DC=com',
          memberOf: ['CN=Developers,DC=example,DC=com']
        }
      ]);

      const attributes = await provider.getAttributes('user123');

      expect(mockLdapClient.search).toHaveBeenCalled();
      expect(attributes).toEqual({
        department: 'Engineering',
        manager: 'CN=John,DC=example,DC=com',
        groups: 'CN=Developers,DC=example,DC=com'
      });
    });

    test('should handle multi-value attributes', async () => {
      mockLdapClient.search.mockResolvedValue([
        {
          memberOf: ['CN=Group1,DC=example,DC=com', 'CN=Group2,DC=example,DC=com']
        }
      ]);

      const attributes = await provider.getAttributes('user123');
      expect(Array.isArray(attributes.groups)).toBe(true);
    });

    test('should return empty object when no results', async () => {
      mockLdapClient.search.mockResolvedValue([]);

      const attributes = await provider.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should handle LDAP errors', async () => {
      mockLdapClient.search.mockRejectedValue(new Error('LDAP error'));

      const attributes = await provider.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should return empty when no client configured', async () => {
      const providerWithoutClient = new LdapAttributeProvider('subject', 'ad', {
        url: 'ldap://ldap.example.com',
        bindDn: 'CN=service,DC=example,DC=com',
        bindPassword: 'password',
        searchBase: 'DC=example,DC=com',
        attributeMapping: { department: 'department' }
      });

      const attributes = await providerWithoutClient.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should support configured attributes', () => {
      expect(provider.supportsAttribute('department')).toBe(true);
      expect(provider.supportsAttribute('manager')).toBe(true);
      expect(provider.supportsAttribute('unknown')).toBe(false);
    });

    test('should allow setting LDAP client', async () => {
      const newProvider = new LdapAttributeProvider('subject', 'ad', {
        url: 'ldap://ldap.example.com',
        bindDn: 'CN=service,DC=example,DC=com',
        bindPassword: 'password',
        searchBase: 'DC=example,DC=com',
        attributeMapping: { department: 'department' }
      });

      newProvider.setLdapClient(mockLdapClient);

      mockLdapClient.search.mockResolvedValue([{ department: 'HR' }]);

      const attributes = await newProvider.getAttributes('user123');
      expect(attributes).toHaveProperty('department');
    });
  });

  describe('EnvironmentAttributeProvider', () => {
    let provider: EnvironmentAttributeProvider;

    beforeEach(() => {
      provider = new EnvironmentAttributeProvider();
    });

    test('should provide current time attributes', async () => {
      const attributes = await provider.getAttributes('current');

      expect(attributes).toHaveProperty('currentTime');
      expect(attributes).toHaveProperty('currentDate');
      expect(attributes).toHaveProperty('currentTimestamp');
      expect(attributes).toHaveProperty('dayOfWeek');
      expect(attributes).toHaveProperty('hourOfDay');
    });

    test('should extract IP address from request context', async () => {
      const context = {
        request: {
          headers: {
            'x-forwarded-for': '192.168.1.1'
          }
        }
      };

      const attributes = await provider.getAttributes('current', context);
      expect(attributes.ipAddress).toBe('192.168.1.1');
    });

    test('should extract user agent from request context', async () => {
      const context = {
        request: {
          headers: {
            'user-agent': 'Mozilla/5.0'
          }
        }
      };

      const attributes = await provider.getAttributes('current', context);
      expect(attributes.userAgent).toBe('Mozilla/5.0');
    });

    test('should extract session info from context', async () => {
      const context = {
        session: {
          id: 'session123',
          createdAt: Date.now() - 10000
        }
      };

      const attributes = await provider.getAttributes('current', context);
      expect(attributes.sessionId).toBe('session123');
      expect(attributes.sessionAge).toBeGreaterThan(0);
    });

    test('should support static attributes', async () => {
      provider.addStaticAttribute('environment', 'production');
      provider.addStaticAttribute('region', 'us-east-1');

      const attributes = await provider.getAttributes('current');
      expect(attributes.environment).toBe('production');
      expect(attributes.region).toBe('us-east-1');
    });

    test('should support environment attributes', () => {
      expect(provider.supportsAttribute('currentTime')).toBe(true);
      expect(provider.supportsAttribute('ipAddress')).toBe(true);
      expect(provider.supportsAttribute('hourOfDay')).toBe(true);
    });

    test('should handle context without request', async () => {
      const attributes = await provider.getAttributes('current', {});
      expect(attributes).toHaveProperty('currentTime');
    });

    test('should handle context without session', async () => {
      const context = { request: { headers: {} } };
      const attributes = await provider.getAttributes('current', context);
      expect(attributes).toHaveProperty('currentTime');
    });
  });

  describe('CachedAttributeProvider', () => {
    let baseProvider: InMemoryAttributeProvider;
    let cachedProvider: CachedAttributeProvider;

    beforeEach(() => {
      baseProvider = new InMemoryAttributeProvider('subject', 'users', {
        user123: { department: 'Engineering' }
      });
      cachedProvider = new CachedAttributeProvider(baseProvider, 1); // 1 second TTL
    });

    test('should cache attributes', async () => {
      const spy = jest.spyOn(baseProvider, 'getAttributes');

      await cachedProvider.getAttributes('user123');
      await cachedProvider.getAttributes('user123');
      await cachedProvider.getAttributes('user123');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('should expire cache after TTL', async () => {
      const spy = jest.spyOn(baseProvider, 'getAttributes');

      await cachedProvider.getAttributes('user123');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await cachedProvider.getAttributes('user123');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    test('should cache different entities separately', async () => {
      const spy = jest.spyOn(baseProvider, 'getAttributes');

      await cachedProvider.getAttributes('user123');
      await cachedProvider.getAttributes('user456');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    test('should forward supportsAttribute calls', () => {
      expect(cachedProvider.supportsAttribute('department')).toBe(true);
    });

    test('should clear cache', async () => {
      const spy = jest.spyOn(baseProvider, 'getAttributes');

      await cachedProvider.getAttributes('user123');
      cachedProvider.clearCache();
      await cachedProvider.getAttributes('user123');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    test('should handle context in cache key', async () => {
      const spy = jest.spyOn(baseProvider, 'getAttributes');

      await cachedProvider.getAttributes('user123', { attributes: { org: 'A' } });
      await cachedProvider.getAttributes('user123', { attributes: { org: 'B' } });

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('CompositeAttributeProvider', () => {
    let provider1: InMemoryAttributeProvider;
    let provider2: InMemoryAttributeProvider;
    let compositeProvider: CompositeAttributeProvider;

    beforeEach(() => {
      provider1 = new InMemoryAttributeProvider('subject', 'users', {
        user123: { department: 'Engineering', level: 3 }
      });

      provider2 = new InMemoryAttributeProvider('subject', 'roles', {
        user123: { role: 'Developer', team: 'Backend' }
      });

      compositeProvider = new CompositeAttributeProvider('subject', 'combined', [
        provider1,
        provider2
      ]);
    });

    test('should merge attributes from multiple providers', async () => {
      const attributes = await compositeProvider.getAttributes('user123');

      expect(attributes).toEqual({
        department: 'Engineering',
        level: 3,
        role: 'Developer',
        team: 'Backend'
      });
    });

    test('should handle provider errors gracefully', async () => {
      const errorProvider = new InMemoryAttributeProvider('subject', 'error', {});
      jest.spyOn(errorProvider, 'getAttributes').mockRejectedValue(new Error('Provider error'));

      const composite = new CompositeAttributeProvider('subject', 'combined', [
        provider1,
        errorProvider
      ]);

      const attributes = await composite.getAttributes('user123');
      expect(attributes).toHaveProperty('department');
    });

    test('should support attributes from any provider', () => {
      expect(compositeProvider.supportsAttribute('department')).toBe(true);
      expect(compositeProvider.supportsAttribute('role')).toBe(true);
    });

    test('should handle empty providers list', async () => {
      const empty = new CompositeAttributeProvider('subject', 'empty', []);
      const attributes = await empty.getAttributes('user123');
      expect(attributes).toEqual({});
    });

    test('should later provider values override earlier ones', async () => {
      const provider3 = new InMemoryAttributeProvider('subject', 'override', {
        user123: { level: 5 }
      });

      const composite = new CompositeAttributeProvider('subject', 'combined', [
        provider1,
        provider3
      ]);

      const attributes = await composite.getAttributes('user123');
      expect(attributes.level).toBe(5);
    });
  });
});
