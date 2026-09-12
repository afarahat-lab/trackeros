# Implement this phase: Phase 1 — Add AuditAction.CANCEL to shared-types

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/621bb1fd-0965-415a-bf2e-ec2c42b15f04/1`. Do not clone anything; work only in this directory.

You are the IMPLEMENTATION agent, not a planner. The platform measures your work EXCLUSIVELY by the files you create or modify in this working tree (`git status`). Ending your turn with a plan, a summary, or an announcement of what you are 'about to' do — without having actually edited files — is a FAILURE: a turn that leaves the working tree untouched is discarded. Explore only as much as you need, then MAKE the edits with your file-editing tool. Never end your turn before the files exist on disk.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Add the `CANCEL = 'CANCEL'` member to the `AuditAction` enum in `src/shared/types/index.ts` (the shared-types module owns this cross-module value type). Do NOT reuse UPDATE or DELETE. Read the existing `AuditAction` enum in `src/shared/types/index.ts` before editing so the new member matches the existing member style (string literal values). After adding the member, search the codebase for any consumer that switches exhaustively on `AuditAction` (e.g. `src/modules/audit/audit.service.ts` and any other switch statements) and update those consumers so the new CANCEL case is handled — do not leave a non-exhaustive switch that would fail typecheck. This phase touches approximately 1-2 files (the enum plus any exhaustive-switch consumer). No new modules, no routes, no service logic. Include a Jest unit test under `tests/unit/shared/` asserting the `AuditAction` enum now contains the CANCEL member with value 'CANCEL' (extend the existing shared enum test file if one exists).

## Your iteration budget — and how to get more (READ BEFORE YOU START)

You have a HARD budget of **30 iterations** for this task; one tool call is one iteration. When it runs out you are CUT OFF mid-work — the unfinished phase is recorded as a FAILURE, not as progress. Nothing warns you as you approach it, so you cannot rely on noticing.

**Exploration is what exhausts it.** Measured on this platform's recent phases: the code-agent spent 19 of its 27 file-editing calls on `view` — it ran out of budget reading the codebase, not building the feature. Phases that were cut off had nearly all of their budget consumed before the writing started.

You have a `task` tool. It runs a FRESH sub-agent with its OWN separate 30-iteration budget and its OWN context window, in this same working directory. Everything that sub-agent reads and writes costs you **one** iteration, not 30. It is the supported way to get more capacity, and using it is normal — not an admission of difficulty.

### DELEGATE BY DEFAULT

**Assume you WILL delegate this phase. The question is not whether, but how to slice it.** Decide NOW, before your first edit — a decision made after you have spent half your budget exploring is a decision made too late.

Delegate unless the phase is *trivially* small, which means ALL of:
- it creates or changes **at most 2 files**, AND
- it introduces **no new module**, AND
- you are confident you can finish it, verified, in well under 10 iterations.

If you cannot say all three with confidence, delegate. When you are unsure, delegate — an unnecessary hand-off costs a few iterations, whereas running out costs the entire phase.

### Delegate the READING, not just the writing

The most valuable first delegation is usually a SURVEY, because that is where the budget actually goes. Instead of opening a dozen files yourself, send a sub-agent to read them and report back what you need: the existing conventions, the shapes and signatures you must match, where the seams are. It burns its own budget on that reading and returns you a digest for one iteration.

Then delegate the implementation slices.

### How to delegate
- Call `task` with `subagent_type='gestalt-implementer'`, ONE call per slice, at most **4** for this phase. Each call blocks until that sub-agent finishes and reports back — they never run at the same time.
- Split implementation slices by MODULE or FILE GROUP so they own DISJOINT files. Two slices must never edit the same file.
- Give each one a self-contained prompt: the exact files it owns, what to build, the conventions it must follow, and what to report back. It cannot see this task, so anything you do not tell it, it does not know.

**Never delegate the final verification.** Run the build and the tests YOURSELF, over the whole phase, after the slices are back — a sub-agent only sees its own slice, so its 'it passes' means 'my slice compiled', not 'the phase works'.

## Binding architecture rules (operator decisions — NON-NEGOTIABLE, apply everywhere)
These are resolved, feature-wide decisions. Wherever this phase touches the concept a rule names, implement it EXACTLY as stated — do not re-derive, re-interpret, or apply it in one place and omit it in another:
- CONSOLIDATED DECISION — all 5 questions. Guiding principle: pick the rule set that makes the hardest sub-problem disappear rather than the one that needs the most logic. Questions 2, 3 and 5 are the same decision asked three ways (what happens to leave that has already begun); answering 2 determines 3 and 5, and they are answered consistently below.

1. ADMIN AUTHORIZATION: ADMIN may cancel an APPROVED request for anyone. Mirror the existing `assertCanDecide` exactly — ADMIN is exempt from the direct-manager check, MANAGER is not. Do NOT invent a second, different authorization shape for cancel: same roles, same exemption, same "may not act on your own request" rule where it applies. Concretely: owner may cancel their own DRAFT or SUBMITTED request; the direct manager (employee.managerId === actor.id) may cancel an APPROVED request; ADMIN may cancel an APPROVED request for anyone.

2. TIMING: Allow cancellation ONLY before startDate. A request whose startDate is today or in the past may NOT be cancelled — throw ConflictError. This is the binding rule; it is what makes questions 3 and 5 trivial.

3. PRO-RATING: Release the FULL requestedDays. No pro-rating, ever. This follows directly from decision 2: if cancellation is only possible before the leave starts, then no day has been consumed, so a partial release can never be correct. Do NOT implement elapsed-day arithmetic — there is no case that needs it.

4. AUDIT ACTION: Add `CANCEL = 'CANCEL'` to the AuditAction enum in src/shared/types and use it. Do NOT reuse UPDATE or DELETE. GP-002 requires state changes to be auditable, and an audit trail that cannot distinguish a cancellation from an ordinary edit fails that purpose — the whole value of the entry is knowing what happened. This is a deliberate shared-enum change; update every consumer that switches exhaustively on AuditAction.

5. DUPLICATE of question 2 — same decision, stated as the guard: block cancellation once startDate <= today with a ConflictError. Because that guard exists, the usedDays release is unconditional and always the full requestedDays; there is no over-release case to defend against.

BALANCE EFFECTS (making the state transitions explicit, since they are the risky part):
- Cancelling a DRAFT request: no balance change (a DRAFT reserved nothing).
- Cancelling a SUBMITTED request: pendingDays -= requestedDays.
- Cancelling an APPROVED request: usedDays -= requestedDays.
In every case the balance row MUST be read with the row lock before it is written (the repository's `forUpdate` flag) — the deltas are computed in application code, so an unlocked read lets two concurrent operations lose one another's update. Cancel is a write path and must take the lock, exactly as submit/approve/reject do. The whole operation — status change, balance release, audit entry, notification — is ONE unit of work via IUnitOfWork.withTransaction, with the client threaded through every call. [BINDING RULE — operator decision resolving: Should ADMIN be able to cancel an APPROVED request (consistent with the existing assertCanDecide which exempts ADMIN from the direct-manager check), or is cancellation strictly limited to the owner (DRAFT/SUBMITTED) and the direct manager (APPROVED)?; Should a manager be allowed to cancel an APPROVED request after the leave start date has already passed (or after it has fully elapsed)?; When cancelling an APPROVED request that has already partially elapsed, should the released usedDays be pro-rated to only the unelapsed portion, or released in full?; The AuditAction enum (src/shared/types) has CREATE/UPDATE/DELETE/APPROVE/REJECT but no CANCEL. The cancel operation must record an audit entry (GP-002); which action value should it use?; Should cancelling an APPROVED request whose startDate is already in the past (leave partially or fully taken) be blocked, or is the full usedDays release always permitted regardless of elapsed time?; apply everywhere these apply, not in one place only]

## Constraints & consistency
You CHOOSE the implementation shape (files, types, routes, components). It MUST satisfy EVERY item below — these are requirements, not suggestions.
### Reuse & consistency — match these exactly
- The new CANCEL member must match the existing string-literal member style (uppercase value equal to member name) of the AuditAction enum. (see `src/shared/types/index.ts`)
- The updated test must extend the existing AuditAction member-list assertion in the shared enum test file rather than introducing a divergent assertion style. (see `tests/unit/shared/types.test.ts`)
### Entity invariants — enforce these
- Reuse or extend `AuditAction`: AuditAction is a string-literal enum whose members are the canonical persisted audit-action values; it must contain exactly CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL in that order, each with an uppercase string-literal value equal to its member name.

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
- **While fixing, re-run ONLY what you are fixing** — the specific failing test file(s), or the type-check alone for a type error. Do NOT re-run the whole suite after every edit. A measured run spent ~60 full build/test cycles inside a 30-iteration budget and was cut off mid-work: the suite is the slowest thing you can do, and re-running all of it to learn about one file buys nothing.
- Run the FULL build and the FULL suite ONCE at the end, to confirm the whole phase holds together. That run is the one that matters; the narrow ones are just your fix loop.
- If a command HANGS or produces no output, do not sit through it repeatedly: note it, work around it (a narrower target, or a timeout), and say so in your final message. Repeatedly interrupting and re-running the same hanging command is the single most expensive thing you can do with your budget.
- Only when the build and the tests pass may you consider the task complete. If a dependency install genuinely cannot be made to work, say so explicitly in your final message rather than declaring success on unverified code.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations. (Running the build / type-check / tests above is expected and encouraged — that is NOT a git operation.)
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.