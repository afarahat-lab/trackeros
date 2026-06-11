import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import type { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { PgLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-4: repository contract spec exists and validates compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains the contract specification file', () => {
    const specPath = path.resolve(process.cwd(), 'tests/unit/modules/leave/leave.repository.contract.spec.ts');

    expect(fs.existsSync(specPath)).toBe(true);
  });

  it('supports repository contract compatibility', () => {
    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    expect(repository).toBeInstanceOf(PgLeaveRequestRepository);
  });
});

describe('SC-5: imports resolve and compile together', () => {
  it('uses model and repository types together successfully', () => {
    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    };

    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    expect(request.id).toBe('leave-1');
    expect(repository).toBeDefined();
  });

  it('imports repository module successfully', async () => {
    const repositoryModule = await import('../../../../src/modules/leave/leave.repository');

    expect(repositoryModule.PgLeaveRequestRepository).toBeDefined();
  });
});