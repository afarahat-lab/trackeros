import { Pool } from 'pg';
import { PgLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequestStatus, AuditAction } from '../../../../src/shared/types/index';
import { isValidTransition } from '../../../../src/modules/leave/leave.model';

const mockQuery = jest.fn();
const mockConnect = jest.fn().mockReturnValue({
  query: mockQuery,
  release: jest.fn()
});
const mockPool = {
  query: mockQuery,
  connect: mockConnect
} as unknown as Pool;

describe('LeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('isValidTransition', () => {
    it('should allow valid state transitions', () => {
      expect(isValidTransition(LeaveRequestStatus.DRAFT, LeaveRequestStatus.SUBMITTED)).toBe(true);
      expect(isValidTransition(LeaveRequestStatus.SUBMITTED, LeaveRequestStatus.APPROVED)).toBe(true);
      expect(isValidTransition(LeaveRequestStatus.APPROVED, LeaveRequestStatus.CANCELLED)).toBe(true);
    });

    it('should reject invalid state transitions', () => {
      expect(isValidTransition(LeaveRequestStatus.APPROVED, LeaveRequestStatus.SUBMITTED)).toBe(false);
      expect(isValidTransition(LeaveRequestStatus.REJECTED, LeaveRequestStatus.APPROVED)).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should throw on invalid state transition', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', status: LeaveRequestStatus.APPROVED, employeeId: 'emp1' }] }); // findById
      
      await expect(repo.updateStatus('1', LeaveRequestStatus.SUBMITTED)).rejects.toThrow('Invalid transition');
    });

    it('should update status and create audit record on valid transition', async () => {
      const currentReq = { id: '1', status: LeaveRequestStatus.DRAFT, employeeId: 'emp1' };
      const updatedReq = { id: '1', status: LeaveRequestStatus.SUBMITTED, employeeId: 'emp1' };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [currentReq] }) // findById
        .mockResolvedValueOnce({ rows: [updatedReq] }) // update
        .mockResolvedValueOnce({ rows: [] }) // audit insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repo.updateStatus('1', LeaveRequestStatus.SUBMITTED);
      
      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_records'), 
        expect.arrayContaining([AuditAction.SUBMIT])
      );
    });
  });

  describe('create', () => {
    it('should create leave request and audit record', async () => {
      const entity = { employeeId: 'emp1', leaveTypeId: 'lt1', startDate: new Date(), endDate: new Date(), status: LeaveRequestStatus.DRAFT };
      const createdReq = { id: '1', ...entity };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createdReq] }) // insert
        .mockResolvedValueOnce({ rows: [] }) // audit
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repo.create(entity as any);
      
      expect(result.id).toBe('1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_records'), 
        expect.arrayContaining([AuditAction.CREATE])
      );
    });
  });

  describe('findByEmployee', () => {
    it('should build query with filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await repo.findByEmployee('emp1', { status: LeaveRequestStatus.SUBMITTED });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'), 
        ['emp1', LeaveRequestStatus.SUBMITTED]
      );
    });
  });

  describe('findByApprover', () => {
    it('should query by approverId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await repo.findByApprover('mgr1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('approved_by = $1'), 
        ['mgr1']
      );
    });
  });

  describe('findPending', () => {
    it('should query for SUBMITTED status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await repo.findPending();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'), 
        [LeaveRequestStatus.SUBMITTED]
      );
    });
  });
});
