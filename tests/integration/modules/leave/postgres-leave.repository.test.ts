import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: queryMock,
  })),
}));

describe('SC-3 and SC-5 PostgresLeaveRepository integration contract', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a repository implementation module', async () => {
    try {
      const module = await import('../../../../src/modules/leave/postgres-leave.repository');
      expect(module.PostgresLeaveRepository).toBeDefined();
    } catch (error: unknown) {
      expect(error).toBeUndefined();
    }
  });

  it('can persist, retrieve by id and list by employee when implementation exists', async () => {
    let moduleRef: Record<string, unknown>;

    try {
      moduleRef = await import('../../../../src/modules/leave/postgres-leave.repository');
    } catch {
      expect.fail('PostgresLeaveRepository module is missing');
      return;
    }

    const RepositoryCtor = moduleRef.PostgresLeaveRepository as new () => {
      create: (request: import('../../../../src/modules/leave/leave.model').LeaveRequest) => Promise<unknown>;
      findById: (id: string) => Promise<unknown>;
      findByEmployeeId: (employeeId: string) => Promise<unknown>;
    };

    const request = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'ANNUAL' as const,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'PENDING' as const,
      approverEmployeeId: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    queryMock
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{
        id: request.id,
        employee_id: request.employeeId,
        leave_type: request.leaveType,
        start_date: request.startDate,
        end_date: request.endDate,
        status: request.status,
        approver_employee_id: request.approverEmployeeId,
        created_at: request.createdAt,
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: request.id,
        employee_id: request.employeeId,
        leave_type: request.leaveType,
        start_date: request.startDate,
        end_date: request.endDate,
        status: request.status,
        approver_employee_id: request.approverEmployeeId,
        created_at: request.createdAt,
      }] });

    const repository = new RepositoryCtor();

    await repository.create(request);
    await repository.findById(request.id);
    await repository.findByEmployeeId(request.employeeId);

    expect(queryMock).toHaveBeenCalled();
    expect(queryMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});