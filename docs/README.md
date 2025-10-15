# ABAC Engine Documentation

Complete documentation for the ABAC (Attribute-Based Access Control) Engine.

## 📚 Documentation Index

### Getting Started

- **[Main README](../README.md)** - Quick start guide, installation, and basic examples
- **[Glossary](./GLOSSARY.md)** - Complete terminology and concepts reference

### Core Documentation

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation for all classes, methods, and types
- **[Policy Guide](./POLICY_GUIDE.md)** - How to write effective ABAC policies
- **[Examples](./EXAMPLES.md)** - Real-world use cases and integration examples
- **[Error Handling](./ERROR_HANDLING.md)** - Error handling best practices and custom error classes

### Architecture & Design

- **[Refactoring Documentation](./refactoring/)** - History of code improvements and refactoring steps

---

## 🎯 Quick Navigation

### I want to...

#### Learn the Basics
- [What is ABAC?](./GLOSSARY.md#core-abac-concepts) - Understanding ABAC
- [Core Concepts](./GLOSSARY.md#core-abac-concepts) - Attributes, Policies, Decisions
- [Architecture](./GLOSSARY.md#architecture-components) - PDP, PIP, PAP, PEP

#### Get Started
- [Installation](../README.md#installation) - npm install instructions
- [Quick Start](../README.md#quick-start) - Your first policy in 5 minutes
- [Basic Examples](./EXAMPLES.md#basic-examples) - Simple use cases

#### Write Policies
- [Policy Structure](./POLICY_GUIDE.md) - How policies are structured
- [Condition Types](./API_REFERENCE.md#condition) - Comparison, Logical, Function conditions
- [Policy Builder](./API_REFERENCE.md#policybuilder) - Fluent API for building policies
- [Combining Algorithms](./GLOSSARY.md#combining-algorithm) - Resolving policy conflicts

#### Use the Engine
- [ABACEngine API](./API_REFERENCE.md#abacengine) - Core engine methods
- [Evaluate Requests](./API_REFERENCE.md#evaluate) - How to evaluate authorization requests
- [Attribute Providers](./API_REFERENCE.md#attribute-providers) - Fetching attributes dynamically
- [Custom Functions](./API_REFERENCE.md#functionregistry) - Register custom condition functions

#### Handle Errors
- [Error Types](./ERROR_HANDLING.md#error-types) - Understanding different errors
- [Error Handling](./ERROR_HANDLING.md#best-practices) - Best practices
- [Custom Errors](./ERROR_HANDLING.md#error-class-hierarchy) - Using error classes

#### Integrate with My App
- [Express.js Integration](./EXAMPLES.md#expressjs-middleware) - Middleware example
- [NestJS Integration](./EXAMPLES.md#nestjs-guard) - Guard example
- [Database Integration](./EXAMPLES.md#database-integration-prisma) - Prisma example
- [Multi-Tenant SaaS](./EXAMPLES.md#multi-tenant-saas-application) - Complete example

#### Real-World Examples
- [Document Management](./EXAMPLES.md#document-management-system) - DMS with ABAC
- [Healthcare System](./EXAMPLES.md#healthcare-system) - HIPAA-compliant access
- [Financial Services](./EXAMPLES.md#financial-services) - Banking access control
- [E-Commerce](./EXAMPLES.md#e-commerce-platform) - Product and order management
- [API Gateway](./EXAMPLES.md#api-gateway) - Rate limiting and API access

---

## 📖 Documentation by Topic

### Policies

| Topic | Document | Section |
|-------|----------|---------|
| Policy Structure | [API Reference](./API_REFERENCE.md#abacpolicy) | Types |
| Building Policies | [API Reference](./API_REFERENCE.md#policybuilder) | Core Classes |
| Policy Validation | [API Reference](./API_REFERENCE.md#validation-functions) | Utilities |
| Policy Examples | [Examples](./EXAMPLES.md) | All sections |
| Writing Effective Policies | [Policy Guide](./POLICY_GUIDE.md) | Complete guide |

### Attributes

| Topic | Document | Section |
|-------|----------|---------|
| What are Attributes? | [Glossary](./GLOSSARY.md#attribute) | Core Concepts |
| Attribute Providers | [API Reference](./API_REFERENCE.md#attribute-providers) | Complete guide |
| Attribute References | [API Reference](./API_REFERENCE.md#attributeref) | Utilities |
| Attribute Resolution | [Glossary](./GLOSSARY.md#attribute-resolution) | Evaluation Concepts |

### Conditions

| Topic | Document | Section |
|-------|----------|---------|
| Condition Types | [API Reference](./API_REFERENCE.md#condition) | Types |
| Comparison Operators | [Glossary](./GLOSSARY.md#comparison-condition) | Policy Components |
| Logical Operators | [Glossary](./GLOSSARY.md#logical-condition) | Policy Components |
| Function Conditions | [Glossary](./GLOSSARY.md#function-condition) | Policy Components |
| Building Conditions | [API Reference](./API_REFERENCE.md#conditionbuilder) | Core Classes |

### Evaluation

| Topic | Document | Section |
|-------|----------|---------|
| How Evaluation Works | [Glossary](./GLOSSARY.md#evaluation-concepts) | Complete section |
| Combining Algorithms | [Glossary](./GLOSSARY.md#combining-algorithm) | Evaluation Concepts |
| Decisions | [Glossary](./GLOSSARY.md#decision) | Core Concepts |
| Evaluation API | [API Reference](./API_REFERENCE.md#evaluate) | Methods |

### Advanced Topics

| Topic | Document | Section |
|-------|----------|---------|
| Multi-Tenancy | [Glossary](./GLOSSARY.md#multi-tenant) | Technical Terms |
| Obligations & Advice | [Glossary](./GLOSSARY.md#obligation) | Policy Components |
| Custom Functions | [API Reference](./API_REFERENCE.md#functionregistry) | Services |
| Caching | [Glossary](./GLOSSARY.md#cache) | Implementation |
| Audit Logging | [Glossary](./GLOSSARY.md#audit-log) | Implementation |
| Performance | [Glossary](./GLOSSARY.md#metrics) | Implementation |

---

## 🔍 Glossary Quick Reference

### Essential Terms

- **[ABAC](./GLOSSARY.md#abac-attribute-based-access-control)** - Attribute-Based Access Control
- **[Attribute](./GLOSSARY.md#attribute)** - Property of subject/resource/action/environment
- **[Policy](./GLOSSARY.md#policy)** - Rule granting or denying access
- **[Condition](./GLOSSARY.md#condition)** - Boolean expression in policies
- **[Decision](./GLOSSARY.md#decision)** - Result of evaluation (Permit/Deny/etc.)
- **[Effect](./GLOSSARY.md#effect)** - What policy does if condition is true

### Architecture

- **[PDP](./GLOSSARY.md#pdp-policy-decision-point)** - Policy Decision Point (the engine)
- **[PIP](./GLOSSARY.md#pip-policy-information-point)** - Policy Information Point (attribute providers)
- **[PAP](./GLOSSARY.md#pap-policy-administration-point)** - Policy Administration Point (policy storage)
- **[PEP](./GLOSSARY.md#pep-policy-enforcement-point)** - Policy Enforcement Point (your middleware)

### Advanced

- **[Tenant](./GLOSSARY.md#tenant)** - Isolated customer/organization
- **[Multi-Tenant](./GLOSSARY.md#multi-tenant)** - Multiple isolated customers
- **[Obligation](./GLOSSARY.md#obligation)** - Required action if policy applies
- **[Advice](./GLOSSARY.md#advice)** - Optional suggestion from policy
- **[Target](./GLOSSARY.md#target)** - Policy applicability filter

---

## 📋 Common Use Cases

### By Industry

1. **Healthcare** - [HIPAA-compliant access control](./EXAMPLES.md#healthcare-system)
2. **Financial Services** - [Banking and account access](./EXAMPLES.md#financial-services)
3. **E-Commerce** - [Product and order management](./EXAMPLES.md#e-commerce-platform)
4. **SaaS** - [Multi-tenant isolation](./EXAMPLES.md#multi-tenant-saas-application)
5. **Enterprise** - [Document management](./EXAMPLES.md#document-management-system)

### By Feature

1. **Department-Based Access** - [Basic example](./EXAMPLES.md#simple-department-based-access)
2. **Time-Based Access** - [Business hours policies](./EXAMPLES.md#time-based-access-control)
3. **Location-Based Access** - [Geo-fencing](./EXAMPLES.md#geo-fencing)
4. **Data Classification** - [Sensitivity levels](./EXAMPLES.md#data-classification)
5. **API Rate Limiting** - [API gateway](./EXAMPLES.md#api-gateway)

---

## 🛠️ Integration Guides

### Frameworks

- [Express.js](./EXAMPLES.md#expressjs-middleware) - REST API middleware
- [NestJS](./EXAMPLES.md#nestjs-guard) - Guard implementation
- GraphQL - Coming soon

### Databases

- [Prisma](./EXAMPLES.md#database-integration-prisma) - ORM integration
- PostgreSQL - [Attribute provider](./API_REFERENCE.md#databaseattributeprovider)
- MongoDB - Coming soon

### Authentication

- JWT - Extract attributes from token
- OAuth2 - Use claims as attributes
- LDAP/AD - [LDAP provider](./API_REFERENCE.md#ldapattributeprovider)

---

## 🔧 API Quick Reference

### Core Classes

```typescript
// Engine
const engine = new ABACEngine(config);
const decision = await engine.evaluate(request, policies);

// Policy Builder
const policy = PolicyBuilder.create('my-policy')
  .permit()
  .condition(...)
  .build();

// Condition Builder
const condition = ConditionBuilder.equals(
  AttributeRef.subject('dept'),
  AttributeRef.resource('dept')
);
```

See [API Reference](./API_REFERENCE.md) for complete documentation.

---

## 🐛 Troubleshooting

### Common Issues

1. **Decision is NotApplicable**
   - Check policy target matches your request
   - Verify condition logic
   - Review [evaluation concepts](./GLOSSARY.md#evaluation-concepts)

2. **Decision is Indeterminate**
   - Check for evaluation errors
   - Review error logs
   - See [error handling guide](./ERROR_HANDLING.md)

3. **Attributes not resolved**
   - Verify attribute providers are registered
   - Check attribute category/ID matches
   - See [attribute providers](./API_REFERENCE.md#attribute-providers)

4. **Performance issues**
   - Enable result caching
   - Optimize policy conditions
   - Use policy targets
   - See [performance section](./GLOSSARY.md#metrics)

---

## 📚 Additional Resources

### Code Examples

- [Basic Usage](../examples/simple-usage.ts) - Simple examples
- [ABAC Examples](../examples/abac/basicUsage.ts) - Complete ABAC scenarios
- [Logger Usage](../examples/logger-usage.ts) - Logging integration

### Reference Materials

- [NIST ABAC Guide](https://csrc.nist.gov/publications/detail/sp/800-162/final)
- [XACML Standard](http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)

### Community

- GitHub Issues - Report bugs or request features
- GitHub Discussions - Ask questions, share ideas

---

## 📝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

**Need help?** Check the [Glossary](./GLOSSARY.md) for terminology or [Examples](./EXAMPLES.md) for real-world use cases.
