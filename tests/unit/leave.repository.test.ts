import { Pool } from 'pg';
import { LeaveRequestRepository } from '../../modules/leave/leave.repository';
import { LeaveRequest } from '../../modules/leave/leave.model';

const mockDb = {
    query: jest.fn(),
};

const leaveRequestRepository = new LeaveRequestRepository(mockDb as unknown as Pool);

describe('LeaveRequestRepository', () => {
    const leaveRequest: LeaveRequest = {
        id: '1',
        employeeId: '123',
        startDate: new Date(),
        endDate: new Date(),
        status: 'pending',
        reason: 'Vacation',
    };

    it('should create a leave request', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
        const result = await leaveRequestRepository.create(leaveRequest);
        expect(result).toEqual(leaveRequest);
    });

    it('should find a leave request by id', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
        const result = await leaveRequestRepository.findById('1');
        expect(result).toEqual(leaveRequest);
    });

    it('should update a leave request', async () => {
        const updatedLeaveRequest = { ...leaveRequest, status: 'approved' };
        mockDb.query.mockResolvedValueOnce({ rows: [updatedLeaveRequest] });
        const result = await leaveRequestRepository.update('1', { status: 'approved' });
        expect(result).toEqual(updatedLeaveRequest);
    });

    it('should delete a leave request', async () => {
        mockDb.query.mockResolvedValueOnce({});
        await leaveRequestRepository.delete('1');
        expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM leave_requests WHERE id = $1', ['1']);
    });
});
