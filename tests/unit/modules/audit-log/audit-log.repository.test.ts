import { PgAuditLogRepository } from '../../../../src/modules/audit-log/audit-log.repository';
import { AuditLog } from '../../../../src/modules/audit-log/audit-log.model';
import { AuditAction } from '../../../../src/shared/types/leave.types';
import { UniqueConstraintViolationError } from '../../../../src/modules/employee/employee.repository';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'audit-001',
    entity_type: 'LeaveRequest',
    entity_id: 'lr-001',
    action: 'CREATED',
    old_values: null,
    new_values: JSON.stringify({ status: 'SUBMITTED' }),
    performed_by: 'emp-001',
    performed_at: '2026-06-01T10:00:00.000Z',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-001',
    entityType: 'LeaveRequest',
    entityId: 'lr-001',
    action: AuditAction.CREATED,
    oldValues: null,
    newValues: { status: 'SUBMITTED' },
    performedBy: 'emp-001',
    performedAt: new Date('2026-06-01T10:00:00.000Z'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('PgAuditLogRepository', () => {
  let repo: PgAuditLogRepository;

  beforeEach(() => {
    repo = new PgAuditLogRepository();
    mockQuery.mockReset();
  });

  describe('create', () => {
    const input = {
      entityType: 'LeaveRequest',
      entityId: 'lr-001',
      action: AuditAction.CREATED,
      oldValues: null,
      newValues: { status: 'SUBMITTED' },
      performedBy: 'emp-001',
      performedAt: new Date('2026-06-01T10:00:00.000Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('persists a new audit log and returns the entity with server-generated fields', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'LeaveRequest',
          'lr-001',
          'CREATED',
          null,
          JSON.stringify({ status: 'SUBMITTED' }),
          'emp-001',
          input.performedAt,
          '192.168.1.1',
          'Mozilla/5.0',
        ],
      );
      expect(result).toEqual(makeAuditLog());
    });

    it('persists an audit log with null ipAddress and userAgent', async () => {
      const row = makeRow({ ip_address: null, user_agent: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        ...input,
        ipAddress: null,
        userAgent: null,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'LeaveRequest',
          'lr-001',
          'CREATED',
          null,
          JSON.stringify({ status: 'SUBMITTED' }),
          'emp-001',
          input.performedAt,
          null,
          null,
        ],
      );
      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    it('persists an audit log with oldValues populated', async () => {
      const oldValues = { status: 'DRAFT' };
      const row = makeRow({ old_values: JSON.stringify(oldValues) });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        ...input,
        oldValues,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'LeaveRequest',
          'lr-001',
          'CREATED',
          JSON.stringify(oldValues),
          JSON.stringify({ status: 'SUBMITTED' }),
          'emp-001',
          input.performedAt,
          '192.168.1.1',
          'Mozilla/5.0',
        ],
      );
      expect(result.oldValues).toEqual(oldValues);
    });

    it('throws UniqueConstraintViolationError on unique violation (code 23505)', async () => {
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow(UniqueConstraintViolationError);
    });

    it('re-throws non-unique-constraint errors', async () => {
      const pgError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow('connection refused');
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.create(input, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByEntity', () => {
    it('returns audit entries for the given entity ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'audit-002', created_at: '2026-06-02T00:00:00.000Z' }),
        makeRow({ id: 'audit-001', created_at: '2026-06-01T00:00:00.000Z' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEntity('LeaveRequest', 'lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
        ['LeaveRequest', 'lr-001'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-002');
      expect(result[1].id).toBe('audit-001');
    });

    it('returns an empty array when no audit entries exist for the entity', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEntity('LeaveRequest', 'lr-999');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByEntity('LeaveRequest', 'lr-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByPerformedBy', () => {
    it('returns audit entries for the given actor ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'audit-002', created_at: '2026-06-02T00:00:00.000Z' }),
        makeRow({ id: 'audit-001', created_at: '2026-06-01T00:00:00.000Z' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByPerformedBy('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE performed_by = $1 ORDER BY created_at DESC',
        ['emp-001'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-002');
      expect(result[1].id).toBe('audit-001');
    });

    it('returns an empty array when no audit entries exist for the actor', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByPerformedBy('emp-999');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByPerformedBy('emp-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('rowToAuditLog (via create result)', () => {
    it('converts date strings to Date objects', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: AuditAction.CREATED,
        oldValues: null,
        newValues: { status: 'SUBMITTED' },
        performedBy: 'emp-001',
        performedAt: new Date('2026-06-01T10:00:00.000Z'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.performedAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('casts action to AuditAction enum', async () => {
      const row = makeRow({ action: 'APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: AuditAction.APPROVED,
        oldValues: null,
        newValues: { status: 'APPROVED' },
        performedBy: 'emp-000',
        performedAt: new Date('2026-06-01T10:00:00.000Z'),
        ipAddress: null,
        userAgent: null,
      });

      expect(result.action).toBe(AuditAction.APPROVED);
    });

    it('parses JSON oldValues and newValues from string columns', async () => {
      const oldValues = { status: 'DRAFT' };
      const newValues = { status: 'SUBMITTED' };
      const row = makeRow({
        old_values: JSON.stringify(oldValues),
        new_values: JSON.stringify(newValues),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: AuditAction.CREATED,
        oldValues,
        newValues,
        performedBy: 'emp-001',
        performedAt: new Date('2026-06-01T10:00:00.000Z'),
        ipAddress: null,
        userAgent: null,
      });

      expect(result.oldValues).toEqual(oldValues);
      expect(result.newValues).toEqual(newValues);
    });

    it('leaves oldValues and newValues as null when not set', async () => {
      const row = makeRow({ old_values: null, new_values: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: AuditAction.CREATED,
        oldValues: null,
        newValues: null,
        performedBy: 'emp-001',
        performedAt: new Date('2026-06-01T10:00:00.000Z'),
        ipAddress: null,
        userAgent: null,
      });

      expect(result.oldValues).toBeNull();
      expect(result.newValues).toBeNull();
    });
  });
});
