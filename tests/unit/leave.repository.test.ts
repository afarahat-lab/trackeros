import { LeaveRepository } from '../../src/modules/leave/leave.repository';
import { LeaveRequest, LeaveBalance } from '../../src/modules/leave/leave.model';

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
            totalDays: 20,
            usedDays: 5,
            year: 2023,
        };
        const result = await leaveRepository.createLeaveBalance(leaveBalance);
        expect(result).toHaveProperty('id');
        expect(result.totalDays).toBe(20);
    });

    it('should get leave balance by employee ID and year', async () => {
        const balance = await leaveRepository.getLeaveBalanceByEmployeeId('1', 2023);
        expect(balance).toHaveProperty('employeeId', '1');
    });
});
