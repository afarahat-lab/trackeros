# Gestalt Platform Agents

## Golden Principles

1. **GP-001**: Every state-changing operation produces an audit record.
2. **GP-002**: RBAC enforced at middleware, never inline.
3. **GP-003**: Input validated at the API boundary using Zod schemas.
4. **GP-004**: No sensitive data in logs.

These principles ensure that our system remains secure, auditable, and maintainable.