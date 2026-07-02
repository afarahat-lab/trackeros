# Implement this phase: Phase 1: Shared infrastructure — enums, errors, and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/dad4001c-2c9a-4970-bffb-a47ff1ea15f5/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
[Feature: Build the leave management module. Employees apply for annual, sick, and emergency leave. Managers approve or reject. System tracks leave balances. — Phase 1: Phase 1: Shared infrastructure — enums, errors, and base repository]

Create the shared infrastructure that all leave-related modules depend on.

Create `src/shared/types/index.ts` with:
- Enum `LeaveRequestStatus` with values: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
- Enum `EmploymentStatus` with values: ACTIVE, INACTIVE, TERMINATED

Create `src/shared/errors/index.ts` with base error classes:
- `NotFoundError` (extends Error, takes entityName and id)
- `ValidationError` (extends Error, takes message and optional fieldErrors map)
- `ConflictError` (extends Error, takes message)

Create `src/shared/db/base.repository.ts` with a generic abstract class `BaseRepository<T>` that wraps the pg Pool from `src/shared/db/connection.ts` (already exists — read it before generating). Provide: `findById(id: string): Promise<T | null>`, `findAll(filters?: Record<string, unknown>): Promise<T[]>`, `create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>`, `update(id: string, updates: Partial<T>): Promise<T | null>`, `delete(id: string): Promise<boolean>`. Use parameterized queries via the pg pool.

Include Jest unit tests in `tests/unit/shared/` for the error classes and base repository (mock the pg pool).

## Deferred to later phases
The following concerns are intentionally OUT OF SCOPE for this phase and will be addressed in subsequent phases:
- Phase 2 — Phase 2: LeaveType model and repository: Create the LeaveType domain model and repository. This is a lightweight lookup entity referenced by 
- Phase 3 — Phase 3: Employee model and repository: Create the Employee domain model and repository. Employees apply for leave; managers approve/reject.
- Phase 4 — Phase 4: LeaveRequest model and repository: Create the LeaveRequest domain model and repository — the core entity of the leave management module
- Phase 5 — Phase 5: LeavePolicy model and repository: Create the LeavePolicy domain model and repository. Policies define rules like max days per leave ty
- Phase 6 — Phase 6: Balance model and repository: Create the Balance domain model and repository for tracking employee leave balances. Create `src/mod
- Phase 7 — Phase 7: Database migrations for leave management tables: Create Knex migration files for all leave management tables. These migrations create the actual Post
- Phase 8 — Phase 8: Leave service — business logic for leave lifecycle: Create the leave service layer implementing the full leave request lifecycle: submit, approve, rejec
- Phase 9 — Phase 9: Leave controller and routes — HTTP API surface: Create the Fastify controller and routes for the leave management HTTP API. Create `src/modules/leav
- Phase 10 — Phase 10: Balance service and routes — leave balance tracking API: Create the balance service and HTTP routes to complete the "System tracks leave balances" requiremen

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.