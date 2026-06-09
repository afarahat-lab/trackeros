import { Pool } from 'pg';
import { LeaveRequestRepository } from '../../modules/leave/leave.repository';
import { LeaveRequest } from '../../modules/leave/leave.model';

const mockDb = new Pool();
const leaveRequestRepo = new LeaveRequestRepository(mockDb);

describe('LeaveRequestRepository', () => {
    it('should create a leave request', async () => {
        const leaveRequest: LeaveRequest = {
            id: '1',
            employeeId: '123',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending',
            reason: 'Vacation',
        };
        const createdRequest = await leaveRequestRepo.create(leaveRequest);
        expect(createdRequest).toHaveProperty('id');
    });

    it('should find a leave request by id', async () => {
        const leaveRequest = await leaveRequestRepo.findById('1');
        expect(leaveRequest).toHaveProperty('id', '1');
    });

    it('should update a leave request', async () => {
        const updatedRequest = await leaveRequestRepo.update('1', { status: 'approved' });
        expect(updatedRequest).toHaveProperty('status', 'approved');
    });

    it('should delete a leave request', async () => {
        await leaveRequestRepo.delete('1');
        const leaveRequest = await leaveRequestRepo.findById('1');
        expect(leaveRequest).toBeNull();
    });
});
