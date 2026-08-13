import { LeaveTypeRepository } from '../../../../src/modules/leave-policy/leave-type.repository';
import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<{
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'lt-1',
    code: overrides.code ?? 'annual',
    label: overrides.label ?? 'Annual Leave',
    description: overrides.description ?? null,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? new Date('2025-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2025-01-01T00:00:00Z'),
  };
}

describe('LeaveTypeRepository', () => {
  let repo: LeaveTypeRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new LeaveTypeRepository();
  });

  describe('findAll', () => {
    it('should return all leave types ordered by label', async () => {
      const rows = [
        makeRow({ id: 'lt-1', code: 'annual', label: 'Annual Leave' }),
        makeRow({ id: 'lt-2', code: 'sick', label: 'Sick Leave' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types ORDER BY label ASC',
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lt-1');
      expect(result[0].code).toBe(LeaveTypeCode.annual);
      expect(result[0].label).toBe('Annual Leave');
      expect(result[0].description).toBeUndefined();
      expect(result[0].isActive).toBe(true);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no leave types exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave type when found', async () => {
      const row = makeRow({ id: 'lt-1', code: 'emergency', label: 'Emergency Leave', description: 'For emergencies' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lt-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types WHERE id = $1',
        ['lt-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lt-1');
      expect(result!.code).toBe(LeaveTypeCode.emergency);
      expect(result!.description).toBe('For emergencies');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return a leave type when found by code', async () => {
      const row = makeRow({ id: 'lt-3', code: 'unpaid', label: 'Unpaid Leave' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByCode(LeaveTypeCode.unpaid);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types WHERE code = $1',
        ['unpaid'],
      );
      expect(result).not.toBeNull();
      expect(result!.code).toBe(LeaveTypeCode.unpaid);
    });

    it('should return null when code not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByCode(LeaveTypeCode.maternity);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a new leave type and return it', async () => {
      const row = makeRow({
        id: 'lt-new',
        code: 'maternity',
        label: 'Maternity Leave',
        description: 'Maternity leave description',
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        code: LeaveTypeCode.maternity,
        label: 'Maternity Leave',
        description: 'Maternity leave description',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        ['maternity', 'Maternity Leave', 'Maternity leave description', true],
      );
      expect(result.id).toBe('lt-new');
      expect(result.code).toBe(LeaveTypeCode.maternity);
      expect(result.isActive).toBe(true);
    });

    it('should default isActive to true when not provided', async () => {
      const row = makeRow({ id: 'lt-new2', code: 'paternity', label: 'Paternity Leave', is_active: true });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        code: LeaveTypeCode.paternity,
        label: 'Paternity Leave',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        ['paternity', 'Paternity Leave', null, true],
      );
      expect(result.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const row = makeRow({ id: 'lt-inactive', code: 'sick', label: 'Sick Leave', is_active: false });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        code: LeaveTypeCode.sick,
        label: 'Sick Leave',
        isActive: false,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        ['sick', 'Sick Leave', null, false],
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated leave type', async () => {
      const row = makeRow({ id: 'lt-1', code: 'annual', label: 'Updated Annual', description: 'Updated desc', is_active: false });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lt-1', {
        label: 'Updated Annual',
        description: 'Updated desc',
        isActive: false,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_types SET'),
        ['Updated Annual', 'Updated desc', false, 'lt-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Updated Annual');
      expect(result!.isActive).toBe(false);
    });

    it('should return null when leave type does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { label: 'New Label' });

      expect(result).toBeNull();
    });

    it('should return the existing leave type when no fields are provided', async () => {
      const row = makeRow({ id: 'lt-1' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lt-1', {});

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lt-1');
    });

    it('should update only the code field', async () => {
      const row = makeRow({ id: 'lt-1', code: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lt-1', { code: LeaveTypeCode.sick });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_types SET'),
        ['sick', 'lt-1'],
      );
      expect(result).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete('lt-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM leave_types WHERE id = $1',
        ['lt-1'],
      );
      expect(result).toBe(true);
    });

    it('should return false when no row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new LeaveTypeRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findAll();

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
