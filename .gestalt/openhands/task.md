# Implement this phase: Phase 1: Shared enums — LeaveType and LeaveStatus

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/95c30233-04a8-47cf-8fde-3de913f2858a/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/index.ts with two enums:

- LeaveType: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY
- LeaveStatus: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED

These are the canonical enum definitions referenced by all leave-related modules. No dependencies on other project files. Include a Jest unit test at tests/unit/shared/types.test.ts verifying all enum values are defined.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.