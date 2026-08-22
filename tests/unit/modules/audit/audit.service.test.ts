import { Pool, QueryResult } from 'pg';
import { AuditService } from '../../../../src/modules/audit/audit.service';
import { AuditRecord } from '../../../../src/modules/audit/audit.model';
import { AuditAction } from '../../../../src/shared/types';

const mockQuery = jest.fn();
const mockPool = { query: mockQuery } as unknown as Pool;

function makeAuditInput(overrides: Partial<Omit<AuditRecord, 'id' | 'createdAt'>> = {}) {
  return {
    entityType: 'LeaveRequest',
    entityId: 'lr-001',
    action: AuditAction.CREATE,
    performedBy: 'emp-1',
    changes: { reason: 'vacation' },
    ...overrides,
  };
}

function makeAuditRow(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'audit-uuid-001',
    entityType: 'LeaveRequest',
    entityId: 'lr-001',
    action: AuditAction.CREATE,
    performedBy: 'emp-1',
    changes: { reason: 'vacation' },
    createdAt: new Date('2024-03-15T10:30:00.000Z'),
    ...overrides,
  };
}

function makeQueryResult<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  };
}

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new AuditService(mockPool);
  });

  describe('record', () => {
    it('inserts an audit record and returns the created AuditRecord', async () => {
      const input = makeAuditInput();
      const returnedRow = makeAuditRow();

      mockQuery.mockResolvedValueOnce(makeQueryResult([returnedRow]));

      const result = await service.record(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Verify correct SQL parameters are passed
      const sqlCall = mockQuery.mock.calls[0] as [string, unknown[]];
      const sqlText = sqlCall[0];
      const sqlParams = sqlCall[1];

      expect(sqlText).toContain('INSERT INTO audit_records');
      expect(sqlText).toContain('gen_random_uuid()');
      expect(sqlParams).toEqual([
        input.entityType,
        input.entityId,
        input.action,
        input.performedBy,
        input.changes,
      ]);

      // Verify returned shape
      expect(result.id).toBe('audit-uuid-001');
      expect(result.entityType).toBe('LeaveRequest');
      expect(result.entityId).toBe('lr-001');
      expect(result.action).toBe(AuditAction.CREATE);
      expect(result.performedBy).toBe('emp-1');
      expect(result.changes).toEqual({ reason: 'vacation' });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('returns a record with a non-empty id and a Date createdAt', async () => {
      const input = makeAuditInput();
      const returnedRow = makeAuditRow({ id: 'gen-uuid-123', createdAt: new Date() });

      mockQuery.mockResolvedValueOnce(makeQueryResult([returnedRow]));

      const result = await service.record(input);

      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('handles null changes', async () => {
      const input = makeAuditInput({ changes: null });
      const returnedRow = makeAuditRow({ changes: null });

      mockQuery.mockResolvedValueOnce(makeQueryResult([returnedRow]));

      const result = await service.record(input);

      expect(result.changes).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const input = makeAuditInput();
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(service.record(input)).rejects.toThrow('connection refused');
    });

    it('returns all seven AuditRecord fields', async () => {
      const input = makeAuditInput();
      const returnedRow = makeAuditRow();

      mockQuery.mockResolvedValueOnce(makeQueryResult([returnedRow]));

      const result = await service.record(input);

      const keys = Object.keys(result).sort();
      expect(keys).toEqual([
        'action',
        'changes',
        'createdAt',
        'entityId',
        'entityType',
        'id',
        'performedBy',
      ]);
    });
  });
});
