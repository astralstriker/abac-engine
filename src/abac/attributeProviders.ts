/**
 * ABAC Attribute Providers
 *
 * Attribute providers are responsible for dynamically retrieving attributes
 * from various sources (databases, external services, etc.) during policy evaluation.
 * This implements the Policy Information Point (PIP) component of ABAC architecture.
 */

import { ILogger, SilentLogger } from '../logger';
import { AttributeResolutionError, getErrorMessage } from './errors';
import {
  AttributeContext,
  AttributeProvider,
  AttributeValue,
  DatabaseConnection,
  LdapClient
} from './types';

/**
 * Base abstract class for attribute providers
 */
export abstract class BaseAttributeProvider implements AttributeProvider {
  public readonly category: 'subject' | 'resource' | 'environment';
  public readonly name: string;
  protected logger: ILogger;

  constructor(category: 'subject' | 'resource' | 'environment', name: string, logger?: ILogger) {
    this.category = category;
    this.name = name;
    this.logger = logger ?? new SilentLogger();
  }

  abstract getAttributes(
    id: string,
    context?: AttributeContext
  ): Promise<Record<string, AttributeValue>>;
  abstract supportsAttribute(attributeId: string): boolean;
}

/**
 * In-memory attribute provider for testing and simple use cases
 */
export class InMemoryAttributeProvider extends BaseAttributeProvider {
  private attributes: Map<string, Record<string, AttributeValue>> = new Map();
  private supportedAttributes: Set<string> = new Set();

  constructor(
    category: 'subject' | 'resource' | 'environment',
    name: string,
    initialData?: Record<string, Record<string, AttributeValue>>,
    logger?: ILogger
  ) {
    super(category, name, logger);

    if (initialData) {
      for (const [id, attrs] of Object.entries(initialData)) {
        this.attributes.set(id, attrs);
        Object.keys(attrs).forEach(attr => this.supportedAttributes.add(attr));
      }
    }
  }

  async getAttributes(id: string): Promise<Record<string, AttributeValue>> {
    return this.attributes.get(id) || {};
  }

  supportsAttribute(attributeId: string): boolean {
    return this.supportedAttributes.has(attributeId);
  }

  /**
   * Add attributes for an entity
   */
  addAttributes(id: string, attributes: Record<string, AttributeValue>): void {
    const existing = this.attributes.get(id) || {};
    this.attributes.set(id, { ...existing, ...attributes });
    Object.keys(attributes).forEach(attr => this.supportedAttributes.add(attr));
  }

  /**
   * Remove attributes for an entity
   */
  removeAttributes(id: string): void {
    this.attributes.delete(id);
  }

  /**
   * Clear all attributes
   */
  clear(): void {
    this.attributes.clear();
    this.supportedAttributes.clear();
  }
}

/**
 * Database attribute provider for SQL databases
 */
export class DatabaseAttributeProvider extends BaseAttributeProvider {
  private connectionString: string;
  private tableMapping: Record<string, string>;
  private attributeMapping: Record<string, string>;
  private db: DatabaseConnection | null;

  constructor(
    category: 'subject' | 'resource' | 'environment',
    name: string,
    config: {
      connectionString: string;
      tableMapping: Record<string, string>; // attributeId -> table name
      attributeMapping: Record<string, string>; // attributeId -> column name
      db?: DatabaseConnection;
    },
    logger?: ILogger
  ) {
    super(category, name, logger);
    this.connectionString = config.connectionString;
    this.tableMapping = config.tableMapping;
    this.attributeMapping = config.attributeMapping;
    this.db = config.db || null;
  }

  async getAttributes(
    id: string,
    _context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    if (!this.db) {
      throw AttributeResolutionError.notInitialized(this.name);
    }

    const attributes: Record<string, AttributeValue> = {};

    try {
      // Group attributes by table to minimize queries
      const tableQueries: Record<string, string[]> = {};

      for (const [attributeId, tableName] of Object.entries(this.tableMapping)) {
        if (!tableQueries[tableName]) {
          tableQueries[tableName] = [];
        }
        tableQueries[tableName].push(attributeId);
      }

      // Execute queries for each table
      for (const [tableName, attributeIds] of Object.entries(tableQueries)) {
        const columns = attributeIds.map(attrId => this.attributeMapping[attrId] || attrId);
        const query = `SELECT ${columns.join(', ')} FROM ${tableName} WHERE id = ?`;

        const result = await this.db.query(query, [id]);

        if (result && result.length > 0) {
          const row = result[0];
          if (row) {
            for (let i = 0; i < attributeIds.length; i++) {
              const attributeId = attributeIds[i];
              if (!attributeId) continue;
              const columnName = columns[i];
              if (!columnName) continue;
              if (row[columnName] !== undefined) {
                attributes[attributeId] = row[columnName] as AttributeValue;
              }
            }
          }
        }
      }

      return attributes;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Error fetching attributes from database for ${this.category}:${id}: ${errorMessage}`,
        {
          error: error instanceof Error ? error : String(error),
          category: this.category,
          entityId: id,
          providerName: this.name
        }
      );
      // Return empty object on error for backward compatibility
      return {};
    }
  }

  supportsAttribute(attributeId: string): boolean {
    return attributeId in this.tableMapping;
  }

  /**
   * Set database connection
   */
  setDatabase(db: DatabaseConnection): void {
    this.db = db;
  }
}

/**
 * REST API attribute provider
 */
export class RestApiAttributeProvider extends BaseAttributeProvider {
  private baseUrl: string;
  private endpoints: Record<string, string>;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(
    category: 'subject' | 'resource' | 'environment',
    name: string,
    config: {
      baseUrl: string;
      endpoints: Record<string, string>; // attributeId -> endpoint path
      headers?: Record<string, string>;
      timeout?: number;
    },
    logger?: ILogger
  ) {
    super(category, name, logger);
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.endpoints = config.endpoints;
    this.headers = config.headers || {};
    this.timeout = config.timeout || 5000;
  }

  async getAttributes(
    id: string,
    _context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    const attributes: Record<string, AttributeValue> = {};

    const fetchPromises = Object.entries(this.endpoints).map(async ([attributeId, endpoint]) => {
      try {
        const url = `${this.baseUrl}${endpoint.replace(':id', id)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          headers: this.headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          // Handle different response formats
          if (typeof data === 'object' && data !== null) {
            // If response is an object, merge all properties
            Object.assign(attributes, data);
          } else if (
            typeof data === 'string' ||
            typeof data === 'number' ||
            typeof data === 'boolean' ||
            data instanceof Date ||
            Array.isArray(data)
          ) {
            // If response is a primitive value, use attributeId as key
            attributes[attributeId] = data as AttributeValue;
          }
        } else {
          this.logger.warn(`Failed to fetch ${attributeId} for ${id}: ${response.status}`, {
            attributeId,
            entityId: id,
            status: response.status,
            category: this.category
          });
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        this.logger.warn(`Error fetching ${attributeId} for ${id}: ${errorMessage}`, {
          error: error instanceof Error ? error : String(error),
          attributeId,
          entityId: id,
          category: this.category,
          providerName: this.name
        });
      }
    });

    await Promise.allSettled(fetchPromises);
    return attributes;
  }

  supportsAttribute(attributeId: string): boolean {
    return attributeId in this.endpoints;
  }
}

/**
 * LDAP/Active Directory attribute provider
 */
export class LdapAttributeProvider extends BaseAttributeProvider {
  private config: {
    url: string;
    bindDn: string;
    bindPassword: string;
    searchBase: string;
    attributeMapping: Record<string, string>;
  };
  private ldapClient: LdapClient | null;

  constructor(
    category: 'subject' | 'resource' | 'environment',
    name: string,
    config: {
      url: string;
      bindDn: string;
      bindPassword: string;
      searchBase: string;
      attributeMapping: Record<string, string>; // attributeId -> LDAP attribute
      ldapClient?: LdapClient;
    },
    logger?: ILogger
  ) {
    super(category, name, logger);
    this.config = config;
    this.ldapClient = config.ldapClient || null;
  }

  async getAttributes(
    id: string,
    _context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    if (!this.ldapClient) {
      this.logger.warn('LDAP client not initialized');
      return {};
    }

    try {
      const searchFilter = `(uid=${id})`;
      const searchOptions = {
        filter: searchFilter,
        scope: 'sub' as const,
        attributes: Object.values(this.config.attributeMapping)
      };

      const searchResult = await this.ldapClient.search(this.config.searchBase, searchOptions);

      if (searchResult && searchResult.length > 0) {
        const entry = searchResult[0];
        if (entry) {
          const attributes: Record<string, AttributeValue> = {};

          for (const [attributeId, ldapAttribute] of Object.entries(this.config.attributeMapping)) {
            if (entry[ldapAttribute] !== undefined) {
              // Handle multi-value attributes
              const value = entry[ldapAttribute];
              attributes[attributeId] = (
                Array.isArray(value) && value.length === 1 ? value[0] : value
              ) as AttributeValue;
            }
          }

          return attributes;
        }
      }

      return {};
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error fetching LDAP attributes for ${id}: ${errorMessage}`, {
        error: error instanceof Error ? error : String(error),
        category: this.category,
        entityId: id,
        providerName: this.name
      });
      // Return empty object on error for backward compatibility
      return {};
    }
  }

  supportsAttribute(attributeId: string): boolean {
    return attributeId in this.config.attributeMapping;
  }

  /**
   * Set LDAP client
   */
  setLdapClient(client: LdapClient): void {
    this.ldapClient = client;
  }
}

/**
 * Environment attribute provider for contextual information
 */
export class EnvironmentAttributeProvider extends BaseAttributeProvider {
  private staticAttributes: Record<string, AttributeValue> = {};

  constructor(name: string = 'default-environment', logger?: ILogger) {
    super('environment', name, logger);
  }

  async getAttributes(
    _id: string,
    context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    const attributes: Record<string, AttributeValue> = { ...this.staticAttributes };

    // Add dynamic environment attributes
    attributes.currentTime = new Date();
    attributes.currentDate = new Date().toISOString().split('T')[0] ?? '';
    attributes.currentTimestamp = Date.now();
    attributes.dayOfWeek = new Date().getDay();
    attributes.hourOfDay = new Date().getHours();

    // Add context-specific attributes if available
    if (context) {
      if (context.request) {
        const ipAddress = this.extractIpAddress(context.request);
        if (ipAddress) attributes.ipAddress = ipAddress;

        const userAgent = context.request.headers?.['user-agent'];
        if (userAgent) attributes.userAgent = userAgent;

        const origin = context.request.headers?.origin;
        if (origin) attributes.origin = origin;

        const referer = context.request.headers?.referer;
        if (referer) attributes.referer = referer;
      }

      if (context.session) {
        const sessionId = context.session.id;
        if (sessionId) attributes.sessionId = sessionId;
        attributes.sessionAge = Date.now() - (context.session.createdAt || Date.now());
      }

      // Merge any additional context attributes
      if (context.attributes) {
        Object.assign(attributes, context.attributes);
      }
    }

    return attributes;
  }

  supportsAttribute(attributeId: string): boolean {
    const supportedAttributes = [
      'currentTime',
      'currentDate',
      'currentTimestamp',
      'dayOfWeek',
      'hourOfDay',
      'ipAddress',
      'userAgent',
      'origin',
      'referer',
      'sessionId',
      'sessionAge',
      ...Object.keys(this.staticAttributes)
    ];

    return supportedAttributes.includes(attributeId);
  }

  /**
   * Add static environment attributes
   */
  addStaticAttribute(name: string, value: AttributeValue): void {
    this.staticAttributes[name] = value;
  }

  /**
   * Remove static attribute
   */
  removeStaticAttribute(name: string): void {
    delete this.staticAttributes[name];
  }

  /**
   * Extract IP address from request object
   */
  private extractIpAddress(request: AttributeContext['request']): string | undefined {
    if (!request) {
      return undefined;
    }

    // Try different common headers and properties
    if (request.ip) return request.ip;

    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (forwardedFor) {
      const ip = typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0];
      return ip?.split(',')[0]?.trim();
    }

    const realIp = request.headers?.['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : realIp[0];
    }

    const cfIp = request.headers?.['cf-connecting-ip'];
    if (cfIp) {
      return typeof cfIp === 'string' ? cfIp : cfIp[0];
    }

    return undefined;
  }
}

/**
 * Cached attribute provider wrapper
 */
export class CachedAttributeProvider extends BaseAttributeProvider {
  private provider: AttributeProvider;
  private cache: Map<string, { data: Record<string, AttributeValue>; timestamp: number }> =
    new Map();
  private ttl: number;

  constructor(provider: AttributeProvider, ttlSeconds: number = 300) {
    super(provider.category, `cached-${provider.name}`);
    this.provider = provider;
    this.ttl = ttlSeconds * 1000; // Convert to milliseconds
  }

  async getAttributes(
    id: string,
    context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    const cacheKey = `${id}:${JSON.stringify(context || {})}`;
    const cached = this.cache.get(cacheKey);

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Fetch from underlying provider
    const attributes = await this.provider.getAttributes(id, context);

    // Cache the result
    this.cache.set(cacheKey, {
      data: attributes,
      timestamp: Date.now()
    });

    // Clean up expired entries periodically
    this.cleanupExpiredEntries();

    return attributes;
  }

  supportsAttribute(attributeId: string): boolean {
    return this.provider.supportsAttribute(attributeId);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific ID
   */
  clearCacheFor(id: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${id}:`));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Composite attribute provider that combines multiple providers
 */
export class CompositeAttributeProvider extends BaseAttributeProvider {
  private providers: AttributeProvider[];

  constructor(
    category: 'subject' | 'resource' | 'environment',
    name: string,
    providers: AttributeProvider[],
    logger?: ILogger
  ) {
    super(category, name, logger);
    this.providers = providers.filter(p => p.category === category);
  }

  async getAttributes(
    id: string,
    context?: AttributeContext
  ): Promise<Record<string, AttributeValue>> {
    const allAttributes: Record<string, AttributeValue> = {};

    // Fetch attributes from all providers in parallel
    const attributePromises = this.providers.map(async provider => {
      try {
        return await provider.getAttributes(id, context);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        this.logger.warn(`Error getting attributes from ${provider.name}: ${errorMessage}`, {
          error: error instanceof Error ? error : String(error),
          category: provider.category,
          entityId: id,
          providerName: provider.name
        });
        // Return empty object on error for composite provider (fail-safe behavior)
        return {};
      }
    });

    const results = await Promise.allSettled(attributePromises);

    // Merge results (later providers override earlier ones)
    for (const result of results) {
      if (result.status === 'fulfilled') {
        Object.assign(allAttributes, result.value);
      }
    }

    return allAttributes;
  }

  supportsAttribute(attributeId: string): boolean {
    return this.providers.some(provider => provider.supportsAttribute(attributeId));
  }

  /**
   * Add a provider
   */
  addProvider(provider: AttributeProvider): void {
    if (provider.category === this.category) {
      this.providers.push(provider);
    } else {
      throw new AttributeResolutionError(
        `Provider category mismatch: expected ${this.category}, got ${provider.category}`,
        this.category,
        'N/A',
        provider.name
      );
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(providerName: string): void {
    this.providers = this.providers.filter(p => p.name !== providerName);
  }
}
