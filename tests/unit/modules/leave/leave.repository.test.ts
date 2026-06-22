import { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';

// Mock pool
const createMockPool = () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient)
  };
  return { mockPool, mockClient };
};

describe('LeaveRequestRepository', () => {
  let repository: LeaveRequestRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    const mocks = createMockPool();
    mockPool = mocks.mockPool;
    mockClient = mocks.mockClient;
    repository = new LeaveRequestRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a leave request with draft status', async () => {
      const dto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        daysRequested: 5,
        reason: 'Vacation',
        managerId: 'mgr-1'
      };

      const mockRow = {
        id: 'lr-1',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        days_requested: 5,
        status: 'draft',
        reason: 'Vacation',
        manager_id: 'mgr-1',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRow] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const result = await repository.create(dto);

      expect(result.id).toBe('lr-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      // Verify audit log was written
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('audit_logs'),
        expect.any(Array)
      );
    });

    it('should create a leave request without optional fields', async () => {
      const dto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        daysRequested: 3
      };

      const mockRow = {
        id: 'lr-2',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-03'),
        days_requested: 3,
        status: 'draft',
        reason: null,
        manager_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRow] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await repository.create(dto);

      expect(result.id).toBe('lr-2');
      expect(result.reason).toBeNull();
      expect(result.managerId).toBeNull();
    });

    it('should throw an error when database fails', async () => {
      const dto = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        daysRequested: 5
      };

      mockClient.query.mockRejectedValueOnce(new Error('DB connection error'));

      await expect(repository.create(dto)).rejects.toThrow('Failed to create leave request');
    });
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const mockRow = {
        id: 'lr-1',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        days_requested: 5,
        status: 'approved',
        reason: 'Vacation',
        manager_id: 'mgr-1',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findById('lr-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-1');
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw an error when database fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(repository.findById('lr-1')).rejects.toThrow('Failed to find leave request by id');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee', async () => {
      const mockRows = [
        {
          id: 'lr-1',
          employee_id: 'emp-1',
          leave_type_id: 'lt-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-05'),
          days_requested: 5,
          status: 'approved',
          reason: 'Vacation',
          manager_id: 'mgr-1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'lr-2',
          employee_id: 'emp-1',
          leave_type_id: 'lt-2',
          start_date: new Date('2024-03-01'),
          end_date: new Date('2024-03-03'),
          days_requested: 3,
          status: 'draft',
          reason: null,
          manager_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await repository.findByEmployeeId('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp-1');
    });

    it('should return empty array when no requests found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByEmployeeId('emp-999');

      expect(result).toHaveLength(0);
    });

    it('should throw an error when database fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(repository.findByEmployeeId('emp-1')).rejects.toThrow('Failed to find leave requests by employee');
    });
  });

  describe('findByManagerId', () => {
    it('should return leave requests for a manager', async () => {
      const mockRows = [
        {
          id: 'lr-1',
          employee_id: 'emp-1',
          leave_type_id: 'lt-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-05'),
          days_requested: 5,
          status: 'submitted',
          reason: 'Vacation',
          manager_id: 'mgr-1',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await repository.findByManagerId('mgr-1');

      expect(result).toHaveLength(1);
      expect(result[0].managerId).toBe('mgr-1');
    });

    it('should throw an error when database fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(repository.findByManagerId('mgr-1')).rejects.toThrow('Failed to find leave requests by manager');
    });
  });

  describe('updateStatus', () => {
    it('should update the status and write audit log', async () => {
      const mockRow = {
        id: 'lr-1',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        days_requested: 5,
        status: 'approved',
        reason: 'Vacation',
        manager_id: 'mgr-1',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRow] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const result = await repository.updateStatus('lr-1', LeaveRequestStatus.APPROVED, 'mgr-1');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      // Verify audit log was written
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('audit_logs'),
        expect.any(Array)
      );
    });

    it('should throw an error when leave request not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        repository.updateStatus('non-existent', LeaveRequestStatus.APPROVED)
      ).rejects.toThrow('Failed to update leave request status');
    });

    it('should throw an error when database fails', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        repository.updateStatus('lr-1', LeaveRequestStatus.APPROVED)
      ).rejects.toThrow('Failed to update leave request status');
    });
  });
});
