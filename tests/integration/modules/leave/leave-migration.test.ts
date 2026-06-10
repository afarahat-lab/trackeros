import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SC-4: leave_requests migration schema', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates leave_requests table with required columns and constraints', () => {
    const sql = readFileSync(resolve(process.cwd(), 'migrations/001_create_leave_requests.sql'), 'utf8');

    expect(sql).toContain('CREATE TABLE leave_requests');
    expect(sql).toContain('id UUID PRIMARY KEY');
    expect(sql).toContain('employee_id UUID NOT NULL');
    expect(sql).toContain('leave_type');
    expect(sql).toContain('start_date');
    expect(sql).toContain('end_date');
    expect(sql).toContain('status');
    expect(sql).toContain('approver_employee_id');
    expect(sql).toContain('created_at');
    expect(sql).toContain("CHECK (leave_type IN ('ANNUAL','SICK','EMERGENCY'))");
    expect(sql).toContain("CHECK (status IN ('PENDING','APPROVED','REJECTED'))");
  });

  it('creates required indexes', () => {
    const sql = readFileSync(resolve(process.cwd(), 'migrations/001_create_leave_requests.sql'), 'utf8');

    expect(sql).toContain('idx_leave_requests_employee_id');
    expect(sql).toContain('idx_leave_requests_status');
  });
});