import { PolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';

describe('PolicyRepository interface', () => {
  it('should define the expected methods', () => {
    const repo: PolicyRepository = {
      findById: async () => null,
      findActiveByLeaveType: async () => [],
      save: async () => ({} as LeavePolicy),
      update: async () => null,
      softDelete: async () => {},
    };

    expect(repo.findById).toBeDefined();
    expect(repo.findActiveByLeaveType).toBeDefined();
    expect(repo.save).toBeDefined();
    expect(repo.update).toBeDefined();
    expect(repo.softDelete).toBeDefined();
  });
});
