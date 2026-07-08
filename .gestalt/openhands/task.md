# Implement this phase: Phase 1: Shared error types and base repository

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/be7ddf67-d8cd-4b4b-9a8e-9a007adf8c79/1`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/shared/error.types.ts with NotFoundError, ValidationError, ConflictError classes extending Error. Create src/shared/base.repository.ts with a generic IBaseRepository<T> interface defining findById, findAll, create, update, delete methods, and an abstract BaseKnexRepository<T> class that accepts a Knex instance and provides partial implementations. These are prerequisites for the leave module repository. Include Jest unit tests in tests/unit/shared/.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.