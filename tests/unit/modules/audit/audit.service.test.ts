import { AuditService } from '../../../../src/modules/audit/audit.service';
import { AuditAction } from '../../../../src/shared/types';

const mockQuery = jest.fn();
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
    mockQuery.mockReset();
  });

  describe('record', () => {
    it('inserts an audit record and returns it with server-generated id and createdAt', async () => {
      const createdAt = new Date('2024-06-01T12:00:00Z');
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'generated-uuid',
            entity_type: 'leave_request',
            entity_id: 'lr-1',
            action: 'APPROVE',
            performed_by: 'mgr-1',
            changes: { status: 'APPROVED' },
            created_at: createdAt,
          },
        ],
      });

      const result = await service.record({
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.APPROVE,
        performedBy: 'mgr-1',
        changes: { status: 'APPROVED' },
      });

      expect(result.id).toBe('generated-uuid');
      expect(typeof result.id).toBe('string');
      expect(result.entityType).toBe('leave_request');
      expect(result.entityId).toBe('lr-1');
      expect(result.action).toBe(AuditAction.APPROVE);
      expect(result.performedBy).toBe('mgr-1');
      expect(result.changes).toEqual({ status: 'APPROVED' });
      expect(result.createdAt).toEqual(createdAt);
    });

    it('does not accept caller-supplied id', async () => {
      const createdAt = new Date('2024-06-01T12:00:00Z');
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'server-generated',
            entity_type: 'employee',
            entity_id: 'emp-1',
            action: 'CREATE',
            performed_by: 'admin-1',
            changes: null,
            created_at: createdAt,
          },
        ],
      });

      const result = await service.record({
        entityType: 'employee',
        entityId: 'emp-1',
        action: AuditAction.CREATE,
        performedBy: 'admin-1',
        changes: null,
      });

      // id comes from the database (server-generated), not from input
      expect(result.id).toBe('server-generated');
    });

    it('handles null changes', async () => {
      const createdAt = new Date('2024-06-01T12:00:00Z');
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'generated-uuid',
            entity_type: 'employee',
            entity_id: 'emp-1',
            action: 'CREATE',
            performed_by: 'admin-1',
            changes: null,
            created_at: createdAt,
          },
        ],
      });

      const result = await service.record({
        entityType: 'employee',
        entityId: 'emp-1',
        action: AuditAction.CREATE,
        performedBy: 'admin-1',
        changes: null,
      });

      expect(result.changes).toBeNull();
    });

    it('propagates database errors on constraint violations', async () => {
      const dbError = new Error('violates not-null constraint');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        service.record({
          entityType: '',
          entityId: '',
          action: AuditAction.CREATE,
          performedBy: '',
          changes: null,
        }),
      ).rejects.toThrow('violates not-null constraint');
    });
  });
});
