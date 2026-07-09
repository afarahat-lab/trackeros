# Implement this phase: Phase 2: Employee module — model, repository, and tests

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/b05db51f-a0dc-4cb4-93b3-8c6655f6f6af/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the employee domain model and repository together so Aider sees field definitions and their usage in a single context.

This phase depends on:
- `src/shared/types/index.ts` from Phase 1 (for `EmployeeStatus`)
- `src/shared/base.repository.ts` from Phase 1 (for `BaseRepository<T>`)
- `src/shared/db/connection.ts` (already exists)

Files to create:
1. `src/modules/employee/employee.model.ts` — Define the `Employee` interface with exact attributes from the architecture: `id: string`, `employeeNumber: string`, `firstName: string`, `lastName: string`, `email: string`, `managerId: string | null`, `department: string | null`, `hireDate: Date`, `terminationDate: Date | null`, `employmentStatus: EmployeeStatus`, `createdAt: Date`, `updatedAt: Date`. Import `EmployeeStatus` from `src/shared/types/index.ts`.

2. `src/modules/employee/employee.repository.ts` — Define `IEmployeeRepository` interface and `EmployeeRepository` class extending `BaseRepository<Employee>`. Add employee-specific methods: `findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>`, `findByManagerId(managerId: string): Promise<Employee[]>`, `findByDepartment(department: string): Promise<Employee[]>`. Import `Employee` from `./employee.model.ts` and `BaseRepository` from `src/shared/base.repository.ts`.

3. `src/modules/employee/index.ts` — Barrel export of `Employee`, `IEmployeeRepository`, `EmployeeRepository`.

Include Jest unit tests in `tests/unit/modules/employee/` for the repository methods (mock the pool).

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.