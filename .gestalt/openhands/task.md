# Implement this phase: Phase 1: Shared leave enums

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/types/index.ts with three enums needed by all leave domain models:

- `LeaveType` enum: 'annual' | 'sick' | 'emergency'
- `LeaveRequestStatus` enum: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
- `BalanceStatus` enum: 'active' | 'exhausted' | 'frozen'

This file has no dependencies on any other project file. Include a Jest unit test at tests/unit/shared/types.test.ts that verifies all enum values are defined and distinct.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.