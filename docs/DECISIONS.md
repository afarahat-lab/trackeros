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
  repository, error types, shared type definitions).
  
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

## ADR-002 — Shared leave types and enums

Date: 2026-06-20
Status: Accepted

Decision: Centralize leave management enums in shared types module.
Description: Created `src/shared/types/leave.types.ts` as a leaf dependency
  containing all shared enums for the leave management feature:
  
  - `LeaveType`: ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID, OTHER
  - `LeaveStatus`: PENDING, APPROVED, REJECTED, CANCELLED
  - `NotificationType`: LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED,
    LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED, LEAVE_BALANCE_LOW,
    LEAVE_BALANCE_EXPIRING
  - `AuditAction`: CREATE, UPDATE, DELETE
  - `EntityType`: LEAVE_REQUEST, LEAVE_BALANCE, LEAVE_POLICY, EMPLOYEE,
    NOTIFICATION
  
  Rationale:
  - Enums are used across multiple modules (leave, balance, policy,
    notification, audit)
  - Centralizing prevents circular dependencies between modules
  - Zero internal dependencies make this a true leaf module
  - Regular TypeScript enums (not const enums) chosen for better
    compatibility with transpilers and debugging tools
  
  This file is imported by all leave management modules and has no
  dependencies on other project files.
