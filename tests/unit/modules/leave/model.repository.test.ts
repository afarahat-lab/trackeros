import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

describe('LeaveRequest Model and Repository', () => {
  it('should define LeaveRequest interface with correct fields', () => {
    const request: LeaveRequest = {
      id: '1',
      employeeId: 'emp1',
      policyId: 'pol1',
      startDate: new Date(),
      endDate: new Date(),
      totalDays: 5,
      status: 'draft',
      reason: 'Vacation',
      managerId: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    expect(request).toBeDefined();
    expect(request.status).toBe('draft');
  });

  it('should define LeaveRequestRepository interface with required methods', () => {
    const repository: LeaveRequestRepository = {
      findById: async (id: string) => null,
      findByEmployeeId: async (employeeId: string) => [],
      findByManagerId: async (managerId: string) => [],
      findByStatus: async (status: string) => [],
      save: async (request) => ({ ...request, id: '1', createdAt: new Date(), updatedAt: new Date() }),
      update: async (id, updates) => null
    };
    
    expect(repository).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.findByEmployeeId).toBeDefined();
    expect(repository.findByManagerId).toBeDefined();
    expect(repository.findByStatus).toBeDefined();
    expect(repository.save).toBeDefined();
    expect(repository.update).toBeDefined();
  });
});
