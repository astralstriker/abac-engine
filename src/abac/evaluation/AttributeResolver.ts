/**
 * AttributeResolver - Handles attribute resolution and request enhancement
 *
 * Responsibilities:
 * - Enhance requests with attributes from providers
 * - Resolve attribute references
 * - Get attribute values from request
 * - Manage attribute providers
 */

import { ILogger } from '../../logger';
import { getErrorMessage } from '../errors';
import { ABACRequest, AttributeProvider, AttributeValue } from '../types';

export class AttributeResolver {
  private attributeProviders: Map<string, AttributeProvider>;
  private logger: ILogger;

  constructor(logger: ILogger, providers: AttributeProvider[] = []) {
    this.logger = logger;
    this.attributeProviders = new Map();

    // Add initial providers
    for (const provider of providers) {
      this.addProvider(provider);
    }
  }

  /**
   * Add an attribute provider
   */
  public addProvider(provider: AttributeProvider): void {
    const key = `${provider.category}-${provider.name}`;
    this.attributeProviders.set(key, provider);
    this.logger.debug(`Attribute provider added: ${provider.name} (${provider.category})`);
  }

  /**
   * Remove an attribute provider
   */
  public removeProvider(key: string): void {
    this.attributeProviders.delete(key);
    this.logger.debug(`Attribute provider removed: ${key}`);
  }

  /**
   * Get all attribute providers
   */
  public getProviders(): AttributeProvider[] {
    return Array.from(this.attributeProviders.values());
  }

  /**
   * Get attribute value from request
   */
  public getAttributeValue(
    request: ABACRequest,
    category: 'subject' | 'resource' | 'action' | 'environment',
    attributeId: string,
    path?: string
  ): AttributeValue | undefined {
    // Handle special 'id' attribute for subject, resource, and action
    if (attributeId === 'id' && !path) {
      switch (category) {
        case 'subject':
          return request.subject.id;
        case 'resource':
          return request.resource.id;
        case 'action':
          return request.action.id;
      }
    }

    // Handle special 'type' attribute for resource
    if (attributeId === 'type' && category === 'resource' && !path) {
      return request.resource.type;
    }

    let source: Record<string, AttributeValue>;

    switch (category) {
      case 'subject':
        source = request.subject.attributes;
        break;
      case 'resource':
        source = request.resource.attributes;
        break;
      case 'action':
        source = request.action.attributes || {};
        break;
      case 'environment':
        source = request.environment?.attributes || {};
        break;
      default:
        return undefined;
    }

    // Handle nested paths
    if (path) {
      const parts = path.split('.');
      let current: unknown = source[attributeId];
      for (const part of parts) {
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current !== undefined ? (current as AttributeValue) : undefined;
    }

    const value = source[attributeId];
    return value !== undefined ? (value as AttributeValue) : undefined;
  }

  /**
   * Enhance request with additional attributes from providers
   */
  public async enhanceRequest(request: ABACRequest): Promise<ABACRequest> {
    const enhanced = JSON.parse(JSON.stringify(request)); // Deep clone

    // Enhance subject attributes
    for (const provider of this.attributeProviders.values()) {
      if (provider.category === 'subject') {
        try {
          const additionalAttrs = await provider.getAttributes(request.subject.id);
          enhanced.subject.attributes = { ...enhanced.subject.attributes, ...additionalAttrs };
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          this.logger.warn(
            `Error getting subject attributes from ${provider.name}: ${errorMessage}`,
            {
              error: error instanceof Error ? error : String(error),
              category: provider.category,
              entityId: request.subject.id,
              providerName: provider.name
            }
          );
        }
      }
    }

    // Enhance resource attributes
    for (const provider of this.attributeProviders.values()) {
      if (provider.category === 'resource') {
        try {
          const additionalAttrs = await provider.getAttributes(request.resource.id);
          enhanced.resource.attributes = { ...enhanced.resource.attributes, ...additionalAttrs };
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          this.logger.warn(
            `Error getting resource attributes from ${provider.name}: ${errorMessage}`,
            {
              error: error instanceof Error ? error : String(error),
              category: provider.category,
              entityId: request.resource.id,
              providerName: provider.name
            }
          );
        }
      }
    }

    // Enhance environment attributes
    for (const provider of this.attributeProviders.values()) {
      if (provider.category === 'environment') {
        try {
          const additionalAttrs = await provider.getAttributes('current');
          if (!enhanced.environment) {
            enhanced.environment = {};
          }
          if (!enhanced.environment.attributes) {
            enhanced.environment.attributes = {};
          }
          enhanced.environment.attributes = {
            ...enhanced.environment.attributes,
            ...additionalAttrs
          };
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          this.logger.warn(
            `Error getting environment attributes from ${provider.name}: ${errorMessage}`,
            {
              error: error instanceof Error ? error : String(error),
              category: provider.category,
              providerName: provider.name
            }
          );
        }
      }
    }

    return enhanced;
  }
}
