import { randomUUID } from 'crypto';

import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

import { periodContaining, startOfUtcDay } from '../../shared/date';
import {
  EmployeeRole,
  EmploymentStatus,
  LeaveStatus,
  LeaveTypeCode,
  requestedDays,
} from '../../shared/types';

import { ISeedService } from './seed.service.interface';

// LeavePolicyStatus is owned by the policy module; the seed module's declared
// dependency map (seed -> shared-date, seed -> shared-types) does not include
// policy, so the raw ACTIVE value is written directly to leave_policies.status.
const POLICY_STATUS_ACTIVE = 'ACTIVE';

// Development-only demo credential, shared by both demo accounts and
// overridable via SEED_PASSWORD. This is not a production secret.
const DEFAULT_SEED_PASSWORD = 'demo1234';

const ANNUAL_ENTITLEMENT_DAYS = 20;
const SICK_ENTITLEMENT_DAYS = 10;
const ACCRUAL_PERIOD_MONTHS = 12;

function seedPassword(): string {
  return process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function daysFromNow(offset: number, now: Date): Date {
  const date = startOfUtcDay(now);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

interface SeedEmployeeInput {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  managerId: string | null;
  department: string;
  hireDate: Date;
  passwordHash: string;
}

interface SeedLeaveTypeInput {
  code: LeaveTypeCode;
  name: string;
  requiresApproval: boolean;
  maxConsecutiveDays: number;
  isPaid: boolean;
}

interface SeedLeavePolicyInput {
  id: string;
  leaveTypeCode: LeaveTypeCode;
  policyName: string;
  annualEntitlementDays: number;
  accrualPeriodMonths: number;
  carryForwardDays: number;
  minNoticeDays: number;
  maxRequestDays: number;
  requiresManagerApproval: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: string;
}

interface SeedLeaveRequestInput {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  requestedDays: number;
  reason: string | null;
  status: LeaveStatus;
  approverId: string | null;
  approvalComment: string | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
}

interface SeedLeaveBalanceInput {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  hireDate: Date;
  now: Date;
}

/**
 * Idempotent demo-data seeder. Writes directly through the injected knex
 * client (the seed module is explicitly exempt from the repository pattern),
 * skipping any row whose natural key already exists and never deleting rows.
 */
export class SeedService implements ISeedService {
  constructor(private readonly knex: Knex) {}

  async seed(): Promise<void> {
    const now = new Date();
    const passwordHash = bcrypt.hashSync(seedPassword(), 10);

    const managerHireDate = utcDate(2023, 0, 9);
    const employeeHireDate = utcDate(2024, 5, 3);

    // 1. Employees — one MANAGER and one EMPLOYEE linked via managerId.
    const managerId = await this.seedEmployee({
      id: randomUUID(),
      employeeNumber: 'EMP-1001',
      firstName: 'Avery',
      lastName: 'Morgan',
      email: 'manager@trackeros.dev',
      role: EmployeeRole.MANAGER,
      managerId: null,
      department: 'Engineering',
      hireDate: managerHireDate,
      passwordHash,
    });

    const employeeId = await this.seedEmployee({
      id: randomUUID(),
      employeeNumber: 'EMP-1002',
      firstName: 'Sam',
      lastName: 'Riley',
      email: 'employee@trackeros.dev',
      role: EmployeeRole.EMPLOYEE,
      managerId,
      department: 'Engineering',
      hireDate: employeeHireDate,
      passwordHash,
    });

    // 2. Leave types.
    await this.seedLeaveType({
      code: LeaveTypeCode.ANNUAL,
      name: 'Annual Leave',
      requiresApproval: true,
      maxConsecutiveDays: 20,
      isPaid: true,
    });
    await this.seedLeaveType({
      code: LeaveTypeCode.SICK,
      name: 'Sick Leave',
      requiresApproval: true,
      maxConsecutiveDays: 5,
      isPaid: true,
    });

    // 3. Leave policies.
    await this.seedLeavePolicy({
      id: randomUUID(),
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      policyName: 'Standard Annual Leave',
      annualEntitlementDays: ANNUAL_ENTITLEMENT_DAYS,
      accrualPeriodMonths: ACCRUAL_PERIOD_MONTHS,
      carryForwardDays: 5,
      minNoticeDays: 7,
      maxRequestDays: 20,
      requiresManagerApproval: true,
      effectiveFrom: utcDate(2023, 0, 1),
      effectiveTo: null,
      status: POLICY_STATUS_ACTIVE,
    });
    await this.seedLeavePolicy({
      id: randomUUID(),
      leaveTypeCode: LeaveTypeCode.SICK,
      policyName: 'Sick Leave',
      annualEntitlementDays: SICK_ENTITLEMENT_DAYS,
      accrualPeriodMonths: ACCRUAL_PERIOD_MONTHS,
      carryForwardDays: 0,
      minNoticeDays: 0,
      maxRequestDays: 5,
      requiresManagerApproval: true,
      effectiveFrom: utcDate(2023, 0, 1),
      effectiveTo: null,
      status: POLICY_STATUS_ACTIVE,
    });

    // 4. Leave requests in three lifecycle states. The requested_days values
    //    feed the balance reservation arithmetic below.
    const submittedStart = daysFromNow(5, now);
    const submittedEnd = daysFromNow(7, now);
    const approvedStart = daysFromNow(30, now);
    const approvedEnd = daysFromNow(34, now);
    const draftStart = daysFromNow(60, now);
    const draftEnd = daysFromNow(61, now);

    const submittedDays = requestedDays(submittedStart, submittedEnd);
    const approvedDays = requestedDays(approvedStart, approvedEnd);

    await this.seedRequest({
      id: randomUUID(),
      employeeId,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: submittedStart,
      endDate: submittedEnd,
      requestedDays: submittedDays,
      reason: 'Family holiday',
      status: LeaveStatus.SUBMITTED,
      approverId: null,
      approvalComment: null,
      submittedAt: now,
      decidedAt: null,
    });

    await this.seedRequest({
      id: randomUUID(),
      employeeId,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: approvedStart,
      endDate: approvedEnd,
      requestedDays: approvedDays,
      reason: 'Summer vacation',
      status: LeaveStatus.APPROVED,
      approverId: managerId,
      approvalComment: 'Approved',
      submittedAt: daysFromNow(-14, now),
      decidedAt: now,
    });

    await this.seedRequest({
      id: randomUUID(),
      employeeId,
      leaveTypeCode: LeaveTypeCode.SICK,
      startDate: draftStart,
      endDate: draftEnd,
      requestedDays: requestedDays(draftStart, draftEnd),
      reason: 'Medical appointment',
      status: LeaveStatus.DRAFT,
      approverId: null,
      approvalComment: null,
      submittedAt: null,
      decidedAt: null,
    });

    // 5. Current-period balances for BOTH employees, counters consistent with
    //    the seeded requests (submitted -> pending, approved -> used).
    await this.seedBalance({
      id: randomUUID(),
      employeeId: managerId,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      entitledDays: ANNUAL_ENTITLEMENT_DAYS,
      usedDays: 0,
      pendingDays: 0,
      hireDate: managerHireDate,
      now,
    });

    await this.seedBalance({
      id: randomUUID(),
      employeeId,
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      entitledDays: ANNUAL_ENTITLEMENT_DAYS,
      usedDays: approvedDays,
      pendingDays: submittedDays,
      hireDate: employeeHireDate,
      now,
    });
  }

  private async seedEmployee(input: SeedEmployeeInput): Promise<string> {
    const existing = await this.knex('employees')
      .where({ employee_number: input.employeeNumber })
      .first();
    if (existing) {
      return (existing as { id: string }).id;
    }

    await this.knex('employees').insert({
      id: input.id,
      employee_number: input.employeeNumber,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      role: input.role,
      manager_id: input.managerId,
      department: input.department,
      hire_date: input.hireDate,
      termination_date: null,
      employment_status: EmploymentStatus.ACTIVE,
      password_hash: input.passwordHash,
    });
    return input.id;
  }

  private async seedLeaveType(input: SeedLeaveTypeInput): Promise<void> {
    const existing = await this.knex('leave_types').where({ code: input.code }).first();
    if (existing) {
      return;
    }

    await this.knex('leave_types').insert({
      code: input.code,
      name: input.name,
      requires_approval: input.requiresApproval,
      max_consecutive_days: input.maxConsecutiveDays,
      is_paid: input.isPaid,
    });
  }

  private async seedLeavePolicy(input: SeedLeavePolicyInput): Promise<void> {
    const existing = await this.knex('leave_policies')
      .where({ leave_type_code: input.leaveTypeCode, effective_from: input.effectiveFrom })
      .first();
    if (existing) {
      return;
    }

    await this.knex('leave_policies').insert({
      id: input.id,
      leave_type_code: input.leaveTypeCode,
      policy_name: input.policyName,
      annual_entitlement_days: input.annualEntitlementDays,
      accrual_period_months: input.accrualPeriodMonths,
      carry_forward_days: input.carryForwardDays,
      min_notice_days: input.minNoticeDays,
      max_request_days: input.maxRequestDays,
      requires_manager_approval: input.requiresManagerApproval,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo,
      status: input.status,
    });
  }

  private async seedRequest(input: SeedLeaveRequestInput): Promise<void> {
    // Idempotency is keyed on the deterministic composite
    // (employee_id, leave_type_code, start_date) — never a magic id string.
    const existing = await this.knex('leave_requests')
      .where({
        employee_id: input.employeeId,
        leave_type_code: input.leaveTypeCode,
        start_date: input.startDate,
      })
      .first();
    if (existing) {
      return;
    }

    await this.knex('leave_requests').insert({
      id: input.id,
      employee_id: input.employeeId,
      leave_type_code: input.leaveTypeCode,
      start_date: input.startDate,
      end_date: input.endDate,
      requested_days: input.requestedDays,
      reason: input.reason,
      status: input.status,
      approver_id: input.approverId,
      approval_comment: input.approvalComment,
      submitted_at: input.submittedAt,
      decided_at: input.decidedAt,
      cancelled_by: null,
      cancelled_at: null,
    });
  }

  private async seedBalance(input: SeedLeaveBalanceInput): Promise<void> {
    const period = periodContaining(input.hireDate, ACCRUAL_PERIOD_MONTHS, input.now);

    const existing = await this.knex('leave_balances')
      .where({
        employee_id: input.employeeId,
        leave_type_code: input.leaveTypeCode,
        period_start: period.start,
        period_end: period.end,
      })
      .first();
    if (existing) {
      return;
    }

    await this.knex('leave_balances').insert({
      id: input.id,
      employee_id: input.employeeId,
      leave_type_code: input.leaveTypeCode,
      period_start: period.start,
      period_end: period.end,
      entitled_days: input.entitledDays,
      used_days: input.usedDays,
      pending_days: input.pendingDays,
    });
  }
}
