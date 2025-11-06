# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-11-06

### Added - Policy Persistence Features

- **Export Functions** - New utilities for exporting policies to JSON strings
  - `exportPolicyToJSON(policy, pretty?)` - Export single policy with optional
    formatting
  - `exportPoliciesToJSON(policies, pretty?)` - Export multiple policies as
    array
- **Save Functions** - New utilities for saving policies to files
  - `savePolicyToFile(policy, filePath, pretty?)` - Save single policy to file
  - `savePoliciesToFile(policies, filePath, pretty?)` - Save multiple policies
    to file
  - `saveAndValidatePolicyToFile(policy, filePath, pretty?)` - Save with
    validation
  - `saveAndValidatePoliciesToFile(policies, filePath, pretty?)` - Save multiple
    with validation
- **Comprehensive Tests** - Added 26 new tests covering all export/save
  functionality
- **Example** - New `policy-persistence.ts` example demonstrating all
  persistence features
- **Documentation** - Expanded README with comprehensive policy persistence
  patterns including:
  - Loading and saving policies
  - Export/import workflows
  - Version control strategies
  - Hot reload patterns
  - Database migration examples
  - Caching best practices

### Notes

- All new functions are fully backward compatible
- PAP (Policy Administration Point) remains user-managed and flexible
- Policies are plain JSON objects, making them easily serializable
- Save functions include optional validation to ensure policy integrity

## [1.0.1] - 2025-10-22

### Bug fixes and improvements

- fix(condition-builder): Accept `AttributeReference` as RHS for
  `ConditionBuilder.in` so membership checks can be performed against another
  attribute.
- tests: Add unit tests covering `ConditionBuilder.in` with RHS as an
  `AttributeReference`.
- docs: Update `API_REFERENCE.md` to document that `in()` RHS may be an
  `AttributeReference` and add examples for both array-literal and attribute-ref
  usage.

### Notes

- Backward compatible: array-literal RHS remains supported.
- Evaluation behavior unchanged: if the RHS attribute is missing or does not
  resolve to an array, the `in` check evaluates as non-match (same as prior
  behavior).

## [1.0.0] - Initial Release

### Core Features

- **True ABAC Engine** - Pure attribute-based authorization without roles
- **Policy Builder** - Fluent API for creating complex policies
- **Condition System** - Comparison, logical, and function-based conditions
- **Attribute Providers** - Dynamic attribute fetching from multiple sources
- **Combining Algorithms** - Six algorithms for multi-policy resolution
- **TypeScript Support** - Fully typed with comprehensive type definitions
- **Zero Dependencies** - No external runtime dependencies
- **Pluggable Logger** - Injectable logger interface for monitoring and
  debugging

### Policy Management

- **Validation Utilities** - Standalone policy validation functions
- **Policy Loaders** - Helper functions for loading from files and databases
- **Caching Support** - Built-in policy cache with TTL
- **Prisma Adapter** - Helper for Prisma integration

### Attribute Providers

- `InMemoryAttributeProvider` - Store attributes in memory
- `EnvironmentAttributeProvider` - Automatic context attributes
- `DatabaseAttributeProvider` - Fetch from databases
- `RestApiAttributeProvider` - Fetch from REST APIs
- `LdapAttributeProvider` - Fetch from LDAP/Active Directory
- `CachedAttributeProvider` - Add caching to any provider
- `CompositeAttributeProvider` - Combine multiple providers

### Decision Making

- Six combining algorithms: DenyOverrides, PermitOverrides, FirstApplicable,
  OnlyOneApplicable, DenyUnlessPermit, PermitUnlessDeny
- Support for obligations and advice
- Audit logging
- Performance metrics

### Logging

- `ILogger` - Logger interface for custom implementations
- `ConsoleLogger` - Built-in console-based logger with log levels
- `SilentLogger` - Default silent logger (production-safe)
- `createLogger()` - Helper function to create logger instances
- Log levels: Debug, Info, Warn, Error, None
- Integration with ABACEngine and all AttributeProviders
- Compatible with Winston, Pino, Bunyan, and other logging libraries

### Developer Experience

- Comprehensive TypeScript types
- Fluent builder APIs
- Helper utilities for common patterns
- Extensive examples
- Educational README for beginners and experts

### Architecture

- Follows XACML/NIST ABAC standards
- Clean separation: PDP (engine), PIP (providers), PAP (user storage)
- No repository pattern - users manage storage directly
- Pure evaluation engine design
