import { Pool } from 'pg';
import { PgLeaveRepository } from './leave.repository';
import { LeaveRequest, LeaveStatus, LeaveType } from './leave.model';

describe('PgLeaveRepository', () => {
  let pool: Pool;
  let repository: PgLeaveRepository;

  beforeEach(() => {
    pool = new Pool();
    repository = new PgLeaveRepository(pool);
    jest.spyOn(pool, 'query').mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockLeaveRequestRow = (overrides?: Partial<LeaveRequest> & Record<string, unknown>) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    employee_id: '550e8400-e29b-41d4-a716-446655440001',
    leave_type: 'ANNUAL' as const,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-05'),
    status: 'PENDING' as const,
    reason: 'Vacation',
    manager_id: '550e8400-e29b-41d4-a716-446655440002',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides
  });

  describe('create', () => {
    it('should insert a new leave request and return mapped result', async () => {
      const dto = {
        employeeId: '550e8400-e29b-41d4-a716-446655440001',
        leaveType: 'ANNUAL' as LeaveType,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        reason: 'Vacation',
        managerId: '550e8400-e29b-41d4-a716-446655440002'
      };

      const row = mockLeaveRequestRow();
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.create(dto);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          dto.employeeId,
          dto.leaveType,
          dto.startDate,
          dto.endDate,
          dto.reason,
          dto.managerId
        ]
      );
      expect(result.id).toBe(row.id);
      expect(result.employeeId).toBe(row.employee_id);
      expect(result.leaveType).toBe(row.leave_type);
      expect(result.status).toBe(row.status);
    });

    it('should handle optional fields as null', async () => {
      const dto = {
        employeeId: '550e8400-e29b-41d4-a716-446655440001',
        leaveType: 'SICK' as LeaveType,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-03')
      };

      const row = mockLeaveRequestRow({
        leave_type: 'SICK',
        reason: null,
        manager_id: null
      });
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.create(dto);
      expect(result.reason).toBeNull();
      expect(result.managerId).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a leave request by id', async () => {
      const row = mockLeaveRequestRow();
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.findById(row.id);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_requests WHERE id = $1'),
        [row.id]
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe(row.id);
    });

    it('should return null if not found', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee ordered by created_at DESC', async () => {
      const row1 = mockLeaveRequestRow({ id: 'id-1', created_at: new Date('2024-02-01') });
      const row2 = mockLeaveRequestRow({ id: 'id-2', created_at: new Date('2024-01-01') });
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as any);

      const result = await repository.findByEmployeeId('550e8400-e29b-41d4-a716-446655440001');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC'),
        ['550e8400-e29b-41d4-a716-446655440001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('id-1');
      expect(result[1].id).toBe('id-2');
    });

    it('should return empty array if no requests found', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await repository.findByEmployeeId('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update status and managerId', async () => {
      const row = mockLeaveRequestRow({ status: 'APPROVED', manager_id: 'manager-1' });
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.updateStatus(row.id, 'APPROVED' as LeaveStatus, 'manager-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        ['APPROVED', 'manager-1', row.id]
      );
      expect(result.status).toBe('APPROVED');
      expect(result.managerId).toBe('manager-1');
    });

    it('should throw error if leave request not found', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(repository.updateStatus('missing-id', 'REJECTED' as LeaveStatus, 'manager-1'))
        .rejects.toThrow('Leave request with id missing-id not found');
    });
  });

  describe('update', () => {
    it('should update provided fields', async () => {
      const row = mockLeaveRequestRow({ reason: 'Updated reason' });
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.update(row.id, { reason: 'Updated reason' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        expect.any(Array)
      );
      expect(result.reason).toBe('Updated reason');
    });

    it('should update multiple fields', async () => {
      const row = mockLeaveRequestRow({
        leave_type: 'SICK',
        end_date: new Date('2024-01-10')
      });
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await repository.update(row.id, {
        leaveType: 'SICK',
        endDate: new Date('2024-01-10')
      });

      expect(result.leaveType).toBe('SICK');
      expect(result.endDate).toEqual(new Date('2024-01-10'));
    });

    it('should throw error if no updates provided', async () => {
      await expect(repository.update('id', {}))
        .rejects.toThrow('No updates provided');
    });

    it('should throw error if leave request not found', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(repository.update('missing-id', { reason: 'test' }))
        .rejects.toThrow('Leave request with id missing-id not found');
    });
  });

  describe('delete', () => {
    it('should delete a leave request and return true', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ id: 'id-1' }], rowCount: 1 } as any);

      const result = await repository.delete('id-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM leave_requests WHERE id = $1 RETURNING id'),
        ['id-1']
      );
      expect(result).toBe(true);
    });

    it('should return false if no rows deleted', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await repository.delete('missing-id');

      expect(result).toBe(false);
    });
  });
});
