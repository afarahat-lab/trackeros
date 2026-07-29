import { PgLeaveTypeRepository } from '../../../../src/modules/leave-policy/leave-type.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType } from '../../../../src/shared/types/leave-type.enum';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as unknown as { query: jest.Mock };

describe('PgLeaveTypeRepository', () => {
  let repo: PgLeaveTypeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PgLeaveTypeRepository();
  });

  describe('findAll', () => {
    it('should return all leave types', async () => {
      const rows = [{ value: LeaveType.ANNUAL }, { value: LeaveType.SICK }];
      mockedPool.query.mockResolvedValue({ rows });
      const result = await repo.findAll();
      expect(result).toEqual([LeaveType.ANNUAL, LeaveType.SICK]);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT value FROM leave_types ORDER BY value;'
      );
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('fail'));
      await expect(repo.findAll()).rejects.toThrow('fail');
    });
  });

  describe('findByValue', () => {
    it('should return the leave type when found', async () => {
      mockedPool.query.mockResolvedValue({ rows: [{ value: LeaveType.ANNUAL }] });
      const result = await repo.findByValue(LeaveType.ANNUAL);
      expect(result).toBe(LeaveType.ANNUAL);
      expect(mockedPool.query).toHaveBeenCalledWith(
        'SELECT value FROM leave_types WHERE value = $1;',
        [LeaveType.ANNUAL]
      );
    });

    it('should return null when not found', async () => {
      mockedPool.query.mockResolvedValue({ rows: [] });
      const result = await repo.findByValue(LeaveType.EMERGENCY);
      expect(result).toBeNull();
    });

    it('should propagate errors', async () => {
      mockedPool.query.mockRejectedValue(new Error('fail'));
      await expect(repo.findByValue(LeaveType.ANNUAL)).rejects.toThrow('fail');
    });
  });
});
