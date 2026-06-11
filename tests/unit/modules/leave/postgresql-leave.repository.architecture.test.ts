import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/postgresql-leave.repository';

describe('SC-3: PostgreSqlLeaveRequestRepository implementation', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports PostgreSqlLeaveRequestRepository with required methods', () => {
    const repository = new PostgreSqlLeaveRequestRepository();

    expect(repository).toBeInstanceOf(PostgreSqlLeaveRequestRepository);
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByEmployeeId).toBe('function');
    expect(typeof repository.update).toBe('function');
  });
});

describe('SC-6: repository abstraction boundaries', () => {
  it('does not expose raw PostgreSQL pool contract from repository module exports', async () => {
    const moduleExports = await import('../../../../src/modules/leave/postgresql-leave.repository');

    expect('pool' in moduleExports).toBe(false);
  });

  it('uses repository abstraction methods for persistence access', () => {
    const filePath = path.resolve(process.cwd(), 'src/modules/leave/leave.repository.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('create(');
    expect(content).toContain('findById(');
    expect(content).toContain('findByEmployeeId(');
    expect(content).toContain('update(');
  });
});