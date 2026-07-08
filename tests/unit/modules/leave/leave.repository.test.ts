import { Knex } from 'knex';
import {
  ILeaveRequestRepository,
  KnexLeaveRepository,
} from '../../../../src/modules/leave/leave.repository';
import {
  LeaveRequest,
  LeaveRequestStatus,
  UpdateLeaveRequestStatusDto,
} from '../../../../src/modules/leave/leave.model';

function createMockKnex(): jest.Mocked<Knex> {
  const queryBuilder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  };

  const mockKnex = jest.fn(() => queryBuilder) as unknown as jest.Mocked<Knex>;
  (mockKnex as unknown as Record<string, jest.Mock>).where = queryBuilder.where;
  (mockKnex as unknown as Record<string, jest.Mock>).andWhere = queryBuilder.andWhere;
  (mockKnex as unknown as Record<string, jest.Mock>).whereIn = queryBuilder.whereIn;
  (mockKnex as unknown as Record<string, jest.Mock>).select = queryBuilder.select;
  (mockKnex as unknown as Record<string, jest.Mock>).insert = queryBuilder.insert;
  (mockKnex as unknown as Record<string, jest.Mock>).update = queryBuilder.update;
  (mockKnex as unknown as Record<string, jest.Mock>).del = queryBuilder.del;
  (mockKnex as unknown as Record<string, jest.Mock>).first = queryBuilder.first;
  (mockKnex as unknown as Record<string, jest.Mock>).returning = queryBuilder.returning;

  return mockKnex;
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: '1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    startDate: new Date('2026-07-10'),
    endDate: new Date('2026-07-12'),
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

describe('ILeaveRequestRepository interface', () => {
  it('should be satisfied by KnexLeaveRepository concrete implementation', () => {
    const mockKnex = createMockKnex();
    const repo: ILeaveRequestRepository = new KnexLeaveRepository(mockKnex);

    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
    expect(typeof repo.findByEmployeeId).toBe('function');
    expect(typeof repo.findByStatus).toBe('function');
    expect(typeof repo.findOverlapping).toBe('function');
    expect(typeof repo.updateStatus).toBe('function');
  });
});

describe('KnexLeaveRepository', () => {
  let mockKnex: jest.Mocked<Knex>;
  let repo: KnexLeaveRepository;

  beforeEach(() => {
    mockKnex = createMockKnex();
    repo = new KnexLeaveRepository(mockKnex);
  });

  function chain() {
    return mockKnex('leave_requests') as unknown as Record<string, jest.Mock>;
  }

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = makeLeaveRequest();
      chain().first.mockResolvedValue(entity);

      const result = await repo.findById('1');
      expect(result).toEqual(entity);
      expect(chain().where).toHaveBeenCalledWith({ id: '1' });
    });

    it('should return null when not found', async () => {
      chain().first.mockResolvedValue(undefined);

      const result = await repo.findById('999');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities = [makeLeaveRequest({ id: '1' }), makeLeaveRequest({ id: '2' })];
      chain().select.mockResolvedValue(entities);

      const result = await repo.findAll();
      expect(result).toEqual(entities);
      expect(chain().select).toHaveBeenCalledWith('*');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for a given employee', async () => {
      const entities = [makeLeaveRequest({ employeeId: 'emp-1' })];
      chain().select.mockResolvedValue(entities);

      const result = await repo.findByEmployeeId('emp-1');
      expect(result).toEqual(entities);
      expect(chain().where).toHaveBeenCalledWith({ employeeId: 'emp-1' });
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests with the given status', async () => {
      const entities = [makeLeaveRequest({ status: LeaveRequestStatus.SUBMITTED })];
      chain().select.mockResolvedValue(entities);

      const result = await repo.findByStatus(LeaveRequestStatus.SUBMITTED);
      expect(result).toEqual(entities);
      expect(chain().where).toHaveBeenCalledWith({ status: LeaveRequestStatus.SUBMITTED });
    });
  });

  describe('findOverlapping', () => {
    it('should find overlapping approved or submitted requests for the same employee', async () => {
      const entities = [makeLeaveRequest({ status: LeaveRequestStatus.APPROVED })];
      chain().select.mockResolvedValue(entities);

      const startDate = new Date('2026-07-10');
      const endDate = new Date('2026-07-15');
      const result = await repo.findOverlapping('emp-1', startDate, endDate);

      expect(result).toEqual(entities);
      expect(chain().where).toHaveBeenCalledWith({ employeeId: 'emp-1' });
      expect(chain().whereIn).toHaveBeenCalledWith('status', ['SUBMITTED', 'APPROVED']);
    });

    it('should exclude a specific request id when provided', async () => {
      chain().select.mockResolvedValue([]);

      const startDate = new Date('2026-07-10');
      const endDate = new Date('2026-07-15');
      await repo.findOverlapping('emp-1', startDate, endDate, 'req-99');

      expect(chain().andWhere).toHaveBeenCalledWith('id', '!=', 'req-99');
    });
  });

  describe('create', () => {
    it('should insert a new leave request', async () => {
      const input = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-12'),
        reason: 'Vacation',
        status: LeaveRequestStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date('2026-07-01'),
        updatedAt: new Date('2026-07-01'),
      };
      const created = makeLeaveRequest();
      chain().returning.mockResolvedValue([created]);

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(chain().insert).toHaveBeenCalledWith(input);
      expect(chain().returning).toHaveBeenCalledWith('*');
    });
  });

  describe('update', () => {
    it('should update and return the updated entity', async () => {
      const patch = { reason: 'Updated reason' };
      const updated = makeLeaveRequest({ reason: 'Updated reason' });
      chain().returning.mockResolvedValue([updated]);

      const result = await repo.update('1', patch);
      expect(result).toEqual(updated);
      expect(chain().where).toHaveBeenCalledWith({ id: '1' });
      expect(chain().update).toHaveBeenCalledWith(patch);
    });
  });

  describe('updateStatus', () => {
    it('should update the status and related fields', async () => {
      const dto: UpdateLeaveRequestStatusDto = {
        status: LeaveRequestStatus.APPROVED,
        actorId: 'mgr-1',
      };
      const updated = makeLeaveRequest({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2026-07-05'),
      });
      chain().returning.mockResolvedValue([updated]);

      const result = await repo.updateStatus('1', dto);
      expect(result).toEqual(updated);
      expect(chain().where).toHaveBeenCalledWith({ id: '1' });
      expect(chain().update).toHaveBeenCalledWith(dto);
      expect(chain().returning).toHaveBeenCalledWith('*');
    });
  });

  describe('delete', () => {
    it('should delete the entity by id', async () => {
      chain().del.mockResolvedValue(1);

      await repo.delete('1');
      expect(chain().where).toHaveBeenCalledWith({ id: '1' });
      expect(chain().del).toHaveBeenCalled();
    });
  });
});
