# Implement this phase: Phase 1: Shared foundation — enums, error types, and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/cea62b22-5636-423f-b1cb-ef65b5b11db5/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the foundational shared types that all downstream modules depend on.

Files to create:
- `src/shared/types/index.ts` — Define `LeaveType` enum (ANNUAL, SICK, EMERGENCY), `LeaveRequestStatus` enum (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), and `EmploymentStatus` type ('ACTIVE' | 'INACTIVE' | 'TERMINATED'). These are the canonical enum/type names from the architecture.
- `src/shared/errors/index.ts` — Define `AppError` (abstract base), `NotFoundError`, `ValidationError`, and `ConflictError` classes extending `AppError`. Each carries a `statusCode`, `code` string, and optional `details`.
- `src/shared/base.repository.ts` — Define a generic `IBaseRepository<T>` interface with methods: `findById(id: string): Promise<T | null>`, `findAll(filter?: Partial<T>): Promise<T[]>`, `create(entity: Partial<T>): Promise<T>`, `update(id: string, entity: Partial<T>): Promise<T>`, `delete(id: string): Promise<void>`.
- `tests/unit/shared/types.spec.ts` — Jest tests verifying enum values exist and are correct.
- `tests/unit/shared/errors.spec.ts` — Jest tests verifying error classes instantiate correctly with proper statusCode and message.

No dependencies on prior phases — this is the first phase. The existing `src/shared/db/connection.ts` is available but not required for this phase.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.