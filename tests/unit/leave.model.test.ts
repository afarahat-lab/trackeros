import { LeaveRequest, CreateLeaveRequestDto } from '../../src/modules/leave/leave.model';
import { LeaveType } from '../../src/shared/types/index';

describe('Leave Model', () => {
    it('should create a valid LeaveRequest', () => {
        const leaveRequest: LeaveRequest = {
            id: '1',
            employeeId: '123',
            leaveType: 'annual' as LeaveType,
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        expect(leaveRequest).toHaveProperty('id');
        expect(leaveRequest).toHaveProperty('employeeId');
        expect(leaveRequest).toHaveProperty('leaveType');
        expect(leaveRequest).toHaveProperty('startDate');
        expect(leaveRequest).toHaveProperty('endDate');
        expect(leaveRequest).toHaveProperty('status');
        expect(leaveRequest).toHaveProperty('createdAt');
        expect(leaveRequest).toHaveProperty('updatedAt');
    });

    it('should create a valid CreateLeaveRequestDto', () => {
        const createLeaveRequestDto: CreateLeaveRequestDto = {
            employeeId: '123',
            leaveType: 'sick' as LeaveType,
            startDate: new Date(),
            endDate: new Date(),
        };

        expect(createLeaveRequestDto).toHaveProperty('employeeId');
        expect(createLeaveRequestDto).toHaveProperty('leaveType');
        expect(createLeaveRequestDto).toHaveProperty('startDate');
        expect(createLeaveRequestDto).toHaveProperty('endDate');
    });
});
