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

process.env.NODE_ENV = 'test';
process.env.SMOKE_DB = DB;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-check-secret';
if (PG) process.env.DATABASE_URL = PG;

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
    const env = PG ? 'smoke_pg' : 'test';
    if (PG) execSync('npx knex migrate:rollback --all --env smoke_pg', { stdio: 'pipe', env: process.env });
    execSync(`npx knex migrate:latest --env ${env}`, { stdio: 'pipe', env: process.env });
    ok(`stage 1 migrate — schema applied from empty (${MODE})`);
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
      const knex = require('knex')(require('../knexfile').smoke_pg);
      try {
        await knex('employees').insert({
          id: EMP, employee_number: 'E-0001', first_name: 'Smoke', last_name: 'Test',
          email: 'smoke@example.com', role: EmployeeRole.EMPLOYEE,
          hire_date: '2020-01-01', employment_status: EmploymentStatus.ACTIVE,
        });
        await knex('leave_types').insert({
          code: LeaveTypeCode.ANNUAL, name: 'Annual', requires_approval: true, is_paid: true,
        });
        await knex('leave_policies').insert({
          id: 'pol-1', leave_type_code: LeaveTypeCode.ANNUAL, policy_name: 'Standard',
          annual_entitlement_days: 25, accrual_period_months: 12, carry_forward_days: 0,
          min_notice_days: 0, requires_manager_approval: true,
          effective_from: '2020-01-01', status: 'ACTIVE',
        });
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
      ok(`stage 3d persistence — a seeded leave request was created end to end (${authed.statusCode})`);
    }
  } catch (e) { die('probe', e); }
  finally { try { await app.close(); } catch {} fs.rmSync(DB, { force: true }); }

  console.log(
    sawDbGap
      ? '\n  SMOKE PASSED (migrate, boot, probe) — WITH THE PERSISTENCE CAVEAT ABOVE\n'
      : '\n  SMOKE PASSED — migrate, boot, probe\n'
  );
  process.exit(0);
})();
