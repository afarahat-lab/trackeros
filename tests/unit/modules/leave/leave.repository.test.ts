import { PgLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { CreateLeaveRequestDto, LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveType } from '../../../../src/shared/types';

describe('PgLeaveRepository', () => {
  let repository: PgLeaveRepository;

  beforeEach(() => {
    repository = new PgLeaveRepository();
  });

  const createDto: CreateLeaveRequestDto = {
    employeeId: 'emp-1',
    leaveType: LeaveType.Annual,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    reason: 'vacation',
    managerId: 'mgr-1',
  };

  describe('create', () => {
    it('should create a new leave request and return it', async () => {
      const result = await repository.create(createDto);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.employeeId).toBe(createDto.employeeId);
      expect(result.leaveType).toBe(createDto.leaveType);
      expect(result.status).toBe('pending');
      expect(result.reason).toBe(createDto.reason);
      expect(result.managerId).toBe(createDto.managerId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should store the created request and be retrievable', async () => {
      const created = await repository.create(createDto);
      const found = await repository.findById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return an empty array when no requests exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });

    it('should return all created requests', async () => {
      const req1 = await repository.create(createDto);
      const req2 = await repository.create({
        ...createDto,
        employeeId: 'emp-2',
        leaveType: LeaveType.Sick,
      });
      const all = await repository.findAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(req1);
      expect(all).toContainEqual(req2);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent id', async () => {
      const result = await repository.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the correct request', async () => {
      const created = await repository.create(createDto);
      const found = await repository.findById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update an existing request', async () => {
      const created = await repository.create(createDto);
      const updated = await repository.update(created.id, { reason: 'updated reason' });
      expect(updated).not.toBeNull();
      expect(updated!.reason).toBe('updated reason');
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should return null when updating non-existent request', async () => {
      const result = await repository.update('nonexistent', { reason: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing request and return true', async () => {
      const created = await repository.create(createDto);
      const deleted = await repository.delete(created.id);
      expect(deleted).toBe(true);
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent request', async () => {
      const result = await repository.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
