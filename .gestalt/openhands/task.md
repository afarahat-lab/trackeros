# Implement this phase: Phase 4: Shared error types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/4`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create shared error type classes used across modules. No dependencies on prior phases.

Files to create:
- `src/shared/errorTypes.ts` — define typed error classes:
  - `NotFoundError` extending Error with a `resourceName: string` and `resourceId: string` properties
  - `ValidationError` extending Error with a `details: string[]` property for validation messages
  - `ConflictError` extending Error with a `resourceName: string` property (for duplicate/state conflict scenarios)
  - `UnauthorizedError` extending Error (for auth failures)
  - `ForbiddenError` extending Error (for RBAC failures)
  Each class should set `this.name` to the class name and capture the stack trace properly.

Include Jest unit tests in `tests/unit/shared/errorTypes.test.ts` verifying each error class instantiates correctly and preserves its message and custom properties.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Verify before you finish (MANDATORY)
The code you write MUST compile and its tests MUST pass — a compilation or type error must NEVER be left for CI to find. Before you declare this task done:
- Read the project's build / type-check / test commands from `package.json` (scripts) and `HARNESS.json`.
- Install dependencies if they are not already installed, then RUN the type-check / build (e.g. `npm run build` or `tsc --noEmit`) AND the tests (e.g. `npm test`) for the files this phase touches.
- FIX every compilation error, type error, and failing test you introduced — including in test files — and re-run until they pass.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.