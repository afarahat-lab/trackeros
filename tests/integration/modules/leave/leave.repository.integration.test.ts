import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgreSqlLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

vi.mock('crypto', () => ({ randomUUID: () => 'leave-id' }));

describe('SC-4 PostgreSqlLeaveRequestRepository integration contract', () => {
  beforeEach(() => {});
  afterEach(() => { vi.clearAllMocks(); });

  it('can be constructed with pg pool and audit repository dependencies', () => {
    const pool = { query: vi.fn() };
    const auditRepository = { create: vi.fn() };

    const repository = new PostgreSqlLeaveRequestRepository(pool as never, auditRepository);

    expect(repository).toBeInstanceOf(PostgreSqlLeaveRequestRepository);
  });

  it('defines CRUD repository methods required by the contract', () => {
    const repository = new PostgreSqlLeaveRequestRepository({ query: vi.fn() } as never, { create: vi.fn() });

    expect(repository.create).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.updateStatus).toBeDefined();
    expect(repository.delete).toBeDefined();
  });
});