# Implement this phase: Phase 1: Shared types and base infrastructure

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/c651e808-955e-4f50-b871-b7b78fa00b37/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create three foundational files that all subsequent phases depend on:

1. `src/shared/types/index.ts` — Define the canonical enums:
   - `LeaveType` enum with values `ANNUAL`, `SICK`, `EMERGENCY`
   - `LeaveRequestStatus` enum with values `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
   - `LeaveBalanceStatus` enum with values `ACTIVE`, `EXHAUSTED`, `EXPIRED`

2. `src/shared/error-types.ts` — Define base error classes:
   - `AppError` (abstract base extending Error, with `statusCode: number` and `code: string`)
   - `NotFoundError` (extends AppError, statusCode 404)
   - `ValidationError` (extends AppError, statusCode 400, carries `details: unknown[]`)
   - `ConflictError` (extends AppError, statusCode 409)
   - `UnauthorizedError` (extends AppError, statusCode 401)

3. `src/shared/base-repository.ts` — Define a generic `BaseRepository<T>` abstract class with:
   - Constructor taking a Knex instance (import from knex, not pg Pool directly)
   - Abstract `tableName: string` property
   - `findById(id: string): Promise<T | null>`
   - `findAll(filter?: Partial<T>): Promise<T[]>`
   - `create(data: Partial<T>): Promise<T>`
   - `update(id: string, data: Partial<T>): Promise<T | null>`
   - `delete(id: string): Promise<boolean>`

Include Jest unit tests in `tests/unit/shared/` for error-types and base-repository. This phase has no dependencies on any prior phase files.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.