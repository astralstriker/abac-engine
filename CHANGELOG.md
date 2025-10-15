# Changelog

All notable changes to this project will be documented in this file.

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
