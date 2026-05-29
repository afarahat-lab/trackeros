# AGENTS.md — trackeros

This file is the primary agent orientation document for this project.
Read this file completely before taking any action.

## What this project is

Generate a full-stack, mobile-responsive RICEFW inventory management web application featuring role-based access control, a secure REST API backend, and an interactive Kanban dashboard for tracking custom development objects

## Architecture rules

1. Modules never import from each other's internals — only from index.ts
2. All database access through the repository pattern
3. Every state-changing operation produces an audit record (GP-001)
4. RBAC enforced at middleware, never inline (GP-002)

## When context is missing

Emit a `CONTEXT_GAP` signal with the specific missing information identified.
