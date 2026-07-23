# Implement this phase: Phase 1: Knex configuration + LeaveType model, repository, and migration

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/d6603324-1a59-4abc-b8a0-7afc0afd0c77/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the Knex configuration and the LeaveType catalog entity — the foundational lookup that LeaveRequest and LeaveBalance both reference.

Files to create/modify (approximately 5):
- `knexfile.ts` — Knex configuration reading DATABASE_URL from environment, with TypeScript support for migrations
- `src/modules/leave/leave.model.ts` — Define the `LeaveType` interface with fields: id (string), code (string), label (string), description (string), isActive (boolean), createdAt (Date), updatedAt (Date)
- `src/modules/leave/leave.repository.ts` — Define `ILeaveTypeRepository` interface (findAll, findById, findByCode, create) and `KnexLeaveTypeRepository` class implementing it using the Knex instance from the existing `src/shared/db/connection.ts`
- `migrations/001_create_leave_types.ts` — Knex migration: up creates `leave_types` table with columns matching LeaveType fields; down drops the table
- `tests/unit/modules/leave/leave-type.repository.test.ts` — Jest unit tests for KnexLeaveTypeRepository (mock Knex, test findAll returns active types, findById, findByCode)

This phase depends on the existing `src/shared/db/connection.ts` for the database pool. Read it before generating any code that references database connections.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.