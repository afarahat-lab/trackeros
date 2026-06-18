import { ILeavePolicyRepository, PgLeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy, CreateLeavePolicyDto } from '../../../../src/modules/policy/policy.model';

describe('ILeavePolicyRepository interface', () => {
  it('should define the expected methods', () => {
    const repo: ILeavePolicyRepository = new PgLeavePolicyRepository();
    expect(repo.create).toBeDefined();
    expect(repo.findById).toBeDefined();
    expect(repo.findAll).toBeDefined();
    expect(repo.update).toBeDefined();
    expect(repo.delete).toBeDefined();
  });
});
