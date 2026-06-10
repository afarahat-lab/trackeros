import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from './leave.repository';
import { CreateLeaveRequestDto } from './leave.model';

vi.mock('../../shared/db/connection', () => ({
  query: vi.fn(),
}));

const mockDb = require('../../shared/db/connection');

describe('LeaveRepository', () => {
  let leaveRepository: LeaveRepository;

  beforeEach(() => {
    leaveRepository = new LeaveRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a leave request successfully', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-123',
        leaveType: 'SICK',
        startDate: new Date(),
        endDate: new Date(),
        status: 'PENDING',
      };

      const mockResponse = {
        rows: [{
          id: '1',
          ...dto,
        }],
      };

      mockDb.query.mockResolvedValue(mockResponse);

      const result = await leaveRepository.create(dto);
      expect(result).toEqual(mockResponse.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [dto.employeeId, dto.leaveType, dto.startDate, dto.endDate, dto.status]
      );
    });

    it('should throw an error if database query fails', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp-123',
        leaveType: 'SICK',
        startDate: new Date(),
        endDate: new Date(),
        status: 'PENDING',
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(leaveRepository.create(dto)).rejects.toThrow('Database error');
    });
  });
});