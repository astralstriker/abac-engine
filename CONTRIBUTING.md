# Contributing to ABAC Engine

Thank you for your interest in contributing to the ABAC Engine! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and professional
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions
- No harassment or discrimination

---

## Getting Started

### Prerequisites

- Node.js 16+
- npm 7+
- Git
- TypeScript knowledge
- Understanding of ABAC concepts (see [Glossary](./docs/GLOSSARY.md))

### First Steps

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/abac-engine.git
   cd abac-engine
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/abac-engine.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

---

## Development Setup

### Environment

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/abac-engine.git
cd abac-engine
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check for linting errors
npm run lint

# Format code
npm run format
```

### Recommended Tools

- **IDE**: VS Code, WebStorm, or any TypeScript-compatible editor
- **Extensions** (VS Code):
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

---

## Project Structure

```
abac-engine/
├── src/
│   ├── abac/                    # Core ABAC implementation
│   │   ├── attributeProviders.ts  # Attribute providers (PIP)
│   │   ├── engine.ts              # Main engine (PDP)
│   │   ├── errors.ts              # Custom error classes
│   │   ├── policyBuilder.ts       # Policy builder utilities
│   │   ├── policyValidator.ts     # Policy validation
│   │   ├── types.ts               # TypeScript types
│   │   ├── combining/             # Combining algorithms
│   │   ├── evaluation/            # Evaluation logic
│   │   └── services/              # Support services
│   ├── logger/                  # Logger interface and implementations
│   └── index.ts                 # Main exports
├── tests/                       # Test files (mirrors src/)
├── examples/                    # Usage examples
├── docs/                        # Documentation
│   ├── API_REFERENCE.md
│   ├── EXAMPLES.md
│   ├── ERROR_HANDLING.md
│   ├── GLOSSARY.md
│   ├── POLICY_GUIDE.md
│   └── README.md
├── CHANGELOG.md                 # Version history
├── CONTRIBUTING.md              # This file
├── package.json
└── tsconfig.json
```

---

## Development Workflow

### Creating a Branch

Always create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Making Changes

1. **Make your changes** in small, logical commits
2. **Write tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** frequently: `npm test`
5. **Check types**: `npm run build`
6. **Lint your code**: `npm run lint`

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

**Examples:**

```
feat(engine): add support for regex in conditions

Add regex matching operator for string comparisons in policy conditions.
This allows more flexible pattern matching in attribute values.

Closes #123
```

```
fix(providers): handle null database connection gracefully

Throw AttributeResolutionError instead of generic Error when
database connection is not initialized.
```

```
docs(glossary): add explanation of multi-tenant architecture

Expand the glossary to include detailed explanation of tenants
and multi-tenancy in the context of ABAC.
```

---

## Coding Standards

### TypeScript Guidelines

1. **No `any` types** - Use proper typing or `unknown`
2. **Strict mode** - All TypeScript strict checks enabled
3. **Explicit return types** - Always specify return types for functions
4. **No unused variables** - Remove or prefix with underscore
5. **Use const/let** - Never use `var`
6. **Prefer interfaces** over type aliases for object shapes

### Code Style

```typescript
// ✅ Good
interface UserAttributes {
  department: string;
  clearanceLevel: number;
}

function evaluatePolicy(
  request: ABACRequest,
  policy: ABACPolicy
): Promise<PolicyResult> {
  // Implementation
}

// ❌ Bad
function evaluatePolicy(request: any, policy: any): any {
  // Implementation
}
```

### Naming Conventions

- **Classes**: PascalCase - `ABACEngine`, `PolicyBuilder`
- **Interfaces**: PascalCase - `ABACRequest`, `AttributeProvider`
- **Functions/Methods**: camelCase - `evaluatePolicy`, `getAttributes`
- **Variables**: camelCase - `policyResult`, `attributeValue`
- **Constants**: SCREAMING_SNAKE_CASE - `MAX_CACHE_SIZE`
- **Files**: camelCase - `policyBuilder.ts`, `attributeProviders.ts`
- **Directories**: kebab-case - `combining-algorithms/`, `attribute-providers/`

### File Organization

Each file should:
1. Start with documentation comment
2. Import statements (grouped logically)
3. Type definitions
4. Implementation
5. Exports

```typescript
/**
 * Policy Builder
 *
 * Fluent API for constructing ABAC policies programmatically.
 */

// External imports
import { someExternalLib } from 'external-lib';

// Internal imports
import { ABACPolicy, Condition } from './types';
import { validatePolicy } from './validator';

// Types
interface BuilderConfig {
  // ...
}

// Implementation
export class PolicyBuilder {
  // ...
}
```

### Error Handling

- Use custom error classes from `src/abac/errors.ts`
- Always provide context in errors
- Use static factory methods for common errors

```typescript
// ✅ Good
throw RequestValidationError.missingField('Subject ID');
throw AttributeResolutionError.providerError(category, id, name, cause);

// ❌ Bad
throw new Error('Invalid request');
```

### Imports

Organize imports in this order:
1. Built-in Node.js modules
2. External dependencies
3. Internal shared modules
4. Types
5. Relative imports

```typescript
// 1. Node.js
import { readFileSync } from 'fs';

// 2. External
import { v4 as uuidv4 } from 'uuid';

// 3. Internal shared
import { ILogger } from '../logger';

// 4. Types
import type { ABACPolicy } from './types';

// 5. Relative
import { validatePolicy } from './validator';
```

---

## Testing Guidelines

### Test Structure

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test component interactions
- **Test file location**: Mirror source structure in `tests/`

Example:
```
src/abac/engine.ts → tests/abac/engine.test.ts
```

### Writing Tests

```typescript
import { ABACEngine } from '../src/abac/engine';

describe('ABACEngine', () => {
  describe('evaluate', () => {
    it('should permit when policy condition matches', async () => {
      // Arrange
      const engine = new ABACEngine({ policies: [] });
      const request = createTestRequest();
      const policy = createTestPolicy();

      // Act
      const decision = await engine.evaluate(request, [policy]);

      // Assert
      expect(decision.decision).toBe(Decision.Permit);
    });

    it('should deny when policy condition does not match', async () => {
      // Arrange, Act, Assert
    });

    it('should handle errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

### Test Coverage

- Aim for **80%+ code coverage**
- All new features must have tests
- Bug fixes should include regression tests
- Test both success and error cases

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- engine.test.ts
```

---

## Documentation

### Code Documentation

Use JSDoc for all public APIs:

```typescript
/**
 * Evaluate an authorization request against policies.
 *
 * @param request - The authorization request
 * @param policies - Array of policies to evaluate
 * @returns Promise resolving to authorization decision
 * @throws {RequestValidationError} If request is invalid
 *
 * @example
 * ```typescript
 * const decision = await engine.evaluate(request, policies);
 * if (decision.decision === Decision.Permit) {
 *   // Allow access
 * }
 * ```
 */
async evaluate(
  request: ABACRequest,
  policies: ABACPolicy[]
): Promise<ABACDecision> {
  // Implementation
}
```

### Documentation Files

When adding features, update relevant documentation:

- `docs/API_REFERENCE.md` - API changes
- `docs/EXAMPLES.md` - Usage examples
- `docs/GLOSSARY.md` - New terminology
- `README.md` - Major features
- `CHANGELOG.md` - All changes

### Documentation Standards

- Write in clear, concise English
- Use code examples liberally
- Explain **why**, not just **what**
- Keep examples realistic and practical
- Link to related concepts

---

## Submitting Changes

### Before Submitting

Checklist:
- [ ] Code follows style guidelines
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### Pull Request Process

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Include examples if applicable

3. **PR Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   How has this been tested?

   ## Checklist
   - [ ] Tests pass
   - [ ] Documentation updated
   - [ ] No TypeScript errors
   ```

4. **Code Review**
   - Address review comments
   - Push additional commits if needed
   - Keep discussion focused and professional

5. **Merge**
   - Maintainer will merge when approved
   - Delete your branch after merge

---

## Release Process

(For maintainers)

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with changes
3. **Create git tag**: `git tag v1.2.3`
4. **Push tag**: `git push --tags`
5. **Publish to npm**: `npm publish`
6. **Create GitHub release** with notes

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

---

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Feature Requests**: Open a GitHub Issue
- **Security Issues**: Email maintainers directly

---

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Mentioned in release notes
- Added to contributors list

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to ABAC Engine!** 🎉
