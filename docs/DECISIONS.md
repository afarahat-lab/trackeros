# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-10
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: Trackeros — a corporate operations web and mobile platform for
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
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)
