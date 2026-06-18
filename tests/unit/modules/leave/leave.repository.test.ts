import { LeaveRepository } from '../../../../src/modules/leave/leave.repository';

describe('LeaveRepository interface', () => {
  it('should define the expected methods', () => {
    const repo: LeaveRepository = {
      findById: async () => null,
      findByEmployee: async () => [],
      findByManager: async () => [],
      save: async () => ({} as any),
      update: async () => null,
      softDelete: async () => {},
    };

    expect(repo.findById).toBeDefined();
    expect(repo.findByEmployee).toBeDefined();
    expect(repo.findByManager).toBeDefined();
    expect(repo.save).toBeDefined();
    expect(repo.update).toBeDefined();
    expect(repo.softDelete).toBeDefined();
  });
});
