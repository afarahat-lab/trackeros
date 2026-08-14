import { PgNotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Notification } from '../../../../src/modules/notification/notification.model';
import { NotificationType, NotificationStatus } from '../../../../src/shared/types/leave.types';
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
    id: 'notif-001',
    recipient_id: 'emp-001',
    type: 'LEAVE_SUBMITTED',
    title: 'Leave Submitted',
    message: 'Your leave request has been submitted.',
    related_entity_type: 'LeaveRequest',
    related_entity_id: 'lr-001',
    status: 'PENDING',
    created_at: '2026-06-01T00:00:00.000Z',
    read_at: null,
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-001',
    recipientId: 'emp-001',
    type: NotificationType.LEAVE_SUBMITTED,
    title: 'Leave Submitted',
    message: 'Your leave request has been submitted.',
    relatedEntityType: 'LeaveRequest',
    relatedEntityId: 'lr-001',
    status: NotificationStatus.PENDING,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    readAt: null,
    ...overrides,
  };
}

describe('PgNotificationRepository', () => {
  let repo: PgNotificationRepository;

  beforeEach(() => {
    repo = new PgNotificationRepository();
    mockQuery.mockReset();
  });

  describe('create', () => {
    const input = {
      recipientId: 'emp-001',
      type: NotificationType.LEAVE_SUBMITTED,
      title: 'Leave Submitted',
      message: 'Your leave request has been submitted.',
      relatedEntityType: 'LeaveRequest' as const,
      relatedEntityId: 'lr-001',
      status: NotificationStatus.PENDING,
    };

    it('persists a new notification and returns the entity with server-generated fields', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'emp-001',
          'LEAVE_SUBMITTED',
          'Leave Submitted',
          'Your leave request has been submitted.',
          'LeaveRequest',
          'lr-001',
          'PENDING',
        ],
      );
      expect(result).toEqual(makeNotification());
    });

    it('persists a notification with null relatedEntityType and relatedEntityId', async () => {
      const row = makeRow({ related_entity_type: null, related_entity_id: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        ...input,
        relatedEntityType: null,
        relatedEntityId: null,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'emp-001',
          'LEAVE_SUBMITTED',
          'Leave Submitted',
          'Your leave request has been submitted.',
          null,
          null,
          'PENDING',
        ],
      );
      expect(result.relatedEntityType).toBeNull();
      expect(result.relatedEntityId).toBeNull();
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

  describe('findByRecipientId', () => {
    it('returns notifications for the recipient ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'notif-002', created_at: '2026-06-02T00:00:00.000Z' }),
        makeRow({ id: 'notif-001', created_at: '2026-06-01T00:00:00.000Z' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByRecipientId('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
        ['emp-001'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-002');
      expect(result[1].id).toBe('notif-001');
    });

    it('returns an empty array when no notifications exist for the recipient', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByRecipientId('emp-999');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByRecipientId('emp-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('markAsSent', () => {
    it('updates status to SENT and returns the refreshed entity', async () => {
      const updatedRow = makeRow({ status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.markAsSent('notif-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [NotificationStatus.SENT, 'notif-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(NotificationStatus.SENT);
    });

    it('returns null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.markAsSent('notif-999');

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow({ status: 'SENT' })] }) };
      await repo.markAsSent('notif-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('updates status to READ, stamps read_at, and returns the refreshed entity', async () => {
      const updatedRow = makeRow({
        status: 'READ',
        read_at: '2026-06-15T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.markAsRead('notif-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [NotificationStatus.READ, 'notif-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(NotificationStatus.READ);
      expect(result!.readAt).toEqual(new Date('2026-06-15T00:00:00.000Z'));
    });

    it('returns null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.markAsRead('notif-999');

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [makeRow({ status: 'READ', read_at: '2026-06-15T00:00:00.000Z' })],
        }),
      };
      await repo.markAsRead('notif-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('rowToNotification (via create result)', () => {
    it('converts date strings to Date objects', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-001',
        type: NotificationType.LEAVE_SUBMITTED,
        title: 'Leave Submitted',
        message: 'Your leave request has been submitted.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-001',
        status: NotificationStatus.PENDING,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('casts status to NotificationStatus enum', async () => {
      const row = makeRow({ status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-001',
        type: NotificationType.LEAVE_SUBMITTED,
        title: 'Leave Submitted',
        message: 'Your leave request has been submitted.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-001',
        status: NotificationStatus.SENT,
      });

      expect(result.status).toBe(NotificationStatus.SENT);
    });

    it('casts type to NotificationType enum', async () => {
      const row = makeRow({ type: 'BALANCE_EXHAUSTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-001',
        type: NotificationType.BALANCE_EXHAUSTED,
        title: 'Balance Exhausted',
        message: 'Your leave balance has been exhausted.',
        relatedEntityType: 'LeaveBalance',
        relatedEntityId: 'bal-001',
        status: NotificationStatus.PENDING,
      });

      expect(result.type).toBe(NotificationType.BALANCE_EXHAUSTED);
    });

    it('leaves readAt as null when not set', async () => {
      const row = makeRow({ read_at: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-001',
        type: NotificationType.LEAVE_SUBMITTED,
        title: 'Leave Submitted',
        message: 'Your leave request has been submitted.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-001',
        status: NotificationStatus.PENDING,
      });

      expect(result.readAt).toBeNull();
    });
  });
});
