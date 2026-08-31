import { PoolClient } from 'pg';
import {
  AuditService,
  AuditLog,
  AuditLogQuery,
  IAuditLogRepository,
} from '../../../../src/modules/audit';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';
import { EntityType, AuditAction } from '../../../../src/shared/types';

describe('AuditService', () => {
  let repo: IAuditLogRepository;
  let createMock: jest.Mock;
  let findByEntityMock: jest.Mock;
  let findByPerformedAtMock: jest.Mock;
  let queryMock: jest.Mock;
  let uow: IUnitOfWork;
  let service: AuditService;

  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    createMock = jest.fn();
    findByEntityMock = jest.fn();
    findByPerformedAtMock = jest.fn();
    queryMock = jest.fn();

    repo = {
      create: createMock,
      findById: jest.fn(),
      findByEntity: findByEntityMock,
      findByPerformedAt: findByPerformedAtMock,
      query: queryMock,
    };

    uow = {
      withTransaction: jest.fn(async (fn) => fn(fakeClient)),
    };

    service = new AuditService(
      repo as unknown as import('../../../../src/modules/audit/audit.repository').PgAuditLogRepository,
      uow,
    );
  });

  describe('record', () => {
    it('assigns id/createdAt/updatedAt and delegates to repo.create inside a transaction', async () => {
      const input = {
        entityType: EntityType.LEAVE_REQUEST,
        entityId: 'req-1',
        action: AuditAction.CREATE,
        oldValues: null,
        newValues: { status: 'PENDING' },
        performedBy: 'user-1',
        performedAt: new Date('2026-01-01T00:00:00Z'),
      };

      let received: AuditLog | undefined;
      createMock.mockImplementation(async (entry: AuditLog) => {
        received = entry;
        return entry;
      });

      const result = await service.record(input);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(received).toBeDefined();
      expect(received!.id).toBeTruthy();
      expect(received!.createdAt).toBeInstanceOf(Date);
      expect(received!.updatedAt).toBeInstanceOf(Date);
      expect(received!.entityType).toBe(EntityType.LEAVE_REQUEST);
      expect(received!.entityId).toBe('req-1');
      expect(received!.action).toBe(AuditAction.CREATE);
      expect(received!.performedBy).toBe('user-1');
      expect(received).toBe(result);

      // second argument to repo.create is the transactional client (not undefined)
      expect(createMock.mock.calls[0][1]).toBe(fakeClient);
    });

    it('delegates directly to repo.create when an external client is supplied (no withTransaction)', async () => {
      const input = {
        entityType: EntityType.EMPLOYEE,
        entityId: 'emp-1',
        action: AuditAction.UPDATE,
        oldValues: { name: 'old' },
        newValues: { name: 'new' },
        performedBy: 'user-2',
        performedAt: new Date('2026-01-01T00:00:00Z'),
      };

      createMock.mockImplementation(async (entry: AuditLog) => entry);

      await service.record(input, fakeClient);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock.mock.calls[0][1]).toBe(fakeClient);
      expect(uow.withTransaction).not.toHaveBeenCalled();
    });
  });

  it('findByEntity delegates to repo.findByEntity', async () => {
    const expected = [] as AuditLog[];
    findByEntityMock.mockResolvedValue(expected);

    const result = await service.findByEntity(EntityType.LEAVE_POLICY, 'pol-1');

    expect(findByEntityMock).toHaveBeenCalledWith(
      EntityType.LEAVE_POLICY,
      'pol-1',
      undefined,
    );
    expect(result).toBe(expected);
  });

  it('findByPerformedAt delegates to repo.findByPerformedAt', async () => {
    const expected = [] as AuditLog[];
    findByPerformedAtMock.mockResolvedValue(expected);

    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-02-01T00:00:00Z');
    const result = await service.findByPerformedAt(from, to);

    expect(findByPerformedAtMock).toHaveBeenCalledWith(from, to, undefined);
    expect(result).toBe(expected);
  });

  it('query delegates the AuditLogQuery object through to repo.query', async () => {
    const expected = [] as AuditLog[];
    queryMock.mockResolvedValue(expected);

    const q: AuditLogQuery = {
      entityType: EntityType.NOTIFICATION,
      entityId: 'notif-1',
      performedBy: 'user-3',
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-02-01T00:00:00Z'),
    };
    const result = await service.query(q, fakeClient);

    expect(queryMock).toHaveBeenCalledWith(q, fakeClient);
    expect(result).toBe(expected);
  });
});
