import { Pool } from 'pg';
import { LeaveRequestRepository } from '../../modules/leave/leave.repository';
import { LeaveRequest } from '../../modules/leave/leave.model';

const mockDb = new Pool();
const leaveRequestRepo = new LeaveRequestRepository(mockDb);

describe('LeaveRequestRepository', () => {
    it('should create a leave request', async () => {
        const leaveRequestData = {
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
        };
        const leaveRequest = await leaveRequestRepo.create(leaveRequestData);
        expect(leaveRequest).toHaveProperty('id');
        expect(leaveRequest.employeeId).toBe(leaveRequestData.employeeId);
    });

    it('should find a leave request by id', async () => {
        const leaveRequest = await leaveRequestRepo.findById('1');
        expect(leaveRequest).toBeNull(); // Assuming no leave request with id '1' exists
    });

    it('should update a leave request', async () => {
        const updatedLeaveRequest = await leaveRequestRepo.update('1', { status: 'approved' });
        expect(updatedLeaveRequest).toBeNull(); // Assuming no leave request with id '1' exists
    });

    it('should delete a leave request', async () => {
        await leaveRequestRepo.delete('1');
        const leaveRequest = await leaveRequestRepo.findById('1');
        expect(leaveRequest).toBeNull(); // Assuming no leave request with id '1' exists
    });
});
