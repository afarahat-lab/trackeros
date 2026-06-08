import { LeaveRequest, CreateLeaveRequestDto } from '../../src/modules/leave/leave.model';
import { LeaveType } from '../../src/shared/types/index';

describe('Leave Model', () => {
    it('should create a LeaveRequest object', () => {
        const leaveRequest: LeaveRequest = {
            id: '1',
            employeeId: '123',
            leaveType: LeaveType.ANNUAL,
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-10'),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        expect(leaveRequest).toBeDefined();
        expect(leaveRequest.status).toBe('pending');
    });

    it('should create a CreateLeaveRequestDto object', () => {
        const createLeaveRequestDto: CreateLeaveRequestDto = {
            employeeId: '123',
            leaveType: LeaveType.SICK,
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-10'),
        };

        expect(createLeaveRequestDto).toBeDefined();
        expect(createLeaveRequestDto.leaveType).toBe(LeaveType.SICK);
    });
});
