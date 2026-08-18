# AGENTS.md — trackeros

This file is the primary agent orientation document for this project.
Read this file completely before taking any action.

## What this project is

Trackeros — a corporate operations web and mobile platform for
  mid-sized companies. Provides employee self-service (leave
  requests, balances, expense claims), manager workflows
  (approvals, team views, time-off calendars), and HR admin
  surfaces (leave policy configuration, balance accruals,
  audit reports).
  
  Backend: TypeScript on Node 20 (Fastify), PostgreSQL via
  Knex migrations + a thin repository layer, BullMQ for
  background jobs (accrual schedulers, notification fanout).
  Module structure: src/modules/<name>/<name>.{model,
  repository,service,controller,routes}.ts. Domain modules
  include leave, balance, employee, policy, notification.
  Shared utilities under src/shared/ (db connection, base
  repository, error types).
  
  Frontend: React + Vite SPA for the web client, React Native
  for the mobile client (shared @trackeros/contracts package
  for the typed REST surface). Auth via JWT against the
  backend's /auth endpoints; identity comes from corporate
  OIDC in production and from local users in development.
  
  Tests: Jest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).

## Project stack

- Runtime: Node 20 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Fastify
- Frontend: React Native
- Database: PostgreSQL

See `docs/ARCHITECTURE.md` for the full architecture overview and
module layout.

Note: the Gestalt platform itself runs on Node 20 + pnpm 9.x as a
self-imposed constraint. That has no bearing on this project —
user projects use whatever stack matches their description.

## Architecture rules

1. Modules never import from each other's internals — only from index.ts
2. All database access through the repository pattern
3. Every state-changing operation produces an audit record (GP-002)
4. RBAC enforced at middleware, never inline (GP-005)

## What agents must never do

- Violate principle GP-003 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-004 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-005 as defined in `GOLDEN_PRINCIPLES.md`.
- Violate principle GP-006 as defined in `GOLDEN_PRINCIPLES.md`.

## When context is missing

Emit a `CONTEXT_GAP` signal with the specific missing information identified.

## Operator notes — Git credential scopes

The personal access token registered with this project drives BOTH the
platform's clone/push and the deploy layer's CI/CD calls. Required scopes:

- **GitHub PAT (classic)** — `repo` (clone, push, create PRs) +
  `workflow` (dispatch GitHub Actions workflows). Fine-grained PATs need
  Contents: read+write, Pull requests: read+write, Actions: read+write,
  Workflows: read+write.
- **GitLab Project Access Token** — `api` + `write_repository`.
- **Azure DevOps PAT** — `Code (Read & Write)` + `Build (Read & Execute)`.

Without the workflow scope the deploy layer's pipeline-agent will fail with
a `GOLDEN_PRINCIPLE_BREACH` signal and the intent will be escalated for
human review. Re-issue the PAT with the missing scope and re-register the
project to recover.

## Custom agents

Project-specific agents can be defined in `agents.yaml` under
`custom_agents`. They run after the framework generate agents
(intent / design / context / lint-config / code / test) and BEFORE
dispatch to the quality gate. Each custom agent receives the
generated artifacts as part of its prompt and returns structured
findings.

The orchestrator routes findings to typed signals the gate
evaluates:

- `high` severity findings → `CONSTRAINT_VIOLATION`
- `medium` / `low` findings → `LINT_FAILURE`
- LLM error or response parse failure → `CONTEXT_GAP`

Custom agents **never** emit `GOLDEN_PRINCIPLE_BREACH` — that
signal type is reserved for framework infrastructure agents and
the review-agent.

See `agents.yaml` for the full schema and a commented-out example.
Run `gestalt agents list <projectName>` to see the active agents
for this project; `gestalt agents validate <projectName>` checks
that your custom-agent definitions parse cleanly.
