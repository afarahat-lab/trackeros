import { PgAuditRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditAction } from '../../../../src/modules/audit/audit.model';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

describe('PgAuditRepository', () => {
  let repository: PgAuditRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PgAuditRepository();
  });

  describe('create', () => {
    it('should insert a record and return the created audit record', async () => {
      const input = {
        entityType: 'leave_request',
        entityId: '123',
        action: AuditAction.CREATE,
        newValues: { status: 'pending' },
        performedBy: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      };

      const expectedRecord = {
        id: 'audit-1',
        ...input,
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [expectedRecord] });

      const result = await repository.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_records'),
        [
          input.entityType,
          input.entityId,
          input.action,
          null,
          input.newValues,
          input.performedBy,
          input.ipAddress,
          input.userAgent,
        ]
      );
      expect(result).toEqual(expectedRecord);
    });

    it('should handle null optional fields', async () => {
      const input = {
        entityType: 'leave_request',
        entityId: '123',
        action: AuditAction.CREATE,
      };

      const expectedRecord = {
        id: 'audit-2',
        ...input,
        old_values: null,
        new_values: null,
        performed_by: null,
        ip_address: null,
        user_agent: null,
        performed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue({ rows: [expectedRecord] });

      const result = await repository.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_records'),
        [
          input.entityType,
          input.entityId,
          input.action,
          null,
          null,
          null,
          null,
          null,
        ]
      );
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('findByEntity', () => {
    it('should return audit records for the given entity ordered by performed_at DESC', async () => {
      const records = [
        { id: 'audit-2', entity_type: 'leave_request', entity_id: '123', action: 'UPDATE', performed_at: '2024-01-02T00:00:00Z' },
        { id: 'audit-1', entity_type: 'leave_request', entity_id: '123', action: 'CREATE', performed_at: '2024-01-01T00:00:00Z' },
      ];

      mockQuery.mockResolvedValue({ rows: records });

      const result = await repository.findByEntity('leave_request', '123');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2'),
        ['leave_request', '123']
      );
      expect(result).toEqual(records);
    });

    it('should return empty array when no records found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByEntity('leave_request', 'nonexistent');

      expect(result).toEqual([]);
    });
  });
});
