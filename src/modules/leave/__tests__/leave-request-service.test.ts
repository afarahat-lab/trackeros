import { describe, it, expect, vi } from 'vitest';
import { LeaveRequestService } from '../service/leave-request-service';
import { LeaveRequestRepository } from '../repository/leave-request-repository';

vi.mock('../repository/leave-request-repository');

describe('SC-2: Create Leave Request', () => {
  it('should create a leave request with valid data', async () => {
    const service = new LeaveRequestService();
    const leaveRequest = {
      employeeId: '123',
      startDate: '2023-01-01',
      endDate: '2023-01-10',
      reason: 'Vacation',
      status: 'pending'
    };
    const result = await service.createLeaveRequest(leaveRequest);
    expect(result).toHaveProperty('id');
    expect(result.employeeId).toBe('123');
  });

  it('should throw an error if data is invalid', async () => {
    const service = new LeaveRequestService();
    const leaveRequest = {
      employeeId: '',
      startDate: '',
      endDate: '',
      reason: '',
      status: 'invalid'
    };
    await expect(service.createLeaveRequest(leaveRequest)).rejects.toThrow();
  });
});