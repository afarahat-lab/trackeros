# Implement this phase: Phase 5: Auth middleware and JWT utilities

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/6f64b552-c5b8-42bc-86fa-01fa08ab4abe/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create shared authentication middleware and JWT utilities. No dependencies on prior leave phases.

Files to create:
- `src/shared/auth/jwt.ts` — JWT utility functions: `verifyToken(token: string): Promise<{ userId: string; role: string }>` using jsonwebtoken, `extractTokenFromHeader(authHeader: string | undefined): string | null` to parse Bearer token. Read JWT_SECRET from process.env.
- `src/shared/auth/middleware.ts` — Fastify preHandler middleware: `authenticate` that extracts and verifies JWT, attaches `request.user = { userId, role }` to the request. Export a Fastify `preHandler` hook. Also export `requireRole(...roles: string[])` that returns a preHandler checking the user's role.
- `src/shared/auth/types.ts` — augment Fastify's request type: declare module 'fastify' to add `user?: { userId: string; role: string }` to FastifyRequest.
- `src/shared/auth/index.ts` — barrel export of jwt.ts, middleware.ts, and types.ts.

Include Jest unit tests in `tests/unit/shared/auth/jwt.test.ts` and `tests/unit/shared/auth/middleware.test.ts`.

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