import { AuditRepository } from 'modules/audit';
import { AuditAction } from 'shared/types';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
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
    action: 'CREATE',
    old_values: null,
    new_values: JSON.stringify({ status: 'DRAFT' }),
    performed_by: 'emp-1',
    performed_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    repo = new AuditRepository();
    mockQuery.mockReset();
  });

  describe('findByEntity', () => {
    it('should return audit logs for a given entity type and id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({ id: 'audit-2', performed_at: '2026-08-02T00:00:00.000Z' }),
          makeRow({ id: 'audit-1', performed_at: '2026-08-01T00:00:00.000Z' }),
        ],
      });

      const results = await repo.findByEntity('leave_request', 'lr-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY performed_at DESC`,
        ['leave_request', 'lr-1'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('audit-2');
      expect(results[1].id).toBe('audit-1');
    });

    it('should return an empty array when no audit logs exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByEntity('leave_request', 'nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('findByPerformer', () => {
    it('should return audit logs for a given performer', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({ id: 'audit-2', performed_at: '2026-08-02T00:00:00.000Z' }),
          makeRow({ id: 'audit-1', performed_at: '2026-08-01T00:00:00.000Z' }),
        ],
      });

      const results = await repo.findByPerformer('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM audit_log
       WHERE performed_by = $1
       ORDER BY performed_at DESC`,
        ['emp-1'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('audit-2');
      expect(results[1].id).toBe('audit-1');
    });

    it('should return an empty array when no audit logs exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByPerformer('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new audit log and return it', async () => {
      const input = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATE,
        oldValues: null,
        newValues: { status: 'DRAFT' },
        performedBy: 'emp-1',
        performedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-new',
            entity_type: 'leave_request',
            entity_id: 'lr-1',
            action: 'CREATE',
            old_values: null,
            new_values: { status: 'DRAFT' },
            performed_by: 'emp-1',
            performed_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['leave_request', 'lr-1', 'CREATE', null, '{"status":"DRAFT"}', 'emp-1', input.performedAt],
      );
      expect(result.id).toBe('audit-new');
      expect(result.entityType).toBe('leave_request');
      expect(result.entityId).toBe('lr-1');
      expect(result.action).toBe('CREATE');
      expect(result.oldValues).toBeNull();
      expect(result.newValues).toEqual({ status: 'DRAFT' });
      expect(result.performedBy).toBe('emp-1');
      expect(result.performedAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    });

    it('should handle oldValues and newValues as objects', async () => {
      const input = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.UPDATE,
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'SUBMITTED' },
        performedBy: 'emp-1',
        performedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-update',
            entity_type: 'leave_request',
            entity_id: 'lr-1',
            action: 'UPDATE',
            old_values: { status: 'DRAFT' },
            new_values: { status: 'SUBMITTED' },
            performed_by: 'emp-1',
            performed_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['leave_request', 'lr-1', 'UPDATE', '{"status":"DRAFT"}', '{"status":"SUBMITTED"}', 'emp-1', input.performedAt],
      );
      expect(result.oldValues).toEqual({ status: 'DRAFT' });
      expect(result.newValues).toEqual({ status: 'SUBMITTED' });
    });

    it('should handle oldValues as string (raw pg result)', async () => {
      const input = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.UPDATE,
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'SUBMITTED' },
        performedBy: 'emp-1',
        performedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-update',
            entity_type: 'leave_request',
            entity_id: 'lr-1',
            action: 'UPDATE',
            old_values: '{"status":"DRAFT"}',
            new_values: '{"status":"SUBMITTED"}',
            performed_by: 'emp-1',
            performed_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(result.oldValues).toEqual({ status: 'DRAFT' });
      expect(result.newValues).toEqual({ status: 'SUBMITTED' });
    });

    it('should handle null oldValues and newValues', async () => {
      const input = {
        entityType: 'employee',
        entityId: 'emp-1',
        action: AuditAction.DELETE,
        oldValues: null,
        newValues: null,
        performedBy: 'admin-1',
        performedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-del',
            entity_type: 'employee',
            entity_id: 'emp-1',
            action: 'DELETE',
            old_values: null,
            new_values: null,
            performed_by: 'admin-1',
            performed_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['employee', 'emp-1', 'DELETE', null, null, 'admin-1', input.performedAt],
      );
      expect(result.oldValues).toBeNull();
      expect(result.newValues).toBeNull();
    });
  });
});
