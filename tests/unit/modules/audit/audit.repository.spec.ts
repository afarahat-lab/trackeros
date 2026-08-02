import { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditAction } from '../../../../src/shared/types/index';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'audit-1',
    entity_type: 'leave_request',
    entity_id: 'lr-1',
    action: 'SUBMITTED',
    performed_by: 'emp-1',
    details: null,
    created_at: '2024-05-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    repo = new AuditRepository();
    mockQuery.mockReset();
  });

  describe('create', () => {
    const createInput = {
      entityType: 'leave_request',
      entityId: 'lr-1',
      action: AuditAction.SUBMITTED,
      performedBy: 'emp-1',
      details: null,
    };

    it('should create and return a fully-populated audit record', async () => {
      const returnedRow = makeRow({
        id: 'audit-new',
        entity_type: 'leave_request',
        entity_id: 'lr-1',
        action: 'SUBMITTED',
        performed_by: 'emp-1',
        details: null,
        created_at: '2024-05-15T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(createInput);

      expect(result.id).toBe('audit-new');
      expect(result.entityType).toBe('leave_request');
      expect(result.entityId).toBe('lr-1');
      expect(result.action).toBe(AuditAction.SUBMITTED);
      expect(result.performedBy).toBe('emp-1');
      expect(result.details).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should create a record with details populated', async () => {
      const inputWithDetails = {
        ...createInput,
        details: { reason: 'Vacation', days: 5 },
      };
      const returnedRow = makeRow({
        id: 'audit-details',
        details: { reason: 'Vacation', days: 5 },
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(inputWithDetails);

      expect(result.details).toEqual({ reason: 'Vacation', days: 5 });
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(uniqueError);

      await expect(repo.create(createInput)).rejects.toThrow(
        'duplicate key value violates unique constraint',
      );
    });

    it('should propagate general database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.create(createInput)).rejects.toThrow('db error');
    });
  });

  describe('findByEntity', () => {
    it('should return audit records for a given entity ordered by created_at DESC', async () => {
      const row1 = makeRow({ id: 'audit-1', created_at: '2024-05-15T00:00:00.000Z' });
      const row2 = makeRow({ id: 'audit-2', created_at: '2024-06-01T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByEntity('leave_request', 'lr-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
        ['leave_request', 'lr-1'],
      );
    });

    it('should return an empty array when no records match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEntity('leave_request', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByEntity('leave_request', 'lr-1')).rejects.toThrow('db error');
    });
  });

  describe('findByUser', () => {
    it('should return audit records for a given user ordered by created_at DESC', async () => {
      const row1 = makeRow({ id: 'audit-1', performed_by: 'emp-1', created_at: '2024-05-15T00:00:00.000Z' });
      const row2 = makeRow({ id: 'audit-2', performed_by: 'emp-1', created_at: '2024-06-01T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByUser('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_records WHERE performed_by = $1 ORDER BY created_at DESC',
        ['emp-1'],
      );
    });

    it('should return an empty array when no records match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByUser('nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByUser('emp-1')).rejects.toThrow('db error');
    });
  });
});
