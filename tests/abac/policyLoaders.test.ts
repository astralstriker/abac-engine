/**
 * Tests for Policy Loaders - Export, Save, and Load utilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ValidationError } from '../../src/abac/errors';
import { PolicyBuilder } from '../../src/abac/policyBuilder';
import {
  exportPoliciesToJSON,
  exportPolicyToJSON,
  loadAndValidatePoliciesFromFile,
  loadPoliciesFromFile,
  loadPoliciesFromJSON,
  saveAndValidatePoliciesToFile,
  saveAndValidatePolicyToFile,
  savePoliciesToFile,
  savePolicyToFile
} from '../../src/abac/policyLoaders';
import { ABACPolicy, ComparisonOperator, Effect } from '../../src/abac/types';

describe('Policy Loaders - Export and Save Functions', () => {
  const testDir = join(__dirname, '__test_files__');
  let testPolicy: ABACPolicy;
  let testPolicies: ABACPolicy[];

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        await fs.unlink(join(testDir, file));
      }
      await fs.rmdir(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Create test policies
    testPolicy = PolicyBuilder.create('test-policy-1')
      .version('1.0.0')
      .description('Test policy for export/save')
      .permit()
      .condition({
        operator: ComparisonOperator.Equals,
        left: { category: 'subject', attributeId: 'id' },
        right: { category: 'resource', attributeId: 'owner' }
      })
      .build();

    testPolicies = [
      testPolicy,
      PolicyBuilder.create('test-policy-2')
        .version('1.0.0')
        .description('Second test policy')
        .deny()
        .build()
    ];
  });

  describe('exportPolicyToJSON', () => {
    it('should export policy to pretty JSON string by default', () => {
      const json = exportPolicyToJSON(testPolicy);

      expect(typeof json).toBe('string');
      expect(json).toContain('test-policy-1');
      expect(json).toContain('1.0.0');
      expect(json).toContain('Permit');
      // Check for pretty formatting (indentation)
      expect(json).toMatch(/\n\s+/);
    });

    it('should export policy to compact JSON when pretty is false', () => {
      const json = exportPolicyToJSON(testPolicy, false);

      expect(typeof json).toBe('string');
      expect(json).toContain('test-policy-1');
      // Compact should have no newlines or extra spaces
      expect(json).not.toMatch(/\n\s+/);
      expect(json.length).toBeLessThan(exportPolicyToJSON(testPolicy, true).length);
    });

    it('should export valid JSON that can be parsed', () => {
      const json = exportPolicyToJSON(testPolicy);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('test-policy-1');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.effect).toBe('Permit');
    });
  });

  describe('exportPoliciesToJSON', () => {
    it('should export multiple policies to pretty JSON array by default', () => {
      const json = exportPoliciesToJSON(testPolicies);

      expect(typeof json).toBe('string');
      expect(json).toContain('test-policy-1');
      expect(json).toContain('test-policy-2');
      expect(json).toMatch(/\n\s+/);
    });

    it('should export policies to compact JSON when pretty is false', () => {
      const json = exportPoliciesToJSON(testPolicies, false);

      expect(typeof json).toBe('string');
      expect(json).not.toMatch(/\n\s+/);
    });

    it('should export valid JSON array that can be parsed', () => {
      const json = exportPoliciesToJSON(testPolicies);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('test-policy-1');
      expect(parsed[1].id).toBe('test-policy-2');
    });

    it('should handle empty array', () => {
      const json = exportPoliciesToJSON([]);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('savePolicyToFile', () => {
    const filePath = join(testDir, 'single-policy.json');

    afterEach(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save policy to file with pretty formatting', async () => {
      await savePolicyToFile(testPolicy, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.id).toBe('test-policy-1');
      expect(content).toMatch(/\n\s+/); // Check for pretty formatting
    });

    it('should save policy to file with compact formatting', async () => {
      await savePolicyToFile(testPolicy, filePath, false);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).not.toMatch(/\n\s+/);
    });

    it('should throw error if file path is invalid', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/policy.json';

      await expect(savePolicyToFile(testPolicy, invalidPath)).rejects.toThrow();
    });
  });

  describe('savePoliciesToFile', () => {
    const filePath = join(testDir, 'multiple-policies.json');

    afterEach(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save multiple policies to file', async () => {
      await savePoliciesToFile(testPolicies, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('test-policy-1');
      expect(parsed[1].id).toBe('test-policy-2');
    });

    it('should save with compact formatting when specified', async () => {
      await savePoliciesToFile(testPolicies, filePath, false);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).not.toMatch(/\n\s+/);
    });
  });

  describe('saveAndValidatePolicyToFile', () => {
    const filePath = join(testDir, 'validated-policy.json');

    afterEach(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save valid policy and return validation result', async () => {
      const result = await saveAndValidatePolicyToFile(testPolicy, filePath);

      expect(result.valid).toBe(true);
      expect(result.policyId).toBe('test-policy-1');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.id).toBe('test-policy-1');
    });

    it('should throw ValidationError for invalid policy', async () => {
      const invalidPolicy = {
        // Missing required fields
        version: '1.0.0'
      } as ABACPolicy;

      await expect(saveAndValidatePolicyToFile(invalidPolicy, filePath)).rejects.toThrow(
        ValidationError
      );
    });

    it('should not save file if validation fails', async () => {
      const invalidPolicy = {
        version: '1.0.0'
      } as ABACPolicy;

      try {
        await saveAndValidatePolicyToFile(invalidPolicy, filePath);
      } catch (error) {
        // Expected to throw
      }

      // File should not exist
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('saveAndValidatePoliciesToFile', () => {
    const filePath = join(testDir, 'validated-policies.json');

    afterEach(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save valid policies and return validation results', async () => {
      const results = await saveAndValidatePoliciesToFile(testPolicies, filePath);

      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveLength(2);
    });

    it('should throw ValidationError if any policy is invalid', async () => {
      const policiesWithInvalid = [
        testPolicy,
        { version: '1.0.0' } as ABACPolicy // Invalid
      ];

      await expect(saveAndValidatePoliciesToFile(policiesWithInvalid, filePath)).rejects.toThrow(
        ValidationError
      );
    });

    it('should not save file if validation fails', async () => {
      const policiesWithInvalid = [testPolicy, { version: '1.0.0' } as ABACPolicy];

      try {
        await saveAndValidatePoliciesToFile(policiesWithInvalid, filePath);
      } catch (error) {
        // Expected to throw
      }

      // File should not exist
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('Integration: Save and Load', () => {
    const filePath = join(testDir, 'roundtrip.json');

    afterEach(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    });

    it('should save and load single policy', async () => {
      await savePolicyToFile(testPolicy, filePath);
      const loaded = await loadPoliciesFromFile(filePath);

      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.id).toBe(testPolicy.id);
      expect(loaded[0]?.version).toBe(testPolicy.version);
      expect(loaded[0]?.effect).toBe(testPolicy.effect);
    });

    it('should save and load multiple policies', async () => {
      await savePoliciesToFile(testPolicies, filePath);
      const loaded = await loadPoliciesFromFile(filePath);

      expect(loaded).toHaveLength(testPolicies.length);
      expect(loaded[0]?.id).toBe(testPolicies[0]?.id);
      expect(loaded[1]?.id).toBe(testPolicies[1]?.id);
    });

    it('should save with validation and load with validation', async () => {
      await saveAndValidatePoliciesToFile(testPolicies, filePath);
      const { policies, validationResults } = await loadAndValidatePoliciesFromFile(filePath);

      expect(policies).toHaveLength(testPolicies.length);
      expect(validationResults).toHaveLength(testPolicies.length);
      expect(validationResults.every(r => r.valid)).toBe(true);
    });
  });

  describe('loadPoliciesFromJSON', () => {
    it('should load policies from JSON string', () => {
      const json = exportPoliciesToJSON(testPolicies);
      const loaded = loadPoliciesFromJSON(json);

      expect(loaded).toHaveLength(2);
      expect(loaded[0]?.id).toBe('test-policy-1');
      expect(loaded[1]?.id).toBe('test-policy-2');
    });

    it('should load single policy from JSON string', () => {
      const json = exportPolicyToJSON(testPolicy);
      const loaded = loadPoliciesFromJSON(json);

      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.id).toBe('test-policy-1');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => loadPoliciesFromJSON('not valid json')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle policy with all optional fields', async () => {
      const complexPolicy = PolicyBuilder.create('complex-policy')
        .version('2.0.0')
        .description('Complex policy with all fields')
        .permit()
        .priority(100)
        .logObligation({ message: 'Access logged' })
        .warning({ message: 'Warning message' })
        .tags('tag1', 'tag2')
        .metadata({
          createdBy: 'test-user',
          createdAt: new Date('2024-01-01'),
          tags: ['tag1', 'tag2']
        })
        .build();

      const json = exportPolicyToJSON(complexPolicy);
      const parsed = JSON.parse(json);

      expect(parsed.priority).toBe(100);
      expect(parsed.obligations).toHaveLength(1);
      expect(parsed.advice).toHaveLength(1);
      expect(parsed.metadata).toBeDefined();
    });

    it('should preserve Date objects when serializing', () => {
      const policyWithDate: ABACPolicy = {
        id: 'date-policy',
        version: '1.0.0',
        effect: Effect.Permit,
        metadata: {
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      };

      const json = exportPolicyToJSON(policyWithDate);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
