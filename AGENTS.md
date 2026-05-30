# AGENTS.md — trackeros

This file is the primary agent orientation document for this project.
Read this file completely before taking any action.

## What this project is

ls

## Architecture rules

1. Modules never import from each other's internals — only from index.ts
2. All database access through the repository pattern
3. Every state-changing operation produces an audit record (GP-001)
4. RBAC enforced at middleware, never inline (GP-002)

## When context is missing

Emit a `CONTEXT_GAP` signal with the specific missing information identified.
