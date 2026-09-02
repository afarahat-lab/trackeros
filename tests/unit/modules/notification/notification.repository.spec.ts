import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { NotificationNotFoundError } from '../../../../src/modules/notification/notification.repository';
import { RepositoryError } from '../../../../src/modules/employee';
import { NotificationStatus } from '../../../../src/shared/types';
import type {
  Notification,
  CreateNotificationInput,
} from '../../../../src/modules/notification/notification.model';

const poolQuery = jest.fn();

jest.mock('../../../../src/shared/db', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

interface Row {
  [key: string]: unknown;
}

interface FakeQueryResult {
  rows: Row[];
}

interface FakeClient {
  query: jest.Mock<Promise<FakeQueryResult>, [string, unknown[]]>;
}

describe('NotificationRepository', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  let repo: NotificationRepository;

  beforeEach(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => now as unknown as Date);
    poolQuery.mockReset();
    repo = new NotificationRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(
    input: CreateNotificationInput,
    id = 'notif-1',
    overrides: Partial<Row> = {}
  ): Row {
    return {
      id,
      recipient_id: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      related_entity_type: input.relatedEntityType ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      status: input.status ?? NotificationStatus.PENDING,
      created_at: now,
      read_at: null,
      ...overrides,
    };
  }

  function expectedMapper(
    input: CreateNotificationInput,
    id = 'notif-1',
    overrides: Partial<Notification> = {}
  ): Notification {
    return {
      id,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      status: input.status ?? NotificationStatus.PENDING,
      createdAt: now,
      readAt: null,
      ...overrides,
    };
  }

  function makeInput(overrides: Partial<CreateNotificationInput> = {}): CreateNotificationInput {
    return {
      recipientId: 'emp-1',
      type: 'LEAVE_APPROVED',
      title: 'Leave approved',
      message: 'Your leave request was approved',
      ...overrides,
    };
  }

  describe('create', () => {
    it('persists a notification and returns the mapped Notification', async () => {
      const input = makeInput({
        relatedEntityType: 'leave_request',
        relatedEntityId: 'lr-1',
      });

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result).toEqual(expectedMapper(input));
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO notifications');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toMatch(/^.+$/);
      expect(params[1]).toBe('emp-1');
      expect(params[2]).toBe('LEAVE_APPROVED');
      expect(params[3]).toBe('Leave approved');
      expect(params[4]).toBe('Your leave request was approved');
      expect(params[5]).toBe('leave_request');
      expect(params[6]).toBe('lr-1');
      expect(params[7]).toBe(NotificationStatus.PENDING);
      expect(params[8]).toBe(now);
      expect(params[9]).toBeNull();
    });

    it('defaults status to PENDING and readAt to null', async () => {
      const input = makeInput();

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result.status).toBe(NotificationStatus.PENDING);
      expect(result.readAt).toBeNull();

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[7]).toBe(NotificationStatus.PENDING);
      expect(params[9]).toBeNull();
    });

    it('rejects a mismatched relatedEntityType/relatedEntityId pair with INVALID_NOTIFICATION', async () => {
      await expect(
        repo.create(makeInput({ relatedEntityType: 'leave_request' }))
      ).rejects.toMatchObject({ code: 'INVALID_NOTIFICATION' });
      await expect(
        repo.create(makeInput({ relatedEntityId: 'lr-1' }))
      ).rejects.toMatchObject({ code: 'INVALID_NOTIFICATION' });
      expect(poolQuery).not.toHaveBeenCalled();
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input = makeInput({ relatedEntityType: 'leave_request', relatedEntityId: 'lr-1' });

      client.query.mockResolvedValueOnce({ rows: [toRow(input, 'notif-2')] });

      await repo.create(input, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByRecipient', () => {
    it('returns an empty list when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByRecipient('emp-1')).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE recipient_id = $1'),
        ['emp-1']
      );
    });

    it('returns all mapped notifications for a recipient ordered by created_at DESC, id ASC', async () => {
      const first = makeInput();
      const second = makeInput({ type: 'LEAVE_REJECTED', title: 'Leave rejected' });
      mockReturn([toRow(first, 'notif-a'), toRow(second, 'notif-b')]);

      const result = await repo.findByRecipient('emp-1');
      expect(result.map((r) => r.id)).toEqual(['notif-a', 'notif-b']);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY created_at DESC, id ASC');
    });
  });

  describe('findByEntity', () => {
    it('returns notifications scoped to an entity', async () => {
      const input = makeInput({ relatedEntityType: 'leave_request', relatedEntityId: 'lr-1' });
      mockReturn([toRow(input)]);

      const result = await repo.findByEntity('leave_request', 'lr-1');
      expect(result).toEqual([expectedMapper(input)]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('related_entity_type = $1 AND related_entity_id = $2'),
        ['leave_request', 'lr-1']
      );
    });
  });

  describe('updateStatus', () => {
    it('updates only status and returns the updated notification', async () => {
      const input = makeInput();
      mockReturn([toRow(input, 'notif-1', { status: NotificationStatus.READ })]);

      const result = await repo.updateStatus('notif-1', NotificationStatus.READ);

      expect(result.status).toBe(NotificationStatus.READ);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE notifications');
      expect(sql).toContain('SET status = $2');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('notif-1');
      expect(params[1]).toBe(NotificationStatus.READ);
    });

    it('throws NotificationNotFoundError when no row is affected', async () => {
      mockReturn([]);
      await expect(
        repo.updateStatus('notif-missing', NotificationStatus.READ)
      ).rejects.toBeInstanceOf(NotificationNotFoundError);
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input = makeInput();
      client.query.mockResolvedValueOnce({
        rows: [toRow(input, 'notif-2', { status: NotificationStatus.READ })],
      });

      await repo.updateStatus('notif-2', NotificationStatus.READ, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('sets status to READ and stamps read_at', async () => {
      const input = makeInput();
      mockReturn([
        toRow(input, 'notif-1', { status: NotificationStatus.READ, read_at: now }),
      ]);

      const result = await repo.markRead('notif-1');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.readAt).toEqual(now);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('SET status = $2, read_at = $3');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('notif-1');
      expect(params[1]).toBe(NotificationStatus.READ);
      expect(params[2]).toEqual(now);
    });

    it('throws NotificationNotFoundError when no row is affected', async () => {
      mockReturn([]);
      await expect(repo.markRead('notif-missing')).rejects.toBeInstanceOf(
        NotificationNotFoundError
      );
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input = makeInput();
      client.query.mockResolvedValueOnce({
        rows: [toRow(input, 'notif-2', { status: NotificationStatus.READ, read_at: now })],
      });

      await repo.markRead('notif-2', (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  it('exposes a RepositoryError-based NotificationNotFoundError', () => {
    expect(new NotificationNotFoundError('x')).toBeInstanceOf(RepositoryError);
  });
});
