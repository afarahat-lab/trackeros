import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<{
  id: string;
  recipient_id: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  title: string;
  message: string;
  related_entity_type: 'LeaveRequest';
  related_entity_id: string;
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
  created_at: Date;
  read_at: Date | null;
}> = {}) {
  return {
    id: overrides.id ?? 'notif-1',
    recipient_id: overrides.recipient_id ?? 'emp-1',
    type: overrides.type ?? 'LEAVE_SUBMITTED',
    title: overrides.title ?? 'Leave Request Submitted',
    message: overrides.message ?? 'Your leave request has been submitted.',
    related_entity_type: overrides.related_entity_type ?? 'LeaveRequest',
    related_entity_id: overrides.related_entity_id ?? 'lr-1',
    status: overrides.status ?? 'PENDING',
    created_at: overrides.created_at ?? new Date('2026-06-01T12:00:00Z'),
    read_at: overrides.read_at ?? null,
  };
}

const COLUMNS = [
  'id',
  'recipient_id',
  'type',
  'title',
  'message',
  'related_entity_type',
  'related_entity_id',
  'status',
  'created_at',
  'read_at',
].join(', ');

describe('NotificationRepository', () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new NotificationRepository();
  });

  describe('create', () => {
    it('should insert a notification with PENDING status and return it', async () => {
      const row = makeRow({
        id: 'notif-new',
        recipient_id: 'emp-1',
        type: 'LEAVE_SUBMITTED',
        title: 'Leave Submitted',
        message: 'Your leave was submitted.',
        related_entity_type: 'LeaveRequest',
        related_entity_id: 'lr-1',
        status: 'PENDING',
        read_at: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-1',
        type: 'LEAVE_SUBMITTED',
        title: 'Leave Submitted',
        message: 'Your leave was submitted.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-1',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'emp-1',
          'LEAVE_SUBMITTED',
          'Leave Submitted',
          'Your leave was submitted.',
          'LeaveRequest',
          'lr-1',
        ],
      );
      expect(result.id).toBe('notif-new');
      expect(result.recipientId).toBe('emp-1');
      expect(result.type).toBe('LEAVE_SUBMITTED');
      expect(result.title).toBe('Leave Submitted');
      expect(result.message).toBe('Your leave was submitted.');
      expect(result.relatedEntityType).toBe('LeaveRequest');
      expect(result.relatedEntityId).toBe('lr-1');
      expect(result.status).toBe('PENDING');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.readAt).toBeNull();
    });

    it('should always set status to PENDING regardless of caller intent', async () => {
      const row = makeRow({
        id: 'notif-1',
        status: 'PENDING',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-1',
        type: 'LEAVE_APPROVED',
        title: 'Approved',
        message: 'Approved.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-1',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("'PENDING'"),
        expect.anything(),
      );
      expect(result.status).toBe('PENDING');
    });

    it('should set read_at to NULL on creation', async () => {
      const row = makeRow({ id: 'notif-1', read_at: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        recipientId: 'emp-1',
        type: 'LEAVE_REJECTED',
        title: 'Rejected',
        message: 'Rejected.',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: 'lr-1',
      });

      expect(result.readAt).toBeNull();
    });
  });

  describe('findByRecipient', () => {
    it('should return notifications for a recipient ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'notif-2', created_at: new Date('2026-06-02T00:00:00Z') }),
        makeRow({ id: 'notif-1', created_at: new Date('2026-06-01T00:00:00Z') }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByRecipient('emp-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC`,
        ['emp-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-2');
      expect(result[1].id).toBe('notif-1');
    });

    it('should return empty array when recipient has no notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByRecipient('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('markAsSent', () => {
    it('should transition notification status to SENT and return it', async () => {
      const row = makeRow({ id: 'notif-1', status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.markAsSent('notif-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE notifications SET status = 'SENT' WHERE id = $1
       RETURNING ${COLUMNS}`,
        ['notif-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('notif-1');
      expect(result!.status).toBe('SENT');
    });

    it('should return null when notification does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.markAsSent('nonexistent');

      expect(result).toBeNull();
    });

    it('should be idempotent — re-marking an already-SENT notification succeeds', async () => {
      const row = makeRow({ id: 'notif-1', status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.markAsSent('notif-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('SENT');
    });
  });

  describe('markAsRead', () => {
    it('should transition notification status to READ and set read_at', async () => {
      const row = makeRow({
        id: 'notif-1',
        status: 'READ',
        read_at: new Date('2026-06-02T12:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.markAsRead('notif-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE notifications SET status = 'READ', read_at = NOW() WHERE id = $1
       RETURNING ${COLUMNS}`,
        ['notif-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('notif-1');
      expect(result!.status).toBe('READ');
      expect(result!.readAt).toBeInstanceOf(Date);
    });

    it('should return null when notification does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.markAsRead('nonexistent');

      expect(result).toBeNull();
    });

    it('should be idempotent — re-marking an already-READ notification re-stamps read_at', async () => {
      const row = makeRow({
        id: 'notif-1',
        status: 'READ',
        read_at: new Date('2026-06-03T00:00:00Z'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.markAsRead('notif-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('READ');
      expect(result!.readAt).toBeInstanceOf(Date);
    });
  });

  describe('createBatch', () => {
    it('should insert multiple notifications in a single query and return them', async () => {
      const rows = [
        makeRow({ id: 'notif-1', recipient_id: 'emp-1', type: 'LEAVE_SUBMITTED' }),
        makeRow({ id: 'notif-2', recipient_id: 'mgr-1', type: 'LEAVE_SUBMITTED' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.createBatch([
        {
          recipientId: 'emp-1',
          type: 'LEAVE_SUBMITTED',
          title: 'Leave Submitted',
          message: 'Your leave was submitted.',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-1',
        },
        {
          recipientId: 'mgr-1',
          type: 'LEAVE_SUBMITTED',
          title: 'New Leave Request',
          message: 'A team member submitted a leave request.',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-1',
        },
      ]);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [
          'emp-1', 'LEAVE_SUBMITTED', 'Leave Submitted', 'Your leave was submitted.', 'LeaveRequest', 'lr-1',
          'mgr-1', 'LEAVE_SUBMITTED', 'New Leave Request', 'A team member submitted a leave request.', 'LeaveRequest', 'lr-1',
        ],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].status).toBe('PENDING');
      expect(result[1].id).toBe('notif-2');
      expect(result[1].status).toBe('PENDING');
    });

    it('should return empty array when given an empty array', async () => {
      const result = await repo.createBatch([]);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should default all rows to PENDING status', async () => {
      const rows = [
        makeRow({ id: 'notif-1', status: 'PENDING' }),
        makeRow({ id: 'notif-2', status: 'PENDING' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.createBatch([
        {
          recipientId: 'emp-1',
          type: 'LEAVE_APPROVED',
          title: 'Approved',
          message: 'Approved.',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-1',
        },
        {
          recipientId: 'emp-2',
          type: 'LEAVE_REJECTED',
          title: 'Rejected',
          message: 'Rejected.',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-2',
        },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PENDING');
      expect(result[1].status).toBe('PENDING');
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new NotificationRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findByRecipient('emp-1');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
