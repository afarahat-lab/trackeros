# Implement this phase: Phase 1: Shared types and foundational modules (part 1/2)

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/da3cebcf-aae0-446c-b943-05fc4169a665/1`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create the models and interfaces layer for the foundational modules. This phase produces ONLY type definitions and interfaces — no concrete implementations.

Files to create:

1. `src/shared/types/index.ts` — Define and export three enums exactly as specified:
   - `LeaveType` enum: `'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity'`
   - `LeaveStatus` enum: `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'`
   - `AuditAction` enum: `'CREATE' | 'SUBMIT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CANCEL'`

2. `src/modules/employee/employee.model.ts` — Define and export the `Employee` entity interface with these exact fields: `id: string`, `fullName: string`, `email: string`, `department: string`, `managerId: string | null`, `createdAt: Date`, `updatedAt: Date`.

3. `src/modules/employee/employee.repository.interface.ts` — Define and export `IEmployeeRepository` interface with methods: `findById(id: string): Promise<Employee | null>`, `findByEmail(email: string): Promise<Employee | null>`, `findByDepartment(department: string): Promise<Employee[]>`. Import `Employee` from `./employee.model`.

4. `src/modules/employee/employee.service.interface.ts` — Define and export `IEmployeeService` interface with methods: `getEmployeeById(id: string): Promise<Employee | null>`, `getEmployeeByEmail(email: string): Promise<Employee | null>`. Import `Employee` from `./employee.model`.

5. `src/modules/audit/audit.model.ts` — Define and export the `AuditRecord` entity interface with these exact fields: `id: string`, `entityType: string`, `entityId: string`, `action: AuditAction`, `performedBy: string`, `changes: Record<string, unknown> | null`, `createdAt: Date`. Import `AuditAction` from `../../shared/types`.

6. `src/modules/audit/audit.service.interface.ts` — Define and export `IAuditService` interface with method: `record(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<AuditRecord>`. Import `AuditRecord` from `./audit.model`.

No barrel exports (index.ts) in this phase — those come in part 2 with the implementations. No tests in this phase. All files must pass `tsc --noEmit`.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — binding for every phase of this feature.

Q1 and Q5 are THE SAME QUESTION. Bind ONE definition and use it everywhere.

1 & 5 — LEAVE DAY COUNT = CALENDAR DAYS, INCLUSIVE OF BOTH ENDS:
days = endDate - startDate + 1. Weekends and public holidays are NOT excluded; there is
no holiday calendar in scope for this feature.
Implement this EXACTLY ONCE as a single shared exported helper (e.g. countLeaveDays(startDate, endDate))
in the leave domain module, and call that helper from EVERY site needing a day count:
balance deduction on APPROVED, balance restoration on CANCELLED, the sufficiency check
before approval, entitlement comparison, and minimumNoticeDays enforcement. No call site
may re-derive the count inline — inline re-derivation is the BR-001 anti-pattern this
question exists to prevent.

2 — NO overlapping APPROVED leave for the same employee. Enforce at APPROVAL time, not at
submission. A submission-time check cannot account for other PENDING requests approved
later, so approval is the only authoritative gate. Run the overlap check and the balance
sufficiency check at the SAME point in the approval path so both invariants hold together.
Overlap = any intersection of the [startDate, endDate] range with an existing APPROVED
request for that employee, regardless of leave type.

3 — EMERGENCY LEAVE HAS ITS OWN ENTITLEMENT POOL, separate from annual. Default entitlement
5 days, resets per fiscal year, same cadence as the other types. Model all types uniformly:
annual, sick and emergency each get their own LeavePolicy entitlement and their own
LeaveBalance record. Do not special-case emergency anywhere in the balance logic.

4 — NO documentation requirement for sick leave. Do NOT add a PENDING_DOCUMENTATION state
and do NOT add any document-tracking entity. The LeaveRequest lifecycle is exactly:
PENDING -> APPROVED | REJECTED, and PENDING | APPROVED -> CANCELLED. This is a deliberate
scope decision, not an oversight. [BINDING RULE — operator decision resolving: How is the number of leave days derived from startDate and endDate? Is the range inclusive of both start and end (days = endDate - startDate + 1), exclusive of end (days = endDate - startDate), or measured in business/calendar days? This affects balance deduction, sufficiency checks, and entitlement comparisons across every LeaveRequest operation.; Can an employee have multiple APPROVED LeaveRequests with overlapping date ranges? If not, should the overlap check be enforced at submission time or at approval time?; Does emergency leave draw from the annual leave balance, or does it have a separate entitlement pool? If separate, what is the default entitlement and does it reset per fiscal year or per incident?; Should sick leave require documentation (e.g., doctor's note) after a certain number of consecutive days? If so, what is the threshold and how is it enforced?; How are leave days counted for balance deduction — are start_date and end_date inclusive (i.e. `end_date - start_date + 1`), or exclusive? Are weekends and public holidays excluded from the day count?; apply everywhere these apply, not in one place only]

## Project constraints (NON-NEGOTIABLE — the gate enforces these; satisfy them now)
Your code MUST obey every rule below. These are not style preferences — the quality gate rejects the phase on any violation, so comply up front:
- Use unknown with type guards instead of any (rule: `no-any`)
- Database calls must go through repository pattern (rule: `no-direct-db-outside-repository`)
- No hardcoded passwords, API keys, or tokens (rule: `no-hardcoded-secrets`)
- Do not add @gestalt/* packages as project dependencies — these are Gestalt platform internals not available on npm (rule: `no-gestalt-internal-deps`)

## Architecture & constraint rules the quality gate enforces (satisfy these now)
The quality gate judges your code against the rules below and BLOCKS the phase on any violation — a violation it rates critical escalates to a human with no automatic retry. These are the same rules the gate checks, so comply up front rather than leaving them for the gate:
- Data access is only permitted in the designated data access layer of this project. Code in business logic, presentation, or routing layers must delegate all data operations to the data access layer.
- The data access layer is the only layer permitted to contain connection management, query execution, and direct interaction with the data store.
- Each architectural layer communicates only with its immediately adjacent layer. Layers must not bypass intermediate layers.
- Dependencies flow in one direction only — from outer layers toward inner layers. Inner layers must not depend on outer layers.
- Error handling must be explicit. Callers must not be exposed to unhandled failures from dependencies.
- Do not redefine a symbol another module already owns. Before declaring an error class, DTO, interface, enum, or constant, check whether a symbol representing the SAME concept is already exported by another module; if so, import it from that module's public entry point instead of declaring a second copy. The test is conceptual identity, NOT name identity — a symbol that shares a name but represents a genuinely DIFFERENT concept (different fields or meaning, owned by THIS module) is a legitimately distinct declaration and is not a violation; only flag a declaration that duplicates the shape and meaning of an existing exported symbol.

## Module boundary & dependency rules (satisfy these now)
The quality gate's review judges your code against the project's cross-module dependency rules below and BLOCKS the phase on a violation. These govern how modules depend on each other: import another module ONLY through its declared public entry point (its barrel / index) — never reach into another module's internal files — and introduce no circular dependencies. Comply now rather than leaving them for the gate:
- Modules import from each other ONLY through their declared public entry point (`index.ts`, `__init__.py`, package root — whatever the stack uses)
- No circular dependencies between modules

## Golden principles (NON-NEGOTIABLE — satisfy every one that applies)
These are the project's non-negotiable invariants. A violation is a GOLDEN_PRINCIPLE_BREACH: the quality gate BLOCKS the phase and escalates to a human with NO automatic retry, so it is far more costly than an ordinary finding. Apply EVERY principle relevant to the code you write in this phase — e.g. enforce role-based access control on every API endpoint you add, and validate all inputs at API boundaries before use:
- GP-001 — Repository pattern: All database access goes through repository interfaces. Never query the database directly from services or controllers.
- GP-002 — Audit records: All state-changing operations write an audit record.
- GP-003 — Input validation: Validate all inputs at API boundaries before processing.
- GP-004 — No sensitive data in logs: Never log passwords, tokens, PII, or financial data.
- GP-005 — RBAC enforcement: All API endpoints enforce role-based access control.
- GP-006 — Error handling: No unhandled promise rejections. All async errors are caught and handled.

## Project stack & references
Before writing code, read the referenced files below (those present in the working directory) to learn the project's language, framework, test runner, and conventions, and the cross-cutting rules your code must satisfy — then follow the existing repository conventions:
- `HARNESS.json`
- `docs/ARCHITECTURE.md`
- `docs/GOLDEN_PRINCIPLES.md`
- `AGENTS.md`
- `PLAN.md`

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