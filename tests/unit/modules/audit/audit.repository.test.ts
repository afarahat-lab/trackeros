import { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditLog } from '../../../../src/modules/audit/audit.model';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

function makeAuditLogRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'audit-1',
    entity_type: 'leave_request',
    entity_id: 'lr-1',
    action: 'CREATE',
    old_values: null,
    new_values: JSON.stringify({ status: 'SUBMITTED' }),
    performed_by: 'emp-1',
    performed_at: '2024-01-15T10:00:00.000Z',
    created_at: '2024-01-15T10:00:01.000Z',
    updated_at: '2024-01-15T10:00:01.000Z',
    ...overrides,
  };
}

function expectedAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-1',
    entityType: 'leave_request',
    entityId: 'lr-1',
    action: 'CREATE',
    oldValues: null,
    newValues: { status: 'SUBMITTED' },
    performedBy: 'emp-1',
    performedAt: new Date('2024-01-15T10:00:00.000Z'),
    createdAt: new Date('2024-01-15T10:00:01.000Z'),
    updatedAt: new Date('2024-01-15T10:00:01.000Z'),
    ...overrides,
  };
}

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AuditRepository();
  });

  describe('create', () => {
    it('should insert and return a new audit log entry', async () => {
      const input: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'CREATE',
        oldValues: null,
        newValues: { status: 'SUBMITTED' },
        performedBy: 'emp-1',
        performedAt: new Date('2024-01-15T10:00:00.000Z'),
      };

      const row = makeAuditLogRow();
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(expectedAuditLog());
      expect(pool.query).toHaveBeenCalledTimes(1);
      const sql: string = (pool.query as jest.Mock).mock.calls[0][0];
      const params: unknown[] = (pool.query as jest.Mock).mock.calls[0][1];
      expect(sql).toContain('INSERT INTO audit_logs');
      expect(params[0]).toBe('leave_request');
      expect(params[1]).toBe('lr-1');
      expect(params[2]).toBe('CREATE');
      expect(params[3]).toBeNull();
      expect(params[4]).toBe(JSON.stringify({ status: 'SUBMITTED' }));
      expect(params[5]).toBe('emp-1');
      expect(params[6]).toEqual(new Date('2024-01-15T10:00:00.000Z'));
    });

    it('should handle null oldValues and newValues', async () => {
      const input: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> = {
        entityType: 'employee',
        entityId: 'emp-1',
        action: 'UPDATE',
        oldValues: null,
        newValues: null,
        performedBy: null,
        performedAt: new Date('2024-01-15T10:00:00.000Z'),
      };

      const row = makeAuditLogRow({
        entity_type: 'employee',
        entity_id: 'emp-1',
        action: 'UPDATE',
        old_values: null,
        new_values: null,
        performed_by: null,
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result.entityType).toBe('employee');
      expect(result.oldValues).toBeNull();
      expect(result.newValues).toBeNull();
      expect(result.performedBy).toBeNull();
    });

    it('should propagate database errors', async () => {
      const input: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'CREATE',
        oldValues: null,
        newValues: null,
        performedBy: 'emp-1',
        performedAt: new Date(),
      };

      const dbError = new Error('Connection refused');
      (pool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs ordered by performed_at DESC', async () => {
      const row1 = makeAuditLogRow({ id: 'audit-1', performed_at: '2024-01-15T10:00:00.000Z' });
      const row2 = makeAuditLogRow({ id: 'audit-2', performed_at: '2024-01-16T10:00:00.000Z' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByEntity('leave_request', 'lr-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY performed_at DESC',
        ['leave_request', 'lr-1'],
      );
    });

    it('should return empty array when no records match', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEntity('nonexistent', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Connection refused');
      (pool.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(repo.findByEntity('leave_request', 'lr-1')).rejects.toThrow('Connection refused');
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new AuditRepository(mockClient);

      const row = makeAuditLogRow();
      (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      await customRepo.findByEntity('leave_request', 'lr-1');

      expect(mockClient.query).toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
