import { LeaveRepository } from '../../modules/leave/leave.repository';
import { LeaveRequest, LeaveBalance } from '../../modules/leave/leave.model';

describe('LeaveRepository', () => {
    const leaveRepository = new LeaveRepository();

    it('should create a leave request', async () => {
        const leaveRequest: LeaveRequest = {
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending',
        };

        const createdRequest = await leaveRepository.createLeaveRequest(leaveRequest);
        expect(createdRequest).toHaveProperty('id');
        expect(createdRequest.status).toBe('pending');
    });

    it('should get leave requests by employee ID', async () => {
        const requests = await leaveRepository.getLeaveRequestsByEmployeeId('1');
        expect(Array.isArray(requests)).toBe(true);
    });

    it('should create a leave balance', async () => {
        const leaveBalance: LeaveBalance = {
            employeeId: '1',
            totalDays: 20,
            usedDays: 5,
            year: 2023,
        };

        const createdBalance = await leaveRepository.createLeaveBalance(leaveBalance);
        expect(createdBalance).toHaveProperty('employeeId', '1');
    });

    it('should get leave balance by employee ID', async () => {
        const balance = await leaveRepository.getLeaveBalanceByEmployeeId('1');
        expect(balance).toHaveProperty('employeeId', '1');
    });
});
