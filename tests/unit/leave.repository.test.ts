import { LeaveRepository } from '../../src/modules/leave/leave.repository';
import { LeaveRequest, LeaveBalance } from '../../src/modules/leave/leave.model';
import { Pool } from 'pg';

jest.mock('pg');

const mockPool = new Pool() as jest.Mocked<Pool>;
const leaveRepository = new LeaveRepository();

describe('LeaveRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a leave request', async () => {
        const leaveRequest: LeaveRequest = {
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending',
            id: '1',
            managerId: null,
            managerComment: null,
            createdAt: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({
            rows: [leaveRequest],
        });

        const result = await leaveRepository.createLeaveRequest(leaveRequest);
        expect(result).toEqual(leaveRequest);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.any(String),
            [leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
        );
    });

    it('should get leave requests by employee ID', async () => {
        const leaveRequests: LeaveRequest[] = [{
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending',
            id: '1',
            managerId: null,
            managerComment: null,
            createdAt: new Date(),
        }];

        mockPool.query.mockResolvedValueOnce({
            rows: leaveRequests,
        });

        const result = await leaveRepository.getLeaveRequestsByEmployeeId('1');
        expect(result).toEqual(leaveRequests);
    });

    it('should create a leave balance', async () => {
        const leaveBalance: LeaveBalance = {
            employeeId: '1',
            leaveType: 'annual',
            totalDays: 20,
            usedDays: 5,
            year: 2023,
        };

        mockPool.query.mockResolvedValueOnce({
            rows: [leaveBalance],
        });

        const result = await leaveRepository.createLeaveBalance(leaveBalance);
        expect(result).toEqual(leaveBalance);
    });

    it('should get leave balance by employee ID and year', async () => {
        const leaveBalance: LeaveBalance = {
            employeeId: '1',
            leaveType: 'annual',
            totalDays: 20,
            usedDays: 5,
            year: 2023,
        };

        mockPool.query.mockResolvedValueOnce({
            rows: [leaveBalance],
        });

        const result = await leaveRepository.getLeaveBalanceByEmployeeId('1', 2023);
        expect(result).toEqual(leaveBalance);
    });
});
