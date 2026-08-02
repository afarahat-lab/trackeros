import { LeaveType } from '../../../../src/shared/types/leave-type.enum';
import { LeaveRequestStatus } from '../../../../src/shared/types/leave-request-status.enum';
import type { BaseEntity } from '../../../../src/shared/types/base-entity.interface';
import type {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
} from '../../../../src/shared/types/leave-request.dto';

describe('LeaveType enum', () => {
  it('should have all expected values', () => {
    expect(LeaveType.ANNUAL).toBe('ANNUAL');
    expect(LeaveType.SICK).toBe('SICK');
    expect(LeaveType.EMERGENCY).toBe('EMERGENCY');
    expect(LeaveType.UNPAID).toBe('UNPAID');
    expect(LeaveType.MATERNITY).toBe('MATERNITY');
    expect(LeaveType.PATERNITY).toBe('PATERNITY');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(LeaveType).length).toBe(6);
  });
});

describe('LeaveRequestStatus enum', () => {
  it('should have all expected values', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(LeaveRequestStatus).length).toBe(5);
  });
});

describe('BaseEntity interface', () => {
  it('should accept an object with id, createdAt, updatedAt', () => {
    const now = new Date();
    const entity: BaseEntity = {
      id: 'abc-123',
      createdAt: now,
      updatedAt: now,
    };
    expect(entity.id).toBe('abc-123');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should accept required fields', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      leavePolicyId: 'pol-1',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-12'),
    };
    expect(dto.employeeId).toBe('emp-1');
    expect(dto.leavePolicyId).toBe('pol-1');
    expect(dto.startDate).toEqual(new Date('2026-08-10'));
    expect(dto.endDate).toEqual(new Date('2026-08-12'));
    expect(dto.reason).toBeUndefined();
  });

  it('should accept optional reason', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      leavePolicyId: 'pol-1',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-12'),
      reason: 'Vacation',
    };
    expect(dto.reason).toBe('Vacation');
  });
});

describe('UpdateLeaveRequestDto', () => {
  it('should accept status only', () => {
    const dto: UpdateLeaveRequestDto = {
      status: LeaveRequestStatus.APPROVED,
    };
    expect(dto.status).toBe(LeaveRequestStatus.APPROVED);
    expect(dto.rejectionReason).toBeUndefined();
  });

  it('should accept rejectionReason only', () => {
    const dto: UpdateLeaveRequestDto = {
      rejectionReason: 'Insufficient balance',
    };
    expect(dto.rejectionReason).toBe('Insufficient balance');
    expect(dto.status).toBeUndefined();
  });

  it('should accept both status and rejectionReason', () => {
    const dto: UpdateLeaveRequestDto = {
      status: LeaveRequestStatus.REJECTED,
      rejectionReason: 'Insufficient balance',
    };
    expect(dto.status).toBe(LeaveRequestStatus.REJECTED);
    expect(dto.rejectionReason).toBe('Insufficient balance');
  });

  it('should accept empty object', () => {
    const dto: UpdateLeaveRequestDto = {};
    expect(dto.status).toBeUndefined();
    expect(dto.rejectionReason).toBeUndefined();
  });
});
