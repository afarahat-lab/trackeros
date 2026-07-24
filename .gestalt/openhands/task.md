# Implement this phase: Phase 2: Shared base repository and error types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/e7c49d71-30a2-45f6-9ac3-179c69d7de0f/2`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create two shared utility files that the leave repository will extend:

1. `src/shared/error-types.ts` — Define `NotFoundError`, `ValidationError`, and `ConflictError` classes extending the native `Error`. Each carries an optional `details` property of type `unknown`.

2. `src/shared/base-repository.ts` — Define a generic abstract class `BaseRepository<T>` that accepts the pg `Pool` from `src/shared/db/connection.ts` (already exists — read it before generating). Provide protected methods: `query(text, params)` delegating to `pool.query`, and abstract `findById(id: string): Promise<T | null>`.

Include Jest unit tests at `tests/unit/shared/error-types.test.ts` and `tests/unit/shared/base-repository.test.ts`.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.