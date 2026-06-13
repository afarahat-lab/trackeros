import { Pool } from 'pg';
import { PostgresLeaveRequestRepository, ILeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';

describe('PostgresLeaveRequestRepository', () => {
  let pool: jest.Mocked<Pool>;
  let repository: ILeaveRepository;

  beforeEach(() => {
    pool = {
      query: jest.fn()
    } as unknown as jest.Mocked<Pool>;
    repository = new PostgresLeaveRequestRepository(pool);
  });

  describe('create', () => {
    it('should create and return a leave request', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-1',
        leavePolicyId: 'policy-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        totalDays: 5,
        reason: 'Vacation'
      };

      const row = {
        id: 'req-1',
        employee_id: 'emp-1',
        leave_policy_id: 'policy-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: '5.00',
        status: 'PENDING',
        reason: 'Vacation',
        manager_notes: null,
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [row] } as any);

      const result = await repository.create(dto);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [dto.employeeId, dto.leavePolicyId, dto.startDate, dto.endDate, dto.totalDays, dto.reason]
      );
      expect(result.id).toBe('req-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.leavePolicyId).toBe('policy-1');
      expect(result.totalDays).toBe(5);
      expect(result.status).toBe('PENDING');
    });
  });

  describe('findById', () => {
    it('should return a leave request by id', async () => {
      const row = {
        id: 'req-1',
        employee_id: 'emp-1',
        leave_policy_id: 'policy-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: '5.00',
        status: 'PENDING',
        reason: null,
        manager_notes: null,
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [row] } as any);

      const result = await repository.findById('req-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_requests WHERE id = $1'),
        ['req-1']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should return null if leave request not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await repository.findById('req-999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee', async () => {
      const row = {
        id: 'req-1',
        employee_id: 'emp-1',
        leave_policy_id: 'policy-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: '5.00',
        status: 'PENDING',
        reason: null,
        manager_notes: null,
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [row] } as any);

      const result = await repository.findByEmployeeId('emp-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM leave_requests WHERE employee_id = $1'),
        ['emp-1']
      );
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
    });
  });

  describe('updateStatus', () => {
    it('should update status to APPROVED with manager notes and approvedBy', async () => {
      const row = {
        id: 'req-1',
        employee_id: 'emp-1',
        leave_policy_id: 'policy-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: '5.00',
        status: 'APPROVED',
        reason: null,
        manager_notes: 'Looks good',
        approved_by: 'mgr-1',
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [row] } as any);

      const result = await repository.updateStatus('req-1', 'APPROVED', 'Looks good', 'mgr-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        ['APPROVED', 'Looks good', 'mgr-1', expect.any(Date), 'req-1']
      );
      expect(result.status).toBe('APPROVED');
      expect(result.managerNotes).toBe('Looks good');
      expect(result.approvedBy).toBe('mgr-1');
      expect(result.approvedAt).toBeDefined();
    });

    it('should update status to REJECTED without optional fields', async () => {
      const row = {
        id: 'req-1',
        employee_id: 'emp-1',
        leave_policy_id: 'policy-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: '5.00',
        status: 'REJECTED',
        reason: null,
        manager_notes: null,
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [row] } as any);

      const result = await repository.updateStatus('req-1', 'REJECTED');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        ['REJECTED', null, null, expect.any(Date), 'req-1']
      );
      expect(result.status).toBe('REJECTED');
    });

    it('should throw error if leave request not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(repository.updateStatus('req-999', 'REJECTED')).rejects.toThrow('Leave request with id req-999 not found');
    });
  });
});
