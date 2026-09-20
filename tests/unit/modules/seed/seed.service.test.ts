import { randomUUID } from 'crypto';

import type { Knex } from 'knex';

import { ISeedService, SeedService } from '../../../../src/modules/seed';
import {
  EmployeeRole,
  EmploymentStatus,
  LeaveStatus,
  LeaveTypeCode,
} from '../../../../src/shared/types';

type Row = Record<string, unknown>;

interface FakeQueryBuilder {
  where(clause: Record<string, unknown>): FakeQueryBuilder;
  first(): Promise<Row | undefined>;
  insert(row: Row): Promise<void>;
}

/**
 * Minimal in-memory knex stand-in exposing the exact surface SeedService uses:
 * `knex(table)`, then `.where(obj)`, `.first()`, and `.insert(obj)`.
 */
class FakeKnex {
  private tables = new Map<string, Row[]>();

  rowList(table: string): Row[] {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = [];
      this.tables.set(table, rows);
    }
    return rows;
  }

  insertRow(table: string, row: Row): void {
    this.rowList(table).push({ ...row });
  }

  count(table: string): number {
    return this.rowList(table).length;
  }

  rows(table: string): Row[] {
    return this.rowList(table);
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

function rowMatches(row: Row, predicate: Record<string, unknown>): boolean {
  return Object.entries(predicate).every(([key, value]) => valuesEqual(row[key], value));
}

function makeBuilder(db: FakeKnex, table: string, predicate: Record<string, unknown>): FakeQueryBuilder {
  return {
    where(clause: Record<string, unknown>): FakeQueryBuilder {
      Object.assign(predicate, clause);
      return makeBuilder(db, table, predicate);
    },
    first: async () => db.rowList(table).find((row) => rowMatches(row, predicate)),
    insert: async (row: Row) => {
      db.rowList(table).push({ ...row });
    },
  };
}

/** Wrap the fake behind a callable `knex(table)` signature typed as Knex. */
function makeKnex(): { knex: Knex; db: FakeKnex } {
  const db = new FakeKnex();

  const callable = ((table: string): FakeQueryBuilder => {
    const predicate: Record<string, unknown> = {};
    return makeBuilder(db, table, predicate);
  }) as unknown as Knex;

  return { knex: callable, db };
}

describe('SeedService', () => {
  let db: FakeKnex;
  let service: ISeedService;

  beforeEach(() => {
    const made = makeKnex();
    db = made.db;
    service = new SeedService(made.knex);
  });

  it('seeds two linked employees with active status and a bcrypt password hash', async () => {
    await service.seed();

    const employees = db.rows('employees');
    expect(employees).toHaveLength(2);

    const manager = employees.find((e) => e.role === EmployeeRole.MANAGER);
    const employee = employees.find((e) => e.role === EmployeeRole.EMPLOYEE);

    expect(manager).toBeDefined();
    expect(employee).toBeDefined();
    expect(employee!.manager_id).toBe(manager!.id);
    expect(employee!.employment_status).toBe(EmploymentStatus.ACTIVE);
    expect(manager!.employment_status).toBe(EmploymentStatus.ACTIVE);
    expect(employee!.termination_date).toBeNull();
    expect(manager!.termination_date).toBeNull();

    for (const e of employees) {
      expect(typeof e.id).toBe('string');
      expect((e.id as string).length).toBeGreaterThan(0);
      expect(typeof e.password_hash).toBe('string');
      expect((e.password_hash as string).length).toBeGreaterThan(0);
    }
  });

  it('seeds the annual leave type and policies with ACTIVE status', async () => {
    await service.seed();

    const leaveTypes = db.rows('leave_types');
    const codes = leaveTypes.map((t) => t.code);
    expect(codes).toContain(LeaveTypeCode.ANNUAL);

    const policies = db.rows('leave_policies');
    expect(policies.length).toBeGreaterThanOrEqual(1);
    for (const policy of policies) {
      expect(policy.status).toBe('ACTIVE');
      expect(codes).toContain(policy.leave_type_code);
    }
  });

  it('seeds requests in SUBMITTED, APPROVED, and DRAFT states', async () => {
    await service.seed();

    const requests = db.rows('leave_requests');
    const statuses = requests.map((r) => r.status);
    expect(statuses).toContain(LeaveStatus.SUBMITTED);
    expect(statuses).toContain(LeaveStatus.APPROVED);
    expect(statuses).toContain(LeaveStatus.DRAFT);

    for (const request of requests) {
      expect(request.requested_days).toBeGreaterThanOrEqual(1);
    }
  });

  it('creates a current-period balance for both the manager and the employee', async () => {
    await service.seed();

    const employees = db.rows('employees');
    const manager = employees.find((e) => e.role === EmployeeRole.MANAGER)!;
    const employee = employees.find((e) => e.role === EmployeeRole.EMPLOYEE)!;

    const balances = db.rows('leave_balances');
    const employeeIds = balances.map((b) => b.employee_id);
    expect(employeeIds).toContain(manager.id);
    expect(employeeIds).toContain(employee.id);
  });

  it('keeps balances consistent with seeded requests (submitted -> pending, approved -> used)', async () => {
    await service.seed();

    const employees = db.rows('employees');
    const employee = employees.find((e) => e.role === EmployeeRole.EMPLOYEE)!;

    const requests = db
      .rows('leave_requests')
      .filter(
        (r) => r.employee_id === employee.id && r.leave_type_code === LeaveTypeCode.ANNUAL,
      );
    const submitted = requests.find((r) => r.status === LeaveStatus.SUBMITTED)!;
    const approved = requests.find((r) => r.status === LeaveStatus.APPROVED)!;

    const balance = db
      .rows('leave_balances')
      .find(
        (b) => b.employee_id === employee.id && b.leave_type_code === LeaveTypeCode.ANNUAL,
      )!;

    expect(balance).toBeDefined();
    expect(balance.pending_days).toBe(submitted.requested_days);
    expect(balance.used_days).toBe(approved.requested_days);
  });

  it('is idempotent: running twice inserts no duplicates', async () => {
    await service.seed();
    await service.seed();

    expect(db.count('employees')).toBe(2);
    expect(db.count('leave_types')).toBe(2);
    expect(db.count('leave_policies')).toBe(2);
    expect(db.count('leave_requests')).toBe(3);
    expect(db.count('leave_balances')).toBe(2);
  });

  it('generates UUID ids and never uses magic id strings', async () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    await service.seed();

    for (const table of ['employees', 'leave_policies', 'leave_requests', 'leave_balances']) {
      for (const row of db.rows(table)) {
        expect(row.id).toMatch(uuidPattern);
      }
    }
  });

  it('looks up the natural key before insert and skips the row when present', async () => {
    db.insertRow('employees', {
      id: randomUUID(),
      employee_number: 'EMP-1001',
      first_name: 'Edited',
      last_name: 'Row',
      email: 'manager@trackeros.dev',
      role: EmployeeRole.MANAGER,
      manager_id: null,
      department: 'Engineering',
      hire_date: new Date(Date.UTC(2023, 0, 9)),
      termination_date: null,
      employment_status: EmploymentStatus.ACTIVE,
      password_hash: 'existing',
    });

    await service.seed();

    const managers = db.rows('employees').filter((e) => e.employee_number === 'EMP-1001');
    expect(managers).toHaveLength(1);
    expect(managers[0].first_name).toBe('Edited');
  });
});
