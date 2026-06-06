import LeaveService from '../../../../src/modules/leave/leave.service';
import LeaveRepository from '../../../../src/modules/leave/leave.repository';
import { describe, it, expect, vi } from 'vitest';

describe('LeaveService', () => {
    let leaveService: LeaveService;
    let leaveRepository: LeaveRepository;

    beforeEach(() => {
        leaveRepository = new LeaveRepository();
        leaveService = new LeaveService();
        leaveService['leaveRepository'] = leaveRepository; // Injecting mock
    });

    it('should submit a leave request', async () => {
        const req = {
            employeeId: '1',
            leaveType: 'annual',
            startDate: new Date(),
            endDate: new Date(),
            status: 'pending'
        };

        vi.spyOn(leaveRepository, 'createLeaveRequest').mockResolvedValue(req);

        const result = await leaveService.submitLeaveRequest(req);
        expect(result).toEqual(req);
        expect(leaveRepository.createLeaveRequest).toHaveBeenCalledWith(req);
    });
});
