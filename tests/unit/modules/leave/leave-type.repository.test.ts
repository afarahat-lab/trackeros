import { LeaveTypeRepository } from '../../../../src/modules/leave/leave-type.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType, CreateLeaveTypeDto } from '../../../../src/modules/leave/leave-type.model';
import { LeaveTypeCode } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: 'lt-1',
    code: LeaveTypeCode.ANNUAL,
    name: 'Annual Leave',
    description: 'Standard annual leave entitlement',
    isActive: true,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateLeaveTypeDto> = {}): CreateLeaveTypeDto {
  return {
    code: LeaveTypeCode.ANNUAL,
    name: 'Annual Leave',
    description: 'Standard annual leave entitlement',
    ...overrides,
  };
}

describe('LeaveTypeRepository', () => {
  let repo: LeaveTypeRepository;

  beforeEach(() => {
    repo = new LeaveTypeRepository();
    mockQuery.mockReset();
  });

  describe('findByCode', () => {
    it('should return a leave type when found by code', async () => {
      const leaveType = makeLeaveType();
      mockQuery.mockResolvedValueOnce({ rows: [leaveType] });

      const result = await repo.findByCode(LeaveTypeCode.ANNUAL);

      expect(result).toEqual(leaveType);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE code = $1 AND deleted_at IS NULL',
        [LeaveTypeCode.ANNUAL]
      );
    });

    it('should return null when leave type is not found by code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a leave type when found', async () => {
      const leaveType = makeLeaveType();
      mockQuery.mockResolvedValueOnce({ rows: [leaveType] });

      const result = await repo.findById('lt-1');

      expect(result).toEqual(leaveType);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE id = $1 AND deleted_at IS NULL',
        ['lt-1']
      );
    });

    it('should return null when leave type is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted leave types ordered by name', async () => {
      const leaveTypes = [makeLeaveType(), makeLeaveType({ id: 'lt-2', code: LeaveTypeCode.SICK, name: 'Sick Leave' })];
      mockQuery.mockResolvedValueOnce({ rows: leaveTypes });

      const result = await repo.findAll();

      expect(result).toEqual(leaveTypes);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE deleted_at IS NULL ORDER BY name'
      );
    });

    it('should return empty array when no leave types exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave type and return it', async () => {
      const dto = makeCreateDto();
      const created = makeLeaveType();
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        [dto.code, dto.name, dto.description, true]
      );
    });

    it('should use provided isActive when specified', async () => {
      const dto = makeCreateDto({ isActive: false });
      const created = makeLeaveType({ isActive: false });
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(dto);

      expect(result.isActive).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        expect.arrayContaining([false])
      );
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated leave type', async () => {
      const updated = makeLeaveType({ name: 'Updated Annual', description: 'Updated description' });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('lt-1', { name: 'Updated Annual', description: 'Updated description' });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_types SET'),
        expect.arrayContaining(['Updated Annual', 'Updated description', 'lt-1'])
      );
    });

    it('should return null when leave type does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should return existing leave type when no fields are provided', async () => {
      const existing = makeLeaveType();
      mockQuery.mockResolvedValueOnce({ rows: [existing] });

      const result = await repo.update('lt-1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE id = $1 AND deleted_at IS NULL',
        ['lt-1']
      );
    });

    it('should handle isActive update', async () => {
      const updated = makeLeaveType({ isActive: false });
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      await repo.update('lt-1', { isActive: false });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_types SET'),
        expect.arrayContaining([false, 'lt-1'])
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a leave type and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.softDelete('lt-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_types SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        ['lt-1']
      );
    });

    it('should return false when leave type does not exist or is already deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
