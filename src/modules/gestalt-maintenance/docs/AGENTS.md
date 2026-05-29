# Gestalt Maintenance Agents

## Overview

This document provides orientation for agents working within the Gestalt maintenance module.

## Golden Principles

- **GP-001**: Ensure all operations are idempotent.
- **GP-002**: Maintain backward compatibility.
- **GP-003**: No sensitive data in logs. Ensure all sensitive fields are masked before logging.

## Guidelines

- Follow the architecture and coding standards as outlined in the project documentation.
- Ensure all state-changing operations produce an audit record.
- Enforce RBAC via middleware, never inline.
- Validate all inputs at the API boundary using Zod schemas.

## Logging

- Use the platform logger for all logging operations.
- Never log PII, tokens, passwords, or PCI/PHI data.

## Audit Logging

- Use `auditLog.append()` for all POST/PUT/PATCH/DELETE operations.

## RBAC

- Ensure role-based access control is enforced via middleware.

## Input Validation

- Use Zod schemas to validate all request bodies before processing.

## Database Access

- Access the database only through the repository pattern in `src/shared/db/`.

## Configuration

- Use the config module for configuration management. Do not access `process.env` directly.
