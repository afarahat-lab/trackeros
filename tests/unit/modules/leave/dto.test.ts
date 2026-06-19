import { CreateLeaveRequestDto, SubmitLeaveRequestDto, ReviewLeaveRequestDto, CancelLeaveRequestDto, LeaveRequestDto } from '../../../../src/modules/leave/dto/create-leave-request.dto';

describe('Leave DTOs', () => {
  it('should allow valid CreateLeaveRequestDto', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-03'),
      totalDays: 3,
      reason: 'vacation',
      managerId: 'mgr-1',
    };
    expect(dto.employeeId).toBe('emp-1');
  });

  it('should allow SubmitLeaveRequestDto', () => {
    const dto: SubmitLeaveRequestDto = { leaveRequestId: 'lr-1' };
    expect(dto.leaveRequestId).toBe('lr-1');
  });

  it('should allow ReviewLeaveRequestDto', () => {
    const dto: ReviewLeaveRequestDto = {
      leaveRequestId: 'lr-1',
      status: 'approved',
      reviewNotes: 'looks good',
    };
    expect(dto.status).toBe('approved');
  });

  it('should allow CancelLeaveRequestDto', () => {
    const dto: CancelLeaveRequestDto = { leaveRequestId: 'lr-1' };
    expect(dto.leaveRequestId).toBe('lr-1');
  });

  it('should allow LeaveRequestDto', () => {
    const dto: LeaveRequestDto = {
      id: 'lr-1',
      employeeId: 'emp-1',
      policyId: 'pol-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-03'),
      totalDays: 3,
      status: 'submitted',
      reason: 'vacation',
      managerId: 'mgr-1',
      reviewedAt: null,
      reviewNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(dto.id).toBe('lr-1');
  });
});
