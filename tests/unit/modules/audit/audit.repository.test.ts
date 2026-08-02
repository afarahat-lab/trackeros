import { PgAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditLog } from '../../../../src/modules/audit/audit.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const hasDetails = 'details' in overrides;
  return {
    id: overrides.id ?? 'audit-001',
    actor_id: overrides.actor_id ?? 'emp-001',
    action: overrides.action ?? 'LEAVE_SUBMITTED',
    target_id: overrides.target_id ?? 'lr-001',
    target_type: overrides.target_type ?? 'LeaveRequest',
    details: (hasDetails ? overrides.details : { reason: 'Vacation' }) as Record<string, unknown> | null,
    timestamp: overrides.timestamp ?? new Date('2026-07-01T10:00:00Z'),
    created_at: overrides.created_at ?? new Date('2026-07-01T10:00:01Z'),
    updated_at: overrides.updated_at ?? new Date('2026-07-01T10:00:01Z'),
  };
}

function makeEntity(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-001',
    actorId: 'emp-001',
    action: 'LEAVE_SUBMITTED',
    targetId: 'lr-001',
    targetType: 'LeaveRequest',
    details: { reason: 'Vacation' },
    timestamp: new Date('2026-07-01T10:00:00Z'),
    createdAt: new Date('2026-07-01T10:00:01Z'),
    updatedAt: new Date('2026-07-01T10:00:01Z'),
    ...overrides,
  };
}

describe('PgAuditLogRepository', () => {
  let repo: PgAuditLogRepository;

  beforeEach(() => {
    repo = new PgAuditLogRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const input: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'> = {
      actorId: 'emp-001',
      action: 'LEAVE_SUBMITTED',
      targetId: 'lr-001',
      targetType: 'LeaveRequest',
      details: { reason: 'Vacation' },
      timestamp: new Date('2026-07-01T10:00:00Z'),
    };

    it('should insert and return a fully-populated AuditLog', async () => {
      const returnedRow = makeRow({
        id: 'generated-id',
        actor_id: 'emp-001',
        action: 'LEAVE_SUBMITTED',
        target_id: 'lr-001',
        target_type: 'LeaveRequest',
        details: { reason: 'Vacation' },
        timestamp: new Date('2026-07-01T10:00:00Z'),
        created_at: new Date('2026-07-01T10:00:01Z'),
        updated_at: new Date('2026-07-01T10:00:01Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.actorId).toBe('emp-001');
      expect(result.action).toBe('LEAVE_SUBMITTED');
      expect(result.targetId).toBe('lr-001');
      expect(result.targetType).toBe('LeaveRequest');
      expect(result.details).toEqual({ reason: 'Vacation' });
      expect(result.timestamp).toEqual(new Date('2026-07-01T10:00:00Z'));
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO audit_logs');
      expect(queryCall[1][1]).toBe('emp-001');
      expect(queryCall[1][2]).toBe('LEAVE_SUBMITTED');
      expect(queryCall[1][3]).toBe('lr-001');
      expect(queryCall[1][4]).toBe('LeaveRequest');
      expect(queryCall[1][5]).toEqual({ reason: 'Vacation' });
      expect(queryCall[1][6]).toEqual(new Date('2026-07-01T10:00:00Z'));
    });

    it('should handle null details by storing null', async () => {
      const inputWithNullDetails = { ...input, details: null };
      const returnedRow = makeRow({
        id: 'gen-002',
        details: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow], rowCount: 1 } as never);

      const result = await repo.create(inputWithNullDetails);

      expect(result.details).toBeNull();
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1][5]).toBeNull();
    });

    it('should reject on a unique-constraint violation', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(error);

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.create(input)).rejects.toThrow('Connection refused');
    });
  });

  describe('findByTarget', () => {
    it('should return an array of AuditLog for matching targetId and targetType', async () => {
      const row1 = makeRow({ id: 'audit-001' });
      const row2 = makeRow({ id: 'audit-002', action: 'LEAVE_APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByTarget('lr-001', 'LeaveRequest');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-001');
      expect(result[0].action).toBe('LEAVE_SUBMITTED');
      expect(result[1].id).toBe('audit-002');
      expect(result[1].action).toBe('LEAVE_APPROVED');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE target_id = $1 AND target_type = $2 ORDER BY timestamp DESC',
        ['lr-001', 'LeaveRequest'],
      );
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByTarget('nonexistent', 'LeaveRequest');

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.findByTarget('lr-001', 'LeaveRequest')).rejects.toThrow('Connection refused');
    });

    it('should reject on a query timeout', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByTarget('lr-001', 'LeaveRequest')).rejects.toThrow('Query timeout');
    });
  });

  describe('findByActor', () => {
    it('should return an array of AuditLog for matching actorId', async () => {
      const row1 = makeRow({ id: 'audit-001' });
      const row2 = makeRow({ id: 'audit-002', action: 'LEAVE_CANCELLED' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 } as never);

      const result = await repo.findByActor('emp-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-001');
      expect(result[0].action).toBe('LEAVE_SUBMITTED');
      expect(result[1].id).toBe('audit-002');
      expect(result[1].action).toBe('LEAVE_CANCELLED');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE actor_id = $1 ORDER BY timestamp DESC',
        ['emp-001'],
      );
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await repo.findByActor('emp-999');

      expect(result).toEqual([]);
    });

    it('should reject on a pool error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.findByActor('emp-001')).rejects.toThrow('Connection refused');
    });

    it('should reject on a query timeout', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(repo.findByActor('emp-001')).rejects.toThrow('Query timeout');
    });
  });
});
