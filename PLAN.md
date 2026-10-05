# PLAN.md

## Phase 1: shared-config module: IPortResolver + PortResolver + DEFAULT_PORT

Create the new `shared-config` module under the EXACT directory the architecture declares: `src/shared/config/`. Approximately 3 files, all new, all under `src/shared/config/` — do NOT place any of these symbols in `src/shared/types/` or anywhere else.

Files (approximately 3):
1. `src/shared/config/port-resolver.interface.ts` — declares, in this order, the canonical types and the interface BEFORE any implementation:
   - `PortSource` type = `'ENV' | 'DEFAULT'` (the canonical source discriminator).
   - `PortPresence` type = `'ABSENT' | 'PRESENT'`.
   - `PortEnvironmentInput` with the EXACT canonical field shape: `rawValue: string | undefined` (the exact value of `process.env.PORT` as observed; `undefined` when the variable is not present), `presence: PortPresence` (derived from whether `rawValue` is `undefined`), `observedAt: Date` (the instant the snapshot was taken at process bootstrap). Do not rename, split, add, or omit fields.
   - `ResolvedHttpPort` with the EXACT canonical field shape: `port: number` (effective TCP port, always a positive integer 1..65535 by construction), `source: PortSource` (`ENV` | `DEFAULT`, recording which branch produced the value), `rawValue: string | undefined` (the originating PORT string, retained for diagnostics only; never logged verbatim if it could be non-numeric garbage — GP-004). Do not rename, split, add, or omit fields.
   - `IPortResolver` interface with the single method `resolvePort(rawPort: string | undefined): ResolvedHttpPort` — the `rawPort` argument name is canonical (it is the `PortEnvironmentInput.rawValue` passed in). Declare the interface here, before the implementation, per the architecture.
2. `src/shared/config/port-resolver.ts` — declares `DEFAULT_PORT` constant = `3000` (the SINGLE fallback value in the codebase) and the `PortResolver` class implementing `IPortResolver`. `resolvePort` implements the canonical PORT validity predicate, which is BINDING and must be the ONLY definition of validity in the codebase: trim leading/trailing whitespace, then require `/^[0-9]+$/`, then require `1 <= n <= 65535`. Everything else is INVALID and falls back to `DEFAULT_PORT` with `source: 'DEFAULT'` — including `'3000abc'`, `'3e3'`, `'0xBB8'`, `'+3000'`, `'3000.5'`, `'0'`, `'-1'`, `'70000'`, and `undefined`/absent. Out-of-range is INVALID and falls back; it is NEVER passed through to `app.listen`. A valid value returns `{ port: n, source: 'ENV', rawValue: <the original untrimmed string> }`. The fallback is SILENT (BINDING): no log, no warning, no `console.warn`, no `app.log` — a warning naming the offending value would put an arbitrary environment string into the logs against GP-004. `rawValue` is retained on the returned object for diagnostics only and must never be logged verbatim. The resolver is a PURE function of its argument: it must NOT read `process.env` itself, must not touch the filesystem, and must not throw for any input.
3. `src/shared/config/index.ts` — the public entry point, following the existing `src/shared/<concern>/index.ts` convention (see `src/shared/date/index.ts` for the exact shape: a single re-export line). Re-export `IPortResolver`, `PortResolver`, `DEFAULT_PORT`, `PortSource` (and the entity types `PortEnvironmentInput`, `ResolvedHttpPort`, `PortPresence`) so consumers import only from `src/shared/config`.

Read `src/shared/date/index.ts` and `src/shared/date/accrual.ts` first to match the existing shared-module file/entry-point convention. Read `docs/ARCHITECTURE.md` (the `shared-config` module boundary block) before writing.

Out of scope for this phase (do NOT touch): `src/index.ts` (Phase 2), any test file (Phase 3), `DATABASE_URL` in `src/shared/db/connection.ts`, and `JWT_SECRET` in `src/shared/auth/index.ts` — both stay exactly where they are; `src/shared/config/` owns PORT resolution ONLY in this feature.

Success criteria: `npm run build` (tsc --noEmit) is clean under strict TypeScript with no implicit `any`; the three files exist under `src/shared/config/`; `DEFAULT_PORT` is defined exactly once; the validity predicate is defined exactly once and lives in this module.

## Phase 2: wire src/index.ts to the resolver and keep the startup log accurate

Rewire the process entry point to resolve the port through the shared-config resolver. Approximately 1 file, MODIFIED (not created): `src/index.ts`.

This phase depends on `src/shared/config/index.ts` (and the `IPortResolver` / `PortResolver` / `DEFAULT_PORT` / `PortSource` symbols it re-exports) from Phase 1 — read `src/shared/config/index.ts`, `src/shared/config/port-resolver.interface.ts`, and `src/shared/config/port-resolver.ts` BEFORE generating any code, and import ONLY from the public entry point `./shared/config` (never from `port-resolver.ts` directly). Do not re-implement, duplicate, or inline the validity predicate here — the predicate lives in `src/shared/config/port-resolver.ts` and is the only definition of validity in the codebase.

Current state of `src/index.ts` (read it first): it hardcodes `const PORT = 3000;`, calls `start()` at module import time, and logs `Server is running on http://localhost:${PORT}`.

Required changes:
- Delete the hardcoded `const PORT = 3000;`. Read the raw value from `process.env.PORT` and resolve it through the resolver: construct a `PortResolver` (or accept an injected `IPortResolver` defaulting to `new PortResolver()`) and call `resolvePort(process.env.PORT)`. The `rawPort` argument is the exact observed `process.env.PORT` value (`undefined` when absent) — do not pre-parse, pre-trim, or pre-validate it in `src/index.ts`.
- Use the resolved `ResolvedHttpPort.port` as the SINGLE value for both `app.listen({ port, host: '0.0.0.0' })` and the startup log line, so the two can never disagree. Never pass `process.env.PORT` or any raw string to `app.listen`.
- STARTUP LOG (BINDING): keep `console.log` with the SAME message text as today — only the interpolated value changes, and it must be the resolved port actually bound. Do NOT move the sink to `app.log.info` in this feature, and do NOT log `ResolvedHttpPort.rawValue` (GP-004: an arbitrary environment string must never reach the logs).
- FALLBACK OBSERVABILITY (BINDING): the fallback is SILENT. Do not add any log, warning, or `console.warn` on the fallback path.
- TESTABILITY (BINDING): guard the `start()` call behind `require.main === module` so importing the entry point has NO side effect (no socket bind, no `app.listen`). The module must be importable by Jest without binding a real socket. Keep the existing failure path unchanged: `app.log.error(err)` followed by `process.exit(1)`.
- Keep `import app from './app';` and the `host: '0.0.0.0'` argument exactly as they are. `src/app.ts` is unchanged by this feature.

Out of scope for this phase (do NOT touch): any test file (Phase 3), `src/shared/config/*` (Phase 1, already delivered — treat as a fixed contract), `src/app.ts`, `src/shared/db/connection.ts`, `src/shared/auth/index.ts`.

Success criteria: `npm run build` (tsc --noEmit) is clean under strict TypeScript with no implicit `any`; `src/index.ts` contains no hardcoded port literal and no inline validity logic; the resolved port is the only value reaching both `app.listen` and the log line; importing `src/index.ts` in a test process binds no socket.

## Phase 3: unit tests for the PORT resolution rule

Add the Jest unit tests for the PORT resolution rule. Approximately 1 file, NEW: `tests/unit/shared/port-resolver.test.ts` (matching the existing `tests/unit/shared/date.test.ts` / `types.test.ts` location and naming convention — read `tests/unit/shared/date.test.ts` first to match the suite style).

This phase depends on `src/shared/config/index.ts` from Phase 1 — read `src/shared/config/index.ts`, `src/shared/config/port-resolver.interface.ts`, and `src/shared/config/port-resolver.ts` BEFORE writing any test, and import `PortResolver`, `DEFAULT_PORT`, and `PortSource` from the public entry point `../../../src/shared/config` (never from `port-resolver.ts` directly). Do not re-implement the validity predicate in the test — assert against the resolver's output, and reference `DEFAULT_PORT` rather than a bare `3000` literal so the single fallback value stays single.

TESTABILITY (BINDING): exercise the PURE resolver directly. Do NOT mock `app.listen`, do NOT spawn a child process, and do NOT import `src/index.ts` to drive the test. The `require.main === module` guard added in Phase 2 is what makes the entry point importable, but this test must not depend on it — it tests the resolver, not the bootstrap.

Required cases (all four are mandatory):
1. PORT unset — `resolvePort(undefined)` returns `{ port: DEFAULT_PORT, source: 'DEFAULT' }` (3000).
2. PORT set to a valid value — e.g. `resolvePort('4000')` returns `{ port: 4000, source: 'ENV' }`; also cover a whitespace-padded valid value (e.g. `' 4000 '`) resolving to `4000` with `source: 'ENV'`, proving the trim step of the predicate.
3. PORT set to a non-numeric value — e.g. `resolvePort('not-a-number')` returns `{ port: DEFAULT_PORT, source: 'DEFAULT' }` (3000).
4. Out-of-range — `resolvePort('70000')` returns `{ port: DEFAULT_PORT, source: 'DEFAULT' }` (3000), proving an out-of-range value is INVALID and falls back rather than being passed through to `app.listen`.

Additional cases to pin the STRICT predicate (BINDING — everything else falls back to 3000): `'3000abc'`, `'3e3'`, `'0xBB8'`, `'+3000'`, `'3000.5'`, `'0'`, `'-1'`, and `''` all resolve to `{ port: DEFAULT_PORT, source: 'DEFAULT' }`. Assert `rawValue` is retained on the returned `ResolvedHttpPort` for the diagnostics contract, and assert the resolver never throws for any of these inputs.

Out of scope for this phase (do NOT touch): `src/shared/config/*` (Phase 1) and `src/index.ts` (Phase 2) — both are fixed contracts; no production source file may be modified in this phase. Do not add a test that asserts on log output (the fallback is SILENT by binding rule).

Success criteria: `npx jest` passes with the new suite; the four required cases plus the strict-predicate cases are covered; no production file changed.
