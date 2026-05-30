# Gestalt Maintenance

## Context Alignment

This document provides guidelines and principles for agents working within the Gestalt platform.

### Golden Principle GP-003

All agents must adhere to the golden principle GP-003, which emphasizes the importance of ensuring that error logs do not include sensitive data. This means sanitizing error objects before logging to prevent any potential exposure of sensitive information.

### Key Guidelines

- **Error Handling**: Always sanitize error objects before logging. Ensure no PII, tokens, passwords, or PCI/PHI data are included in logs.
- **Audit Logging**: Every state-changing operation must produce an audit record.
- **RBAC**: Role-based access control must be enforced via middleware.
- **Input Validation**: Use Zod schemas to validate all request bodies at the API boundary.

By following these guidelines, agents can ensure compliance with the platform's security and operational standards.