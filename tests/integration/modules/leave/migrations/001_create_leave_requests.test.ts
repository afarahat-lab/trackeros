import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SC-4 leave_requests migration schema', () => {
  const migrationPath = resolve(process.cwd(), 'src/modules/leave/migrations/001_create_leave_requests.sql');

  it('creates leave_requests table with required columns and constraints', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE leave_requests');
    expect(sql).toContain('id UUID PRIMARY KEY');
    expect(sql).toContain('employee_id UUID NOT NULL');
    expect(sql).toContain("leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL','SICK','EMERGENCY'))");
    expect(sql).toContain("status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED'))");
    expect(sql).toContain('approver_employee_id UUID NULL');
    expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  });

  it('creates required indexes', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id)');
    expect(sql).toContain('CREATE INDEX idx_leave_requests_status ON leave_requests(status)');
  });
});