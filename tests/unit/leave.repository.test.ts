import { LeaveRepository } from '../../src/modules/leave/leave.repository';
import { Pool } from 'pg';

const mockDb = {
    query: jest.fn()
};

const leaveRepository = new LeaveRepository(mockDb as unknown as Pool);

describe('LeaveRepository', () => {
    it('should create a leave request', async () => {
        const leaveRequest = {
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending'
        };

        mockDb.query.mockResolvedValueOnce({
            rows: [leaveRequest]
        });

        const result = await leaveRepository.createLeaveRequest(leaveRequest);
        expect(result).toEqual(leaveRequest);
        expect(mockDb.query).toHaveBeenCalledWith(
            'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
        );
    });

    it('should get leave balance', async () => {
        const leaveBalance = {
            employeeId: '1',
            totalLeaves: 20,
            usedLeaves: 5,
            remainingLeaves: 15
        };

        mockDb.query.mockResolvedValueOnce({
            rows: [leaveBalance]
        });

        const result = await leaveRepository.getLeaveBalance('1');
        expect(result).toEqual(leaveBalance);
        expect(mockDb.query).toHaveBeenCalledWith(
            'SELECT * FROM leave_balances WHERE employeeId = $1',
            ['1']
        );
    });

    it('should update leave balance', async () => {
        const updatedBalance = {
            employeeId: '1',
            totalLeaves: 20,
            usedLeaves: 6,
            remainingLeaves: 14
        };

        mockDb.query.mockResolvedValueOnce({
            rows: [updatedBalance]
        });

        const result = await leaveRepository.updateLeaveBalance('1', 1);
        expect(result).toEqual(updatedBalance);
        expect(mockDb.query).toHaveBeenCalledWith(
            'UPDATE leave_balances SET usedLeaves = usedLeaves + $1 WHERE employeeId = $2 RETURNING *',
            [1, '1']
        );
    });
});
