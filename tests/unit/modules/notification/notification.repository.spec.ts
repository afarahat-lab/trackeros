import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { NotificationNotFoundError } from '../../../../src/modules/notification/notification.errors';
import { NotificationStatus } from '../../../../src/shared/types';
import type { CreateNotificationInput } from '../../../../src/modules/notification/notification.model';

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
    poolQuery.mockReset();
    repo = new NotificationRepository();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(input: CreateNotificationInput, id = 'notif-1'): Row {
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
    };
  }

  function expectedMapper(input: CreateNotificationInput, id = 'notif-1'): Row {
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
    };
  }

  describe('create', () => {
    it('persists a notification and returns the mapped Notification', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave approved',
        message: 'Your leave request was approved',
        relatedEntityType: 'LEAVE_REQUEST',
        relatedEntityId: 'req-1',
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result).toEqual(expectedMapper(input));
      expect(result.status).toBe(NotificationStatus.PENDING);
      expect(result.readAt).toBeNull();
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO notifications');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('emp-1');
      expect(params[2]).toBe('LEAVE_REQUEST_APPROVED');
      expect(params[5]).toBe('LEAVE_REQUEST');
      expect(params[6]).toBe('req-1');
      expect(params[7]).toBe(NotificationStatus.PENDING);
      expect(params[9]).toBeNull();
    });

    it('defaults status to PENDING and both entity fields to null', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'ANNOUNCEMENT',
        title: 'Welcome',
        message: 'Welcome to the team',
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result.status).toBe(NotificationStatus.PENDING);
      expect(result.relatedEntityType).toBeNull();
      expect(result.relatedEntityId).toBeNull();

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
      expect(params[7]).toBe(NotificationStatus.PENDING);
    });

    it('throws a UniqueConstraintError on a 23505 violation', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'ANNOUNCEMENT',
        title: 'Welcome',
        message: 'Welcome to the team',
      };
      const err = Object.assign(new Error('duplicate key'), { code: '23505' });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_NOTIFICATION' });
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'ANNOUNCEMENT',
        title: 'Welcome',
        message: 'Welcome to the team',
      };

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
      expect(poolQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    });

    it('returns all mapped notifications for a recipient', async () => {
      const first: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
      };
      const second: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'B',
        title: 'B title',
        message: 'B message',
      };
      mockReturn([toRow(first, 'notif-a'), toRow(second, 'notif-b')]);

      const result = await repo.findByRecipient('emp-1');
      expect(result.map((r) => r.id)).toEqual(['notif-a', 'notif-b']);
      expect(result[0].recipientId).toBe('emp-1');
    });
  });

  describe('findByEntity', () => {
    it('returns an empty list when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByEntity('LEAVE_REQUEST', 'req-1')).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('related_entity_type = $1 AND related_entity_id = $2'),
        ['LEAVE_REQUEST', 'req-1']
      );
    });

    it('returns matching notifications for an entity', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
        relatedEntityType: 'LEAVE_REQUEST',
        relatedEntityId: 'req-1',
      };
      mockReturn([toRow(input)]);

      const result = await repo.findByEntity('LEAVE_REQUEST', 'req-1');
      expect(result).toHaveLength(1);
      expect(result[0].relatedEntityType).toBe('LEAVE_REQUEST');
      expect(result[0].relatedEntityId).toBe('req-1');
    });
  });

  describe('updateStatus', () => {
    it('sets the supplied status and returns the updated notification', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
      };
      mockReturn([{ ...toRow(input), status: NotificationStatus.SENT }]);

      const result = await repo.updateStatus('notif-1', NotificationStatus.SENT);

      expect(result.status).toBe(NotificationStatus.SENT);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['notif-1', NotificationStatus.SENT]
      );
    });

    it('throws NotificationNotFoundError when no row matches', async () => {
      mockReturn([]);
      await expect(
        repo.updateStatus('notif-missing', NotificationStatus.SENT)
      ).rejects.toBeInstanceOf(NotificationNotFoundError);
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
      };
      client.query.mockResolvedValueOnce({
        rows: [{ ...toRow(input), status: NotificationStatus.ARCHIVED }],
      });

      const result = await repo.updateStatus(
        'notif-1',
        NotificationStatus.ARCHIVED,
        (client as unknown) as never
      );

      expect(result.status).toBe(NotificationStatus.ARCHIVED);
      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('sets status READ and readAt now', async () => {
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
      };
      const readAt = new Date('2026-03-02T09:00:00.000Z');
      mockReturn([
        { ...toRow(input), status: NotificationStatus.READ, read_at: readAt },
      ]);

      const result = await repo.markRead('notif-1');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.readAt).toEqual(readAt);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('status = $2');
      expect(sql).toContain('read_at = $3');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('notif-1');
      expect(params[1]).toBe(NotificationStatus.READ);
      expect(params[2]).toBeInstanceOf(Date);
    });

    it('throws NotificationNotFoundError when no row matches', async () => {
      mockReturn([]);
      await expect(repo.markRead('notif-missing')).rejects.toBeInstanceOf(
        NotificationNotFoundError
      );
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'A',
        title: 'A title',
        message: 'A message',
      };
      client.query.mockResolvedValueOnce({
        rows: [
          {
            ...toRow(input),
            status: NotificationStatus.READ,
            read_at: now,
          },
        ],
      });

      await repo.markRead('notif-1', (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });
});
