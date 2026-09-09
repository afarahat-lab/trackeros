import { LeaveType, CreateLeaveTypeInput, ILeaveTypeRepository, LeaveTypeService } from '../../../src/modules/leave-type';
import { ValidationError, NotFoundError, ConflictError } from '../../../src/shared/errors';
import { LeaveTypeCode } from '../../../src/shared/types';

class FakeLeaveTypeRepository implements ILeaveTypeRepository {
  private rows: LeaveType[] = [];

  async create(input: CreateLeaveTypeInput): Promise<LeaveType> {
    this.rows.push(input);
    return input;
  }

  async findByCode(code: LeaveTypeCode): Promise<LeaveType | null> {
    return this.rows.find((lt) => lt.code === code) ?? null;
  }

  async findAll(): Promise<LeaveType[]> {
    return [...this.rows];
  }
}

function makeInput(overrides: Partial<CreateLeaveTypeInput> = {}): CreateLeaveTypeInput {
  return {
    code: LeaveTypeCode.ANNUAL,
    name: 'Annual Leave',
    requiresApproval: true,
    maxConsecutiveDays: 30,
    isPaid: true,
    ...overrides,
  };
}

describe('LeaveTypeService', () => {
  let repository: FakeLeaveTypeRepository;
  let service: LeaveTypeService;

  beforeEach(() => {
    repository = new FakeLeaveTypeRepository();
    service = new LeaveTypeService(repository);
  });

  describe('createLeaveType', () => {
    it('returns the created LeaveType', async () => {
      const input = makeInput();
      const leaveType = await service.createLeaveType(input);

      expect(leaveType).toEqual(input);
    });

    it('rejects invalid code with ValidationError', async () => {
      const input = makeInput({ code: 'invalid' as LeaveTypeCode });
      await expect(service.createLeaveType(input)).rejects.toThrow(ValidationError);
    });

    it('rejects empty name with ValidationError', async () => {
      const input = makeInput({ name: ' ' });
      await expect(service.createLeaveType(input)).rejects.toThrow(ValidationError);
    });

    it('rejects duplicate code with ConflictError', async () => {
      const input = makeInput();
      await service.createLeaveType(input);

      const duplicate = makeInput({ name: 'Another Name' });
      await expect(service.createLeaveType(duplicate)).rejects.toThrow(ConflictError);
    });
  });

  describe('getLeaveTypeByCode', () => {
    it('returns the leave type when found', async () => {
      const created = await service.createLeaveType(makeInput());
      const found = await service.getLeaveTypeByCode(created.code);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when the code is unknown', async () => {
      await expect(service.getLeaveTypeByCode(LeaveTypeCode.SICK)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
