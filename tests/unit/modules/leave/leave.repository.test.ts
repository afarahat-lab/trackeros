import { PostgresLeaveRepository, ILeaveRepository } from '../../../src/modules/leave/leave.repository';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../src/modules/leave/leave.model';
import pool from '../../../src/shared/db/connection';
import { LeaveStatus } from '../../../src/shared/types/index';

jest.mock('../../../src/shared/db/connection', () => ({
  default: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

describe('PostgresLeaveRepository', () => {
  let repo: PostgresLeaveRepository;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    repo = new PostgresLeaveRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a leave request with status pending and audit log in a transaction', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 1,
        leaveType: 'annual',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        reason: 'Vacation',
      };
      const fakeRow = {
        id: 10,
        employee_id: 1,
        leave_type: 'annual',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-03'),
        reason: 'Vacation',
        status: LeaveStatus.Pending,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        comments: null,
        manager_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [fakeRow] }) // INSERT
        .mockResolvedValueOnce(undefined) // audit INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.create(dto, 1);
      expect(result.id).toBe(10);
      expect(result.status).toBe(LeaveStatus.Pending);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        expect.arrayContaining([1, 'annual', dto.startDate, dto.endDate, 'Vacation', LeaveStatus.Pending, null])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and release client on error', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 1,
        leaveType: 'annual',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'test',
      };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      await expect(repo.create(dto, 1)).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const fakeRow = {
        id: 1,
        employee_id: 1,
        leave_type: 'sick',
        start_date: new Date(),
        end_date: new Date(),
        reason: 'Flu',
        status: LeaveStatus.Pending,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        comments: null,
        manager_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [fakeRow] });
      const result = await repo.findById(1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.status).toBe(LeaveStatus.Pending);
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update fields and audit in a transaction', async () => {
      const oldRow = {
        id: 1,
        employee_id: 1,
        leave_type: 'annual',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-03'),
        reason: 'Old reason',
        status: LeaveStatus.Pending,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        comments: null,
        manager_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updatedRow = { ...oldRow, reason: 'New reason', updated_at: new Date() };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [oldRow] }) // SELECT current
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce(undefined) // audit INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.update(1, { reason: 'New reason' }, 1);
      expect(result.reason).toBe('New reason');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw if leave request not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT current empty
      await expect(repo.update(999, { reason: 'test' }, 1)).rejects.toThrow('Leave request not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and audit in a transaction', async () => {
      const oldRow = {
        id: 1,
        employee_id: 1,
        leave_type: 'annual',
        start_date: new Date(),
        end_date: new Date(),
        reason: 'test',
        status: LeaveStatus.Pending,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        comments: null,
        manager_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [oldRow] }) // SELECT current
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(undefined) // audit INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await repo.delete(1, 1);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw if leave request not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT current empty
      await expect(repo.delete(999, 1)).rejects.toThrow('Leave request not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee', async () => {
      const fakeRows = [
        { id: 1, employee_id: 1, leave_type: 'annual', start_date: new Date(), end_date: new Date(), reason: 'Vacation', status: LeaveStatus.Pending, submitted_at: null, reviewed_by: null, reviewed_at: null, comments: null, manager_id: null, created_at: new Date(), updated_at: new Date() },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeRows });
      const result = await repo.findByEmployeeId(1);
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe(1);
    });
  });

  describe('findByManagerId', () => {
    it('should return leave requests for a manager', async () => {
      const fakeRows = [
        { id: 2, employee_id: 2, leave_type: 'sick', start_date: new Date(), end_date: new Date(), reason: 'Flu', status: LeaveStatus.Pending, submitted_at: null, reviewed_by: null, reviewed_at: null, comments: null, manager_id: 5, created_at: new Date(), updated_at: new Date() },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeRows });
      const result = await repo.findByManagerId(5);
      expect(result).toHaveLength(1);
      expect(result[0].managerId).toBe(5);
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests with given status', async () => {
      const fakeRows = [
        { id: 3, employee_id: 3, leave_type: 'emergency', start_date: new Date(), end_date: new Date(), reason: 'Emergency', status: LeaveStatus.Approved, submitted_at: null, reviewed_by: null, reviewed_at: null, comments: null, manager_id: null, created_at: new Date(), updated_at: new Date() },
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: fakeRows });
      const result = await repo.findByStatus(LeaveStatus.Approved);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.Approved);
    });
  });
});
