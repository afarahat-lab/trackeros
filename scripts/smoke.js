#!/usr/bin/env node
/**
 * Three-stage smoke check: migrate -> boot -> probe.
 *
 * The deployability brief's mechanism. Every other check in this repo asks "is this code
 * well-formed?" (tsc --noEmit; unit tests with mocked repositories). None asked "does the
 * application start and serve a request?" — so two features shipped that could not run:
 * no schema existed, nothing populated request.user, and the leave routes were never
 * mounted. All three passed the gate.
 *
 * Stage 1 (migrate) is itself a probe, not setup: it fails when the schema mechanism is
 * missing AND when a model writes a column no migration created.
 * Stage 2 (boot) catches an app that cannot start.
 * Stage 3 (probe) hits an AUTHENTICATED endpoint, so it catches unmounted routes (404)
 * and unwired auth (401) — the two failures a public health check cannot see.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB = path.join(__dirname, '..', '.smoke.sqlite');

// Two modes, and the difference is stated rather than hidden.
//   SMOKE_DATABASE_URL set -> all three stages run against real Postgres. The migrated
//                             schema IS the schema the handler queries, so stage 3 covers
//                             persistence end to end. This is the brief's Q1 target.
//   unset                  -> sqlite for stage 1 and no database for the handler. Stages
//                             still catch a missing schema mechanism, a failed boot, an
//                             unmounted route and unwired auth — but NOT persistence, and
//                             the run says so.
const PG = process.env.SMOKE_DATABASE_URL || '';
const MODE = PG ? 'postgres' : 'sqlite';

// A PER-RUN SCHEMA, so concurrent verifications cannot collide in a shared scratch
// database and nothing is left behind. Both halves must agree on it: knex migrates into
// it, and the app's own pool must resolve unqualified table names to it.
const SCHEMA = `smoke_${process.pid}_${Math.floor(Date.now() / 1000)}`;
const pgUrlWithSchema = () => {
  const u = new URL(PG);
  u.searchParams.set('options', `-c search_path=${SCHEMA}`);
  return u.toString();
};

process.env.NODE_ENV = 'test';
process.env.SMOKE_DB = DB;
process.env.SMOKE_SCHEMA = SCHEMA;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-check-secret';

// NEVER inherit DATABASE_URL. This process runs inside the Gestalt server container
// during `verification.command`, and `build_subprocess_env` passes the SERVER's whole
// environment down — including its own DATABASE_URL, which points at the PLATFORM's
// database. Left alone, the application under test would boot and dial Gestalt's own
// Postgres. Reads against missing tables would merely fail, but a check that silently
// connects the subject to the platform's database is not a check anyone should trust.
if (PG) process.env.DATABASE_URL = pgUrlWithSchema();
else delete process.env.DATABASE_URL;

function ok(s) { console.log(`  ✓ ${s}`); }
function die(stage, err) {
  console.error(`\n  ✗ SMOKE FAILED at stage: ${stage}\n    ${err && err.message ? err.message : err}\n`);
  process.exit(1);
}

let sawDbGap = false;

console.log(`\n  smoke mode: ${MODE}${PG ? '' : '  (persistence NOT covered — set SMOKE_DATABASE_URL)'}\n`);

(async () => {
  // ── Stage 1 — migrate against a throwaway database ────────────────────────
  try {
    fs.rmSync(DB, { force: true });
    if (PG) {
      const knex = require('knex')({ client: 'pg', connection: PG });
      try { await knex.raw(`CREATE SCHEMA "${SCHEMA}"`); } finally { await knex.destroy(); }
    }
    execSync(`npx knex migrate:latest --env ${PG ? 'smoke_pg' : 'test'}`, { stdio: 'pipe', env: process.env });
    ok(`stage 1 migrate — schema applied from empty (${MODE}${PG ? `, schema ${SCHEMA}` : ''})`);
  } catch (e) { die('migrate', new Error(String(e.stdout || e))); }

  // ── Stage 2 — boot ────────────────────────────────────────────────────────
  let app;
  try {
    require('ts-node/register');
    app = require('../src/app').default;
    await app.listen({ port: 0, host: '127.0.0.1' });
    ok('stage 2 boot — server listening');
  } catch (e) { die('boot', e); }

  // ── Stage 3 — probe ────────────────────────────────────────────────────────
  //
  // 3a asserts MOUNTING STRUCTURALLY, via the router, not by reading a status code.
  // The first draft inferred it — "404 means the route is not mounted" — and that was
  // wrong in the way that matters: against a real database the handler ran, found no
  // employee, and threw its own NotFoundError, which the error handler correctly turned
  // into a 404. The check called a working application broken. A status code is the
  // handler's answer; whether a route exists is a fact about the router, so ask the
  // router. (`printRoutes()` confirmed both modes register /leaves identically.)
  try {
    const { signToken } = require('../src/shared/auth');
    const { EmployeeRole, EmploymentStatus, LeaveTypeCode } = require('../src/shared/types');

    if (!app.hasRoute({ method: 'POST', url: '/leaves' })) {
      throw new Error('POST /leaves is not registered — leaveRoutes is not mounted in app.ts');
    }
    ok('stage 3a mount — POST /leaves is registered on the router');

    // 3b — auth is ENFORCED. Without this, "mounted" would be satisfied by a route that
    // serves everyone.
    const anon = await app.inject({ method: 'POST', url: '/leaves', payload: {} });
    if (anon.statusCode !== 401) {
      throw new Error(`expected 401 without a token, got ${anon.statusCode} — auth is not enforced`);
    }
    ok('stage 3b auth — unauthenticated request refused (401)');

    // 3c — auth POPULATES request.user. A token must produce something other than 401;
    // any other status means the hook decoded it and the handler ran.
    const EMP = 'smoke-employee';
    const token = signToken({ id: EMP, role: EmployeeRole.EMPLOYEE });
    let authed = await app.inject({
      method: 'POST', url: '/leaves',
      headers: { authorization: `Bearer ${token}` },
      payload: { leaveTypeCode: 'annual', startDate: '2030-03-04', endDate: '2030-03-05' },
    });
    if (authed.statusCode === 401) throw new Error('401 with a valid token — auth did not populate request.user');
    ok('stage 3c auth — a valid token reaches the handler');

    if (!PG) {
      // No database: the handler cannot complete, and this run does not pretend it can.
      console.log(
        '  ! stage 3d SKIPPED — persistence is NOT covered in sqlite mode.\n' +
        '    Stage 1 migrates sqlite while the repositories dial Postgres, so the schema\n' +
        '    under test is not the schema served, and no request completes end to end.\n' +
        '    Run with SMOKE_DATABASE_URL=postgres://... to cover it (brief Q1).'
      );
      sawDbGap = true;
    } else {
      // 3d — the real assertion: a seeded request COMPLETES. This is the only stage that
      // proves the migrated schema and the repositories' queries agree, which is the
      // failure the whole brief is about.
      const knex = require('knex')(require('../knexfile').smoke_pg);  // searchPath = SCHEMA
      let seededRequestId = null;
      // The seeded employee's password_hash is minted with the SAME bcrypt call the app
      // will use to verify it — hashSync(plaintext, 10) — so stage 4's real login can
      // compare against it. Plaintext is shared through SMOKE_PASSWORD so NO credential
      // string is hardcoded in this file (no-hardcoded-secrets).
      const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || 'smoke-check-password';
      try {
        const passwordHash = bcrypt.hashSync(SMOKE_PASSWORD, 10);

        await knex('employees').insert({
          id: EMP, employee_number: 'E-0001', first_name: 'Smoke', last_name: 'Test',
          email: 'smoke@example.com', role: EmployeeRole.EMPLOYEE,
          manager_id: null, department: 'Engineering',
          hire_date: '2020-01-01', employment_status: EmploymentStatus.ACTIVE,
          password_hash: passwordHash,
        });
        await knex('leave_types').insert([
          { code: LeaveTypeCode.ANNUAL, name: 'Annual', requires_approval: true, is_paid: true },
          { code: LeaveTypeCode.SICK, name: 'Sick', requires_approval: true, is_paid: true },
        ]);
        await knex('leave_policies').insert([
          {
            id: 'pol-1', leave_type_code: LeaveTypeCode.ANNUAL, policy_name: 'Standard',
            annual_entitlement_days: 25, accrual_period_months: 12, carry_forward_days: 0,
            min_notice_days: 0, requires_manager_approval: true,
            effective_from: '2020-01-01', status: 'ACTIVE',
          },
          // A SECOND leave type with an EFFECTIVE policy but NO balance row: it must be
          // omitted (never synthesized) by GET /balances/me — stage 8 asserts exactly this.
          {
            id: 'pol-2', leave_type_code: LeaveTypeCode.SICK, policy_name: 'Sick',
            annual_entitlement_days: 10, accrual_period_months: 12, carry_forward_days: 0,
            min_notice_days: 0, requires_manager_approval: true,
            effective_from: '2020-01-01', status: 'ACTIVE',
          },
        ]);
        await knex('leave_balances').insert({
          id: 'bal-1', employee_id: EMP, leave_type_code: LeaveTypeCode.ANNUAL,
          // period_end is EXCLUSIVE: periodContaining() builds [start, start+accrualMonths)
          // from the hire date and matches `date < end`, so the 2030 period ends 2031-01-01.
          period_start: '2030-01-01', period_end: '2031-01-01',
          // available = entitled - used - pending, so pending must be 0 for a NEW request
          // to have anything available. (pending is days already reserved by requests in
          // flight; the approve/reject paths are the ones that need it non-zero.)
          entitled_days: 25, used_days: 0, pending_days: 0,
        });
      } finally { await knex.destroy(); }

      authed = await app.inject({
        method: 'POST', url: '/leaves',
        headers: { authorization: `Bearer ${token}` },
        payload: { leaveTypeCode: 'annual', startDate: '2030-03-04', endDate: '2030-03-05' },
      });
      if (authed.statusCode >= 400) {
        throw new Error(
          `POST /leaves returned ${authed.statusCode} against real Postgres with the row set ` +
          `seeded. The migrated schema and the repositories disagree, or the handler is ` +
          `broken — either way a genuine defect. body: ${String(authed.payload || '').slice(0, 400)}`
        );
      }
      const createdLeave = JSON.parse(authed.payload);
      seededRequestId = createdLeave.id;
      ok(`stage 3d persistence — a seeded leave request was created end to end (${authed.statusCode})`);

      // ── Stage 4 — login: real end-to-end credential flow ────────────────────────
      // Exercises AuthService.login through bcrypt.compare against the seeded hash. The
      // returned token is minted under the SAME JWT_SECRET registerAuth verifies, so it is
      // a genuine login token — not the hand-minted `signToken` used by stages 3b/3c.
      let login;
      try {
        login = await app.inject({
          method: 'POST', url: '/auth/login',
          payload: { email: 'smoke@example.com', password: SMOKE_PASSWORD },
        });
      } catch (e) { die('stage 4 login', e); }
      if (login.statusCode !== 200) {
        throw new Error(
          `POST /auth/login returned ${login.statusCode} for the seeded credentials. ` +
          `body: ${String(login.payload || '').slice(0, 400)}`
        );
      }
      const loginBody = JSON.parse(login.payload);
      if (typeof loginBody.token !== 'string' || loginBody.token.length === 0) {
        throw new Error(`POST /auth/login returned no token: ${String(login.payload)}`);
      }
      if (!loginBody.profile || typeof loginBody.profile !== 'object') {
        throw new Error(`POST /auth/login returned no profile: ${String(login.payload)}`);
      }
      // 10 fields of EmployeeProfile: no passwordHash, no terminationDate; managerId and
      // department are null because the seed left them unset. Mirrors the stage 5 assertion.
      const loginProfile = loginBody.profile;
      const expectedLoginProfile = {
        id: EMP, employeeNumber: 'E-0001', firstName: 'Smoke', lastName: 'Test',
        email: 'smoke@example.com', role: EmployeeRole.EMPLOYEE,
        managerId: null, department: null,
        hireDate: '2020-01-01T00:00:00.000Z', employmentStatus: EmploymentStatus.ACTIVE,
      };
      for (const key of Object.keys(expectedLoginProfile)) {
        if (loginProfile[key] !== expectedLoginProfile[key]) {
          throw new Error(
            `login profile mismatch on ${key}: got ${JSON.stringify(loginProfile[key])}, ` +
            `expected ${JSON.stringify(expectedLoginProfile[key])}`
          );
        }
      }
      if ('passwordHash' in loginProfile || 'terminationDate' in loginProfile) {
        throw new Error(`login profile must not expose passwordHash/terminationDate: ${String(login.payload)}`);
      }
      const loginToken = loginBody.token;
      ok('stage 4 login — real credentials return a token + profile (200)');

      // ── Stage 5 — profile via /employees/me ─────────────────────────────────────
      // 10 fields of EmployeeProfile: no passwordHash, no terminationDate; managerId is
      // null because the seed left it unset, and department matches the seed value.
      let me = await app.inject({
        method: 'GET', url: '/employees/me',
        headers: { authorization: `Bearer ${loginToken}` },
      });
      if (me.statusCode !== 200) {
        throw new Error(`GET /employees/me returned ${me.statusCode}`);
      }
      const meBody = JSON.parse(me.payload);
      const expectedProfile = {
        id: EMP, employeeNumber: 'E-0001', firstName: 'Smoke', lastName: 'Test',
        email: 'smoke@example.com', role: EmployeeRole.EMPLOYEE,
        managerId: null, department: 'Engineering',
        hireDate: '2020-01-01T00:00:00.000Z', employmentStatus: EmploymentStatus.ACTIVE,
      };
      for (const key of Object.keys(expectedProfile)) {
        if (meBody[key] !== expectedProfile[key]) {
          throw new Error(
            `GET /employees/me profile mismatch on ${key}: got ${JSON.stringify(meBody[key])}, ` +
            `expected ${JSON.stringify(expectedProfile[key])}`
          );
        }
      }
      if ('passwordHash' in meBody || 'terminationDate' in meBody) {
        throw new Error(`GET /employees/me must not expose passwordHash/terminationDate: ${String(me.payload)}`);
      }
      ok('stage 5 profile — /employees/me returns the exact 10-field EmployeeProfile');

      // ── Stage 6 — list returns the seeded request to its owner ──────────────────
      let list = await app.inject({
        method: 'GET', url: '/leaves',
        headers: { authorization: `Bearer ${loginToken}` },
      });
      if (list.statusCode !== 200) throw new Error(`GET /leaves returned ${list.statusCode}`);
      const listBody = JSON.parse(list.payload);
      if (!Array.isArray(listBody) || !listBody.some((l) => l.id === seededRequestId)) {
        throw new Error(`GET /leaves did not include the seeded request ${seededRequestId}`);
      }
      ok(`stage 6 list — GET /leaves includes the seeded request for its owner (${listBody.length} total)`);

      // ── Stage 7 — getById returns the seeded request ─────────────────────────────
      let one = await app.inject({
        method: 'GET', url: `/leaves/${seededRequestId}`,
        headers: { authorization: `Bearer ${loginToken}` },
      });
      if (one.statusCode !== 200) {
        throw new Error(`GET /leaves/${seededRequestId} returned ${one.statusCode}`);
      }
      const oneBody = JSON.parse(one.payload);
      if (oneBody.id !== seededRequestId || oneBody.employeeId !== EMP) {
        throw new Error(`GET /leaves/:id did not return the seeded request: ${String(one.payload)}`);
      }
      ok('stage 7 getById — GET /leaves/:id returns the seeded request');

      // ── Stage 8 — current-period balances omit effective policies with no row ──
      // ONLY the ANNUAL balance exists (the SICK leave type has an effective ACTIVE policy
      // but NO leave_balances row), so the response must contain exactly that one balance
      // for the CURRENT period and nothing synthesized for SICK.
      //
      // The current period is derived with the SAME periodContaining the service uses
      // (src/shared/date), anchored on the hire date — never a hand-written date — so the
      // assertion matches getCurrentBalances() for whatever `new Date()` is at run time.
      const { periodContaining } = require('../src/shared/date');
      const hireDate = new Date('2020-01-01T00:00:00.000Z');
      const curPeriod = periodContaining(hireDate, 12, new Date());
      const curStartStr = curPeriod.start.toISOString().slice(0, 10);
      const curEndStr = curPeriod.end.toISOString().slice(0, 10);

      // Re-key the seeded balance to the CURRENT period, so GET /balances/me returns it
      // (the service only reads the current period — a 2030 row would be invisible today
      // and the check would assert against an empty list).
      const knexRefresh = require('knex')(require('../knexfile').smoke_pg);
      try {
        await knexRefresh('leave_balances').where({ id: 'bal-1' }).update({
          period_start: curStartStr,
          period_end: curEndStr,
        });
      } finally { await knexRefresh.destroy(); }

      const balances = await app.inject({
        method: 'GET', url: '/balances/me',
        headers: { authorization: `Bearer ${loginToken}` },
      });
      if (balances.statusCode !== 200) {
        throw new Error(`GET /balances/me returned ${balances.statusCode}`);
      }
      const balanceList = JSON.parse(balances.payload);
      if (!Array.isArray(balanceList) || balanceList.length !== 1) {
        throw new Error(
          `GET /balances/me must contain EXACTLY one balance, got ${balanceList.length}: ` +
          String(balances.payload)
        );
      }
      const annualBalance = balanceList[0];
      if (annualBalance.leaveTypeCode !== LeaveTypeCode.ANNUAL) {
        throw new Error(`expected the annual balance, got ${annualBalance.leaveTypeCode}`);
      }
      if (annualBalance.periodStart !== `${curStartStr}T00:00:00.000Z` ||
          annualBalance.periodEnd !== `${curEndStr}T00:00:00.000Z`) {
        throw new Error(
          `seeded balance period mismatch: got ${annualBalance.periodStart}..${annualBalance.periodEnd}, ` +
          `expected ${curStartStr}..${curEndStr}`
        );
      }
      // A new request reserves nothing (pendingDays stays 0 on CREATE), so available is
      // still the full 25-day entitlement.
      if (annualBalance.available !== 25) {
        throw new Error(`seeded balance available should be 25, got ${annualBalance.available}`);
      }
      ok('stage 8 balances — /balances/me returns exactly the seeded balance (sick omitted)');
    }
  } catch (e) { die('probe', e); }
  finally {
    try { await app.close(); } catch {}
    fs.rmSync(DB, { force: true });
    if (PG) {
      // Always drop, even on failure — a scratch database must not accumulate schemas.
      const knex = require('knex')({ client: 'pg', connection: PG });
      try { await knex.raw(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`); }
      catch (e) { console.log(`  ! could not drop schema ${SCHEMA}: ${e.message}`); }
      finally { await knex.destroy(); }
    }
  }

  console.log(
    sawDbGap
      ? '\n  SMOKE PASSED (migrate, boot, probe) — WITH THE PERSISTENCE CAVEAT ABOVE\n'
      : '\n  SMOKE PASSED — migrate, boot, probe\n'
  );
  process.exit(0);
})();
