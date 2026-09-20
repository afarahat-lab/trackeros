/**
 * Idempotent demo-data seed service (module `seed`, path `seeds/`).
 *
 * Owns the demo dataset and its idempotency logic. It receives the knex instance from
 * the seed runner (seeds/001_demo_data.js) and talks to the database through it, exactly
 * as the migrations and the smoke check do — the seed is data-access-layer tooling, not a
 * business-logic service, so it does not route through the pg repositories (which dial
 * `DATABASE_URL` directly rather than the knex connection the runner provides).
 *
 * Re-running is a no-op for already-seeded rows: every entity is detected by a stable
 * composite key and skipped, never duplicated and never deleted.
 */
import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

import {
  EmployeeRole,
  EmploymentStatus,
  LeaveStatus,
  LeaveTypeCode,
  requestedDays,
} from '../src/shared/types';
import { periodContaining, startOfUtcDay } from '../src/shared/date';
import { LeavePolicyStatus } from '../src/modules/policy';
import type { Employee } from '../src/modules/employee';
import type { LeaveType } from '../src/modules/leave-type';
import type { LeavePolicy } from '../src/modules/policy';
import type { LeaveRequest } from '../src/modules/leave';
import type { LeaveBalance } from '../src/modules/balance';

// Shared demo login password for both seeded accounts. This is development seed data that
// never runs in production, so the plain literal is not a secret.
const DEMO_PASSWORD_LITERAL = 'demo-password';

const MANAGER_EMAIL = 'manager@example.com';
const EMPLOYEE_EMAIL = 'employee@example.com';

const MANAGER_ID = 'seed-manager';
const EMPLOYEE_ID = 'seed-employee';

const ANNUAL_POLICY_ID = 'seed-policy-annual';
const SICK_POLICY_ID = 'seed-policy-sick';

const ANNUAL_ENTITLEMENT_DAYS = 25;
const SICK_ENTITLEMENT_DAYS = 10;
const ACCRUAL_PERIOD_MONTHS = 12;

/** Serialize a UTC date to a `YYYY-MM-DD` string for `date` columns. */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Shift a UTC date by a whole number of days (used only for seed fixture dates). */
function addDays(base: Date, days: number): Date {
  const result = new Date(base.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Sum APPROVED -> used, SUBMITTED -> pending for one (employee, leave type) slice. */
function countersFor(
  requests: LeaveRequest[],
  employeeId: string,
  leaveTypeCode: LeaveTypeCode,
): { usedDays: number; pendingDays: number } {
  let usedDays = 0;
  let pendingDays = 0;
  for (const request of requests) {
    if (request.employeeId !== employeeId || request.leaveTypeCode !== leaveTypeCode) {
      continue;
    }
    if (request.status === LeaveStatus.APPROVED) {
      usedDays += request.requestedDays;
    } else if (request.status === LeaveStatus.SUBMITTED) {
      pendingDays += request.requestedDays;
    }
  }
  return { usedDays, pendingDays };
}

export async function seed(knex: Knex): Promise<void> {
  const policyEffectiveFrom = startOfUtcDay(new Date('2020-01-01T00:00:00Z'));
  const managerHireDate = startOfUtcDay(new Date('2021-03-15T00:00:00Z'));
  const employeeHireDate = startOfUtcDay(new Date('2022-07-01T00:00:00Z'));
  const now = new Date();

  // Mint the SAME bcrypt call AuthService verifies with (bcrypt.compare).
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD_LITERAL, 10);

  const employees: Employee[] = [
    {
      id: MANAGER_ID,
      employeeNumber: 'DEMO-0001',
      firstName: 'Demo',
      lastName: 'Manager',
      email: MANAGER_EMAIL,
      role: EmployeeRole.MANAGER,
      managerId: null,
      department: 'Engineering',
      hireDate: managerHireDate,
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      passwordHash,
    },
    {
      id: EMPLOYEE_ID,
      employeeNumber: 'DEMO-0002',
      firstName: 'Demo',
      lastName: 'Employee',
      email: EMPLOYEE_EMAIL,
      role: EmployeeRole.EMPLOYEE,
      managerId: MANAGER_ID,
      department: 'Engineering',
      hireDate: employeeHireDate,
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      passwordHash,
    },
  ];

  const leaveTypes: LeaveType[] = [
    {
      code: LeaveTypeCode.ANNUAL,
      name: 'Annual Leave',
      requiresApproval: true,
      maxConsecutiveDays: 20,
      isPaid: true,
    },
    {
      code: LeaveTypeCode.SICK,
      name: 'Sick Leave',
      requiresApproval: true,
      maxConsecutiveDays: 10,
      isPaid: true,
    },
  ];

  const policies: LeavePolicy[] = [
    {
      id: ANNUAL_POLICY_ID,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      policyName: 'Annual Leave Policy',
      annualEntitlementDays: ANNUAL_ENTITLEMENT_DAYS,
      accrualPeriodMonths: ACCRUAL_PERIOD_MONTHS,
      carryForwardDays: 5,
      minNoticeDays: 7,
      maxRequestDays: ANNUAL_ENTITLEMENT_DAYS,
      requiresManagerApproval: true,
      effectiveFrom: policyEffectiveFrom,
      effectiveTo: null,
      status: LeavePolicyStatus.ACTIVE,
    },
    {
      id: SICK_POLICY_ID,
      leaveTypeCode: LeaveTypeCode.SICK,
      policyName: 'Sick Leave Policy',
      annualEntitlementDays: SICK_ENTITLEMENT_DAYS,
      accrualPeriodMonths: ACCRUAL_PERIOD_MONTHS,
      carryForwardDays: 0,
      minNoticeDays: 0,
      maxRequestDays: SICK_ENTITLEMENT_DAYS,
      requiresManagerApproval: true,
      effectiveFrom: policyEffectiveFrom,
      effectiveTo: null,
      status: LeavePolicyStatus.ACTIVE,
    },
  ];

  const policyByType = new Map<LeaveTypeCode, LeavePolicy>(
    policies.map((policy) => [policy.leaveTypeCode, policy]),
  );

  const requests: LeaveRequest[] = [];

  const approvedStart = addDays(employeeHireDate, 4);
  const approvedEnd = addDays(approvedStart, 3);
  requests.push({
    id: 'seed-request-approved',
    employeeId: EMPLOYEE_ID,
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: approvedStart,
    endDate: approvedEnd,
    requestedDays: requestedDays(approvedStart, approvedEnd),
    reason: 'Annual leave',
    status: LeaveStatus.APPROVED,
    approverId: MANAGER_ID,
    approvalComment: 'Approved',
    submittedAt: addDays(approvedStart, -10),
    decidedAt: addDays(approvedStart, -5),
    cancelledBy: null,
    cancelledAt: null,
  });

  const submittedStart = addDays(employeeHireDate, 14);
  const submittedEnd = addDays(submittedStart, 1);
  requests.push({
    id: 'seed-request-submitted',
    employeeId: EMPLOYEE_ID,
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: submittedStart,
    endDate: submittedEnd,
    requestedDays: requestedDays(submittedStart, submittedEnd),
    reason: 'Planned time off',
    status: LeaveStatus.SUBMITTED,
    approverId: null,
    approvalComment: null,
    submittedAt: now,
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
  });

  const rejectedStart = addDays(employeeHireDate, 7);
  requests.push({
    id: 'seed-request-rejected',
    employeeId: EMPLOYEE_ID,
    leaveTypeCode: LeaveTypeCode.SICK,
    startDate: rejectedStart,
    endDate: rejectedStart,
    requestedDays: requestedDays(rejectedStart, rejectedStart),
    reason: 'Sick day',
    status: LeaveStatus.REJECTED,
    approverId: MANAGER_ID,
    approvalComment: 'Please provide a medical certificate',
    submittedAt: addDays(rejectedStart, -3),
    decidedAt: addDays(rejectedStart, -1),
    cancelledBy: null,
    cancelledAt: null,
  });

  // One balance row per (employee, leave type) for the CURRENT accrual period. The
  // period boundaries come from periodContaining anchored on that employee's hire date and
  // the policy's accrual period; used/pending are DERIVED from the seeded requests above,
  // never hardcoded independently.
  const balances: LeaveBalance[] = [];
  for (const employee of employees) {
    for (const leaveType of leaveTypes) {
      const policy = policyByType.get(leaveType.code);
      if (!policy) {
        continue;
      }
      const hireDate = employee.id === MANAGER_ID ? managerHireDate : employeeHireDate;
      const period = periodContaining(hireDate, policy.accrualPeriodMonths, now);
      const { usedDays, pendingDays } = countersFor(requests, employee.id, leaveType.code);
      balances.push({
        id: `${employee.id}-${leaveType.code}`,
        employeeId: employee.id,
        leaveTypeCode: leaveType.code,
        periodStart: period.start,
        periodEnd: period.end,
        entitledDays: policy.annualEntitlementDays,
        usedDays,
        pendingDays,
      });
    }
  }

  // ── Persist, skipping anything already seeded ──────────────────────────────────────

  for (const employee of employees) {
    const existing = await knex('employees')
      .where({ email: employee.email })
      .orWhere({ employee_number: employee.employeeNumber })
      .first();
    if (existing) {
      continue;
    }
    await knex('employees').insert({
      id: employee.id,
      employee_number: employee.employeeNumber,
      first_name: employee.firstName,
      last_name: employee.lastName,
      email: employee.email,
      role: employee.role,
      manager_id: employee.managerId,
      department: employee.department,
      hire_date: toDateString(employee.hireDate),
      termination_date:
        employee.terminationDate === null ? null : toDateString(employee.terminationDate),
      employment_status: employee.employmentStatus,
      password_hash: employee.passwordHash,
    });
  }

  for (const leaveType of leaveTypes) {
    const existing = await knex('leave_types').where({ code: leaveType.code }).first();
    if (existing) {
      continue;
    }
    await knex('leave_types').insert({
      code: leaveType.code,
      name: leaveType.name,
      requires_approval: leaveType.requiresApproval,
      max_consecutive_days: leaveType.maxConsecutiveDays,
      is_paid: leaveType.isPaid,
    });
  }

  for (const policy of policies) {
    const existing = await knex('leave_policies').where({ id: policy.id }).first();
    if (existing) {
      continue;
    }
    await knex('leave_policies').insert({
      id: policy.id,
      leave_type_code: policy.leaveTypeCode,
      policy_name: policy.policyName,
      annual_entitlement_days: policy.annualEntitlementDays,
      accrual_period_months: policy.accrualPeriodMonths,
      carry_forward_days: policy.carryForwardDays,
      min_notice_days: policy.minNoticeDays,
      max_request_days: policy.maxRequestDays,
      requires_manager_approval: policy.requiresManagerApproval,
      effective_from: toDateString(policy.effectiveFrom),
      effective_to: policy.effectiveTo === null ? null : toDateString(policy.effectiveTo),
      status: policy.status,
    });
  }

  for (const request of requests) {
    const existing = await knex('leave_requests')
      .where({
        employee_id: request.employeeId,
        leave_type_code: request.leaveTypeCode,
        start_date: toDateString(request.startDate),
      })
      .first();
    if (existing) {
      continue;
    }
    await knex('leave_requests').insert({
      id: request.id,
      employee_id: request.employeeId,
      leave_type_code: request.leaveTypeCode,
      start_date: toDateString(request.startDate),
      end_date: toDateString(request.endDate),
      requested_days: request.requestedDays,
      reason: request.reason,
      status: request.status,
      approver_id: request.approverId,
      approval_comment: request.approvalComment,
      submitted_at: request.submittedAt,
      decided_at: request.decidedAt,
      cancelled_by: request.cancelledBy,
      cancelled_at: request.cancelledAt,
    });
  }

  for (const balance of balances) {
    const existing = await knex('leave_balances')
      .where({
        employee_id: balance.employeeId,
        leave_type_code: balance.leaveTypeCode,
        period_start: toDateString(balance.periodStart),
        period_end: toDateString(balance.periodEnd),
      })
      .first();
    if (existing) {
      continue;
    }
    await knex('leave_balances').insert({
      id: balance.id,
      employee_id: balance.employeeId,
      leave_type_code: balance.leaveTypeCode,
      period_start: toDateString(balance.periodStart),
      period_end: toDateString(balance.periodEnd),
      entitled_days: balance.entitledDays,
      used_days: balance.usedDays,
      pending_days: balance.pendingDays,
    });
  }
}
