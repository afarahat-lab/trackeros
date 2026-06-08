import { LeaveRequest, CreateLeaveRequestDto } from '../../src/modules/leave/leave.model';
import { LeaveType } from '../../src/shared/types/index';

describe('Leave Model', () => {
    it('should create a LeaveRequest correctly', () => {
        const leaveRequest: LeaveRequest = {
            id: '1',
            employeeId: '123',
            leaveType: LeaveType.ANNUAL,
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-10'),
            status: 'pending',
        };

        expect(leaveRequest).toHaveProperty('id', '1');
        expect(leaveRequest).toHaveProperty('employeeId', '123');
        expect(leaveRequest).toHaveProperty('leaveType', LeaveType.ANNUAL);
        expect(leaveRequest).toHaveProperty('startDate', new Date('2023-01-01'));
        expect(leaveRequest).toHaveProperty('endDate', new Date('2023-01-10'));
        expect(leaveRequest).toHaveProperty('status', 'pending');
    });

    it('should create a CreateLeaveRequestDto correctly', () => {
        const createLeaveRequestDto: CreateLeaveRequestDto = {
            leaveType: LeaveType.SICK,
            startDate: new Date('2023-02-01'),
            endDate: new Date('2023-02-05'),
        };

        expect(createLeaveRequestDto).toHaveProperty('leaveType', LeaveType.SICK);
        expect(createLeaveRequestDto).toHaveProperty('startDate', new Date('2023-02-01'));
        expect(createLeaveRequestDto).toHaveProperty('endDate', new Date('2023-02-05'));
    });
});
