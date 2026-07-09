# Implement this phase: Phase 1: Shared foundation — types, base repository, error types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/b05db51f-a0dc-4cb4-93b3-8c6655f6f6af/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create three files that all downstream modules depend on:

1. `src/shared/types/index.ts` — Define the canonical enums: `LeaveType` (values: ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` (values: PENDING, APPROVED, REJECTED, CANCELLED), and `EmployeeStatus` (values: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE). Export all from a barrel.

2. `src/shared/base.repository.ts` — Define a generic abstract class `BaseRepository<T>` with common CRUD methods: `findById(id: string): Promise<T | null>`, `findAll(filters?: Record<string, unknown>): Promise<T[]>`, `create(entity: Partial<T>): Promise<T>`, `update(id: string, updates: Partial<T>): Promise<T>`, `delete(id: string): Promise<void>`. Accept a `pool: Pool` in the constructor. Import `Pool` from `pg` and the pool from `src/shared/db/connection.ts` (already exists).

3. `src/shared/error-types.ts` — Define custom error classes: `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`. Each extends `Error` and accepts a message string.

Include Jest unit tests in `tests/unit/shared/` for the base repository (mock the pool) and error types.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.