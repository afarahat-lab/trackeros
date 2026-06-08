import { Pool } from 'pg';
import { LeaveRepository } from '../../src/modules/leave/leave.repository';
import { LeaveRequest, LeaveBalance } from '../../src/modules/leave/leave.model';

const mockDb = new Pool();
const leaveRepository = new LeaveRepository(mockDb);

describe('LeaveRepository', () => {
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
        expect(createdRequest.employeeId).toBe(leaveRequest.employeeId);
    });

    it('should get a leave request by id', async () => {
        const leaveRequest = await leaveRepository.getLeaveRequestById('1');
        expect(leaveRequest).toBeNull(); // Assuming no request exists with id '1'
    });

    it('should update leave request status', async () => {
        const updatedRequest = await leaveRepository.updateLeaveRequestStatus('1', 'approved');
        expect(updatedRequest).toBeNull(); // Assuming no request exists with id '1'
    });

    it('should get leave balance', async () => {
        const leaveBalance = await leaveRepository.getLeaveBalance('1');
        expect(leaveBalance).toBeNull(); // Assuming no balance exists for employeeId '1'
    });

    it('should update leave balance', async () => {
        const updatedBalance = await leaveRepository.updateLeaveBalance('1', 2);
        expect(updatedBalance).toBeNull(); // Assuming no balance exists for employeeId '1'
    });
});
