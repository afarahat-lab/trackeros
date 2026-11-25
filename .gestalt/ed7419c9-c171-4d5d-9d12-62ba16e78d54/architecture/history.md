# Architecture history — feature ed7419c9-c171-4d5d-9d12-62ba16e78d54

Extracted VERBATIM from `docs/ARCHITECTURE.md` on 2026-11-25 (owner's decision), where
planning had appended it as a per-feature block. The consolidation that followed merged
the repeated sections of all fourteen such blocks into one canonical section per
heading; this file is the unmerged original for THIS feature, including any question
later answered and any decision later superseded.

Nothing below is edited. Source lines 1247-1336 of the pre-consolidation
file, 10,673 bytes.

---

<!-- gestalt:architecture feature=ed7419c9-c171-4d5d-9d12-62ba16e78d54 START -->
## Feature: Honour the PORT environment variable

### Reconciliation summary

- **Canonical resolver seam.** `IPortResolver.resolvePort(rawPort: string | undefined): ResolvedHttpPort` — the app slice's interface, declared before its implementation. The domain slice's `PortEnvironmentInput` is the value object describing the observed environment entry; its `rawValue` is exactly the `rawPort` argument. One method name, one input type, one output type across all three slices.
- **Canonical fallback constant.** `DEFAULT_PORT = 3000`, owned by `shared-config`. No second literal `3000` may exist anywhere in the codebase.
- **Canonical file convention.** `src/shared/config/port-resolver.interface.ts` + `port-resolver.ts` + `index.ts` (the `shared/` foundation convention, matching `shared/db/unit-of-work.ts` and `shared/date/accrual.ts`), NOT the `<name>.service.ts` convention. The app slice flagged the two conventions; one is chosen and applied consistently.
- **Validity predicate.** Strict — trim, `/^[0-9]+$/`, `1 <= n <= 65535`. Adopted from the domain slice's binding rule; the data slice's lenient `parseInt`/`Number` alternatives are rejected. Surfaced as OQ-1 for confirmation.
- **Out-of-range ports.** `> 65535` is INVALID and falls back to 3000 (domain binding rule), so `shared-config` never throws and has **no** dependency on `shared-errors`. The app slice's `shared-config -> shared-errors` edge is therefore dropped; `shared-config` is a leaf.
- **Test seam.** A pure resolver in `shared-config`, unit-tested directly with no socket and no `process.env` mutation; `src/index.ts` stays a thin composition root. This settles the test-seam question raised by all three slices.
- **Stack compliance.** TypeScript / Node 20 / npm / Jest / Fastify / PostgreSQL / modular-monolith — all three slices comply. No non-stack framework appears; no React/Vite surface is touched; no SQL is introduced.

### Domain entities

**PortEnvironmentInput** — the immutable snapshot of the process environment's PORT entry, taken once at startup. Attributes: `rawValue: string | undefined` (the exact observed value, passed as `rawPort`), `presence: PortPresence` (ABSENT | PRESENT), `observedAt: Date`.

**ResolvedHttpPort** — the single authoritative port the process will bind to. Attributes: `port: number` (always a positive integer 1..65535 by construction), `source: PortSource` (ENV | DEFAULT), `rawValue: string | undefined` (diagnostics only; never logged verbatim).

### Lifecycle states

**PortEnvironmentInput**
- `ABSENT` — PORT is not present in the environment (`rawValue === undefined`). Resolution must select the default port.
- `PRESENT` — PORT is present as a string, which may be empty, whitespace-only, non-numeric, zero, negative, fractional, or a valid positive integer. Resolution must classify it via the canonical validity predicate.
- No transitions: the snapshot is taken once and never mutated. ABSENT and PRESENT are terminal observations, not a progression.

**ResolvedHttpPort**
- `RESOLVED` — the port has been derived from the snapshot; the only entry state. Resolution is a pure, total function, so there is no failure state and no transition into it.
- `BOUND` — the resolved port was handed to the HTTP listener and accepted. Reached only from `RESOLVED`, exactly once per process.
- `LISTEN_FAILED` — the listener rejected the bind (e.g. port in use). Reached only from `RESOLVED`; terminal for the process (existing behaviour: log the error, exit non-zero).
- No transition from `BOUND` back to `RESOLVED`: the port is resolved once and never re-read.

No existing lifecycle state changes. Employee, LeaveType, LeavePolicy, LeaveRequest, LeaveBalance, AuditLog and Notification lifecycles are untouched.

### Conceptual table specifications

**None.** This feature creates, reads, updates or deletes no domain state. No new table, column, index or migration is required. Inventing a `server_config` / `app_settings` row holding the port would contradict the feature's contract (the port comes from the environment, not the database) and would add a DB dependency to process startup, which currently has none. The existing conceptual tables (employees, leave_types, leave_policies, leave_requests, leave_balances, notifications, audit_logs) are unchanged and remain specified once, elsewhere in this document.

### Repository interfaces and implementations

**None.** No repository interface and therefore no concrete implementation. GP-001 is not engaged because there is no DB access. The existing `IEmployeeRepository`/`PgEmployeeRepository`, `ILeaveRepository`/`PgLeaveRequestRepository`, `IBalanceRepository`/`PgLeaveBalanceRepository`, `IPolicyRepository`/`PgLeavePolicyRepository`, `ILeaveTypeRepository`/`PgLeaveTypeRepository`, `IAuditRepository`/`PgAuditLogRepository` and `INotificationRepository`/`PgNotificationRepository` (all PostgreSQL via the shared `pg` Pool in `src/shared/db/connection.ts`) are untouched.

### Module boundaries

- **`shared-config`** (`src/shared/config/`) — owns `IPortResolver`, `PortResolver`, `DEFAULT_PORT = 3000`, `PortSource`, the canonical validity predicate, and the public `index.ts` entry point. Pure: no Fastify, no app instance, no `process.env` read (the caller passes the raw value).
- **`bootstrap`** (`src/`) — owns `src/index.ts`, the composition root: reads `process.env.PORT`, resolves it through `IPortResolver`, calls `app.listen({ port, host: '0.0.0.0' })`, emits the startup log line, and owns the failure path (`app.log.error` + `process.exit(1)`).
- **`app`** (`src/app.ts`) — Fastify instance construction, plugin and route registration. Unchanged by this feature.

### Dependency map

- bootstrap -> shared-config
- bootstrap -> app
- shared-config -> (none)

All edges point inward toward shared foundations; nothing depends on `bootstrap`, and `shared-config` depends on no domain module. No cycles.

### Cross-cutting contracts

- **authContract: EMPTY.** No endpoint, no role-gated access, no identity is read or enforced.
- **errorResponseContract: EMPTY.** No API surface is added or changed.
- **transactionContract: EMPTY.** Zero writes, so there is no multi-step write to make atomic and no unit of work to own. The existing contract (service-owned `IUnitOfWork.withTransaction`; repositories accept an optional trailing `PoolClient` defaulting to the shared pool) is unaffected and must not be extended to cover startup.

### Business rules (binding)

1. The HTTP port is supplied by exactly one source: the `PORT` environment variable, resolved once at process bootstrap. No literal port number may be passed to the HTTP listener anywhere else, and no other environment variable may override or supplement `PORT`. The name is matched exactly and case-sensitively.
2. Canonical validity predicate — a PORT value is VALID iff it is a non-empty string that, after trimming leading/trailing whitespace, matches `/^[0-9]+$/` AND whose numeric value is `>= 1` and `<= 65535`. Every other value is INVALID. No call site may apply a looser or stricter test.
3. Fallback rule — when PORT is ABSENT, or PRESENT but INVALID, the resolved port is `DEFAULT_PORT` (3000) with source DEFAULT. The fallback is silent: it never throws, never aborts startup, and never emits a warning or error.
4. Single-resolution / single-source-of-truth — the port is resolved exactly once per process, and `ResolvedHttpPort.port` is the ONLY value used for both the listen call and the startup log line. Re-reading `process.env.PORT` after resolution is forbidden.
5. Resolution is a pure, total function of the environment snapshot: `resolvePort(rawPort) -> ResolvedHttpPort`. No I/O, no global state beyond the argument, no failure mode. Callable in a unit test without starting a server, binding a socket, or mutating `process.env`.
6. The resolved port is a positive integer in 1..65535 inclusive. Zero, negative, fractional and out-of-range values are INVALID and fall back to 3000. Port 0 (OS-assigned ephemeral) is deliberately NOT honoured via PORT, because the startup log line must report a concrete port; tests needing an ephemeral port bind port 0 directly on the Fastify instance (the existing `scripts/smoke.js` pattern).
7. The startup log line keeps its existing exact shape and wording — `Server is running on http://localhost:${port}` — with the resolved port interpolated. The host stays the literal `localhost` even though the listener binds `0.0.0.0`; the message is a developer convenience, not a statement of the bind address.
8. The raw PORT string is never logged, echoed in an error message, or returned in any response. Only the resolved numeric port (and at most the `PortSource` classification) may appear in logs (GP-004).
9. Port resolution is a bootstrap concern only: it writes no audit record (GP-002 does not apply), requires no authentication or role check (GP-005 does not apply), and opens no transaction. It must not be routed through the repository layer (GP-001 does not apply — there is no persisted entity).

### Recommended phases

1. **Phase 1 — `shared-config` module** (`IPortResolver` + `PortResolver` + `DEFAULT_PORT`). 3 files. The only phase introducing new symbols.
2. **Phase 2 — wire `src/index.ts`** to the resolver and keep the startup log accurate. 1 file.
3. **Phase 3 — unit tests** for the PORT resolution rule (three required cases plus the boundary cases the predicate implies). 1 file.

### Open questions

- **OQ-1 — Confirm the strict validity predicate** (trim, `/^[0-9]+$`, 1..65535). The domain slice records this as a binding rule; the data and app slices recorded it as undecided and offered lenient `parseInt`/`Number` alternatives. Reconciliation adopts strict; confirm before implementation.
- **OQ-2 — Silent fallback vs warning** when PORT is present but invalid. The domain binding rule currently mandates silence; the operability concern (a typo'd PORT becomes invisible) remains.
- **OQ-3 — Log sink** for the startup line: keep `console.log` (current) or move to `app.log.info`.
- **OQ-4 — Scope of `shared-config`**: PORT only now (adopted), or migrate `DATABASE_URL` and `JWT_SECRET` into it in this feature.

These four are new and distinct from the pre-existing open questions in this document (day-count calendar vs business days, accrual model, carry-forward cap, migration mechanism, controller layer, BullMQ). Do not merge them into that list without labelling them as this feature's.
<!-- gestalt:architecture feature=ed7419c9-c171-4d5d-9d12-62ba16e78d54 END -->

