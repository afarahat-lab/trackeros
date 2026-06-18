import { ILeaveRepository, PgLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';

describe('ILeaveRepository interface', () => {
  it('should define the expected methods', () => {
    const repo: ILeaveRepository = new PgLeaveRepository();
    expect(repo.create).toBeDefined();
    expect(repo.findById).toBeDefined();
    expect(repo.findByEmployee).toBeDefined();
    expect(repo.updateStatus).toBeDefined();
    expect(repo.delete).toBeDefined();
  });
});
