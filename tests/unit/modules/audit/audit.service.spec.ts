import type { PoolClient } from 'pg';

import { AuditAction } from '../../../../src/shared/types';
import { AuditService } from '../../../../src/modules/audit/audit.service';
import type { IAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditLog, AuditLogInput } from '../../../../src/modules/audit/audit.model';

const auditFixture = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'audit-1',
  entityType: 'leave_request',
  entityId: 'lr-1',
  action: AuditAction.CREATE,
  oldValues: null,
  newValues: { status: 'PENDING' },
  performedBy: 'emp-1',
  performedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('AuditService', () => {
  let repository: IAuditLogRepository;
  let service: AuditService;

  beforeEach(() => {
    repository = {
      record: jest.fn(),
      findByEntity: jest.fn(),
      findByActor: jest.fn(),
      findByTimeRange: jest.fn(),
    };
    service = new AuditService(repository);
  });

  it('defaults to the concrete AuditLogRepository when none is injected', () => {
    const defaultService = new AuditService();
    expect(defaultService).toBeInstanceOf(AuditService);
  });

  describe('record', () => {
    it('delegates to the repository and returns the persisted entry', async () => {
      const input: AuditLogInput = {
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: AuditAction.CREATE,
        newValues: { status: 'PENDING' },
      };
      const persisted = auditFixture();
      (repository.record as jest.Mock).mockResolvedValueOnce(persisted);

      const client = {} as PoolClient;
      await expect(service.record(input, client)).resolves.toBe(persisted);
      expect(repository.record).toHaveBeenCalledWith(input, client);
    });

    it('records without a client for single-step callers', async () => {
      const persisted = auditFixture();
      (repository.record as jest.Mock).mockResolvedValueOnce(persisted);

      await service.record({ entityType: 't', entityId: 'e', action: AuditAction.UPDATE });
      expect(repository.record).toHaveBeenCalledTimes(1);
      expect((repository.record as jest.Mock).mock.calls[0][1]).toBeUndefined();
    });
  });

  describe('findByEntity', () => {
    it('delegates to the repository', async () => {
      (repository.findByEntity as jest.Mock).mockResolvedValueOnce([auditFixture()]);

      await expect(service.findByEntity('leave_request', 'lr-1')).resolves.toHaveLength(1);
      expect(repository.findByEntity).toHaveBeenCalledWith('leave_request', 'lr-1');
    });
  });

  describe('findByActor', () => {
    it('delegates to the repository', async () => {
      (repository.findByActor as jest.Mock).mockResolvedValueOnce([]);

      await expect(service.findByActor('emp-1')).resolves.toEqual([]);
      expect(repository.findByActor).toHaveBeenCalledWith('emp-1');
    });
  });

  describe('findByTimeRange', () => {
    it('delegates to the repository', async () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-31T00:00:00.000Z');
      (repository.findByTimeRange as jest.Mock).mockResolvedValueOnce([]);

      await expect(service.findByTimeRange(from, to)).resolves.toEqual([]);
      expect(repository.findByTimeRange).toHaveBeenCalledWith(from, to);
    });
  });
});
