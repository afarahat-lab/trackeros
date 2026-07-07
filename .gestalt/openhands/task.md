# Implement this phase: Phase 2: Employee module — model and repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/cea62b22-5636-423f-b1cb-ef65b5b11db5/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the Employee domain model and repository. This phase depends on `src/shared/types/index.ts` from Phase 1 (for EmploymentStatus) and `src/shared/base.repository.ts` from Phase 1 (for IBaseRepository). Read those files before generating any code.

Files to create:
- `src/modules/employee/employee.model.ts` — Define `Employee` interface with attributes: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmploymentStatus`, `createdAt: Date`, `updatedAt: Date`, `deletedAt: Date | null`. Import `EmploymentStatus` from `src/shared/types/index.ts`.
- `src/modules/employee/employee.repository.ts` — Implement `IEmployeeRepository` interface extending `IBaseRepository<Employee>` with additional methods: `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findActive(): Promise<Employee[]>`. Implement `EmployeeRepository` class using the pg pool from `src/shared/db/connection.ts` with parameterized SQL queries.
- `tests/unit/modules/employee/employee.repository.spec.ts` — Jest tests for EmployeeRepository with mocked pg pool, covering findById, findByEmployeeNumber, findByEmail, create, and update.

This phase depends on `src/shared/types/index.ts` and `src/shared/base.repository.ts` from Phase 1 — read them before generating any code that references their types.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.