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
  
  Tests: Vitest for unit + integration. CI on GitHub Actions
  runs lint (ESLint) + typecheck (tsc --noEmit) + unit tests +
  a Semgrep security pass on every PR. Conventional Commits +
  squash-merge. Strict TypeScript (no implicit any, strict
  null checks).
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)

---

> 🔴 **RESTORED 2026-10-11.** This section was removed by #685, the revert of feature
> `93f4284a`'s premature merge. The revert itself was correct — the feature was not accepted — but
> these answers had only ever reached this repo INSIDE that merge, so reverting the contamination
> took them with it. They are an INPUT to the feature, not documentation of its code: a re-run must
> implement the same answers, and answer 6 in particular was amended by the owner after the fact.
>
> The feature's own `ADR-002`..`ADR-005` were removed by the same revert and are deliberately NOT
> restored — they document code that no longer exists and belong with the feature when it returns.
>
> Found by auditing every hunk the revert removed, after the consult caps turned out to be a second
> casualty of the same commit. `gestalt template upgrade --dry-run` CANNOT find these: it reports
> what the template wants to change, and the revert did not touch the template.
---

# Operator clarification decisions

Answers an operator gave to a clarification the platform raised, recorded so the same question is
not asked again. Each is binding on this project until superseded here.

Numbered `CLARIFY-nnn` rather than `ADR-nnn` on purpose: an ADR records a decision the team reasoned
to, while these are answers to questions the platform could not resolve from the codebase. They
carry the same authority and a different provenance, and conflating the two would lose that.

## CLARIFY-001..008 — Cancellation notifications and the pending-decisions queue

Date: 2026-10-09
Status: Accepted (feature `93f4284a`, confirmed by the platform owner)
Context: The architecture crew parked feature `93f4284a` on eight foundational questions before any
phase was built. Twenty questions were asked across the specialist slices; within-run grouping
presented eight.

**The through-line of all eight: a missing recipient never fails a cancellation, and the
notification set is a function of the STATE CHANGE and the ACTOR, never of who happens to be
available.**

1. **A SUBMITTED request cancelled when the requester has no direct manager** (`managerId` is null)
   notifies nobody, records only the audit entry, and SUCCEEDS (200). No transitive escalation to
   the manager's manager, no ADMIN broadcast, no `ConflictError`. A cancellation is the requester
   withdrawing their own request; refusing it because the org chart is incomplete punishes the user
   for data they do not control.

2. **An APPROVED request cancelled when `approverId` is null** skips the approver notification and
   succeeds — deliberately the same treatment as (1). No backfill migration in this feature and no
   assert-and-fail: a legacy null `approverId` is a known, reachable state, and making it fatal
   turns old data into an outage. The skip is recorded in the audit `afterState` as
   `approverNotificationSkipped` so the gap is visible rather than inferred.

3. **The approver notification ACCOMPANIES the requester's; it does not replace it.** Subject to
   (6), a SUBMITTED or APPROVED cancellation produces one notice per recipient and a DRAFT produces
   only the requester's — matching the existing rule that a DRAFT cancellation touches no balance.
   No recipient list on the `notifications` table.

4. **The leave type is persisted in a nullable `notifications.related_entity_code` column**, with
   the request id in `related_entity_id`. Generic rather than leave-specific; one migration, no new
   table. Free text is not machine-readable and the leave type is not derivable from the request id
   without the join the requirement forbids. The message may also name the type for humans, but the
   column is the contract.

5. **`GET /leaves/pending-decisions` returns SUBMITTED requests only**, ordered `start_date ASC`
   (oldest first). Visibility follows the EXISTING role-scoped rule used by `list` / `getById`: an
   ADMIN sees every SUBMITTED request, a MANAGER sees their direct reports'. `approver_id` needs no
   index for this query.

   🔴 **KNOWN GAP, deliberately accepted.** The queue is status-only: it does NOT exclude requests
   the caller may not decide — a MANAGER's own SUBMITTED request, or one whose requester is not
   their direct report, still appears. Decide-scoping was deferred so this endpoint would not grow a
   second copy of the `assertCanDecide` rule, which is owned by `leave`. The consequence is that the
   queue can list a request its reader cannot act on. Closing it means asking the owning module,
   not re-deciding here.

6. **Every recipient is notified EXCEPT the actor who performed the cancellation** (amended
   2026-10-09; the original answer was "always notify, even when actor === recipient"). The
   overwhelmingly common cancellation is the requester cancelling their own request, so the
   original rule sent almost every cancellation a notice to someone about their own action. The
   recipient set is therefore built once, the actor removed, and duplicates collapsed by recipient
   id — so a requester who is also the recorded approver hears once, and a cancellation whose only
   recipients are the actor notifies nobody and still succeeds.

7. **On the GP-008 reversal path the notification IS emitted**, with the recipient read from the
   ORIGINAL row's `approverId` and `related_entity_id` keyed to the ORIGINAL request id — never the
   reversal row's. The reversal row carries a null `approverId` by construction, so reading the
   recipient off it would silently drop every notification on that path.

8. **The `(related_entity_type, related_entity_id)` index is added in this feature's migration**,
   alongside `related_entity_code`. `docs/ARCHITECTURE.md` already claimed the index existed while
   the initial migration created only `(recipient_id, status)`; this feature is the first whose
   entity linkage on `notifications` is load-bearing, so the drift becomes reachable here. The rest
   of the initial migration is NOT audited against the documented schema as part of this feature.

The existing cancellation audit entry is unchanged in shape.
