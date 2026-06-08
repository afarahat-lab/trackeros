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
        const result = await leaveRepository.createLeaveRequest(leaveRequest);
        expect(result).toHaveProperty('id');
        expect(result.status).toBe('pending');
    });

    it('should get leave requests by employee ID', async () => {
        const requests = await leaveRepository.getLeaveRequestsByEmployeeId('1');
        expect(Array.isArray(requests)).toBe(true);
    });

    it('should create a leave balance', async () => {
        const leaveBalance: LeaveBalance = {
            employeeId: '1',
            totalLeaves: 20,
            usedLeaves: 5,
            remainingLeaves: 15,
        };
        const result = await leaveRepository.createLeaveBalance(leaveBalance);
        expect(result).toHaveProperty('id');
        expect(result.totalLeaves).toBe(20);
    });

    it('should get leave balance by employee ID', async () => {
        const balance = await leaveRepository.getLeaveBalanceByEmployeeId('1');
        expect(balance).toHaveProperty('employeeId', '1');
    });
});
