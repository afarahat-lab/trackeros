import { NotificationRepository } from 'modules/notification';
import { pool } from 'shared/db/connection';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'notif-1',
    recipient_id: 'emp-1',
    type: 'leave_submitted',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted.',
    related_entity_type: 'leave_request',
    related_entity_id: 'lr-1',
    status: 'PENDING',
    created_at: '2026-08-01T00:00:00.000Z',
    read_at: null,
    ...overrides,
  };
}

describe('NotificationRepository', () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    repo = new NotificationRepository();
    mockQuery.mockReset();
  });

  describe('findByRecipientId', () => {
    it('should return notifications ordered by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({ id: 'notif-2', created_at: '2026-08-02T00:00:00.000Z' }),
          makeRow({ id: 'notif-1', created_at: '2026-08-01T00:00:00.000Z' }),
        ],
      });

      const results = await repo.findByRecipientId('emp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC`,
        ['emp-1'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('notif-2');
      expect(results[1].id).toBe('notif-1');
    });

    it('should return an empty array when no notifications exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByRecipientId('emp-1');

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new notification and return it', async () => {
      const input = {
        recipientId: 'emp-1',
        type: 'leave_submitted',
        title: 'Leave Request Submitted',
        message: 'Your leave request has been submitted.',
        relatedEntityType: 'leave_request',
        relatedEntityId: 'lr-1',
        status: 'PENDING' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-new',
            recipient_id: 'emp-1',
            type: 'leave_submitted',
            title: 'Leave Request Submitted',
            message: 'Your leave request has been submitted.',
            related_entity_type: 'leave_request',
            related_entity_id: 'lr-1',
            status: 'PENDING',
            created_at: '2026-08-01T00:00:00.000Z',
            read_at: null,
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['emp-1', 'leave_submitted', 'Leave Request Submitted', 'Your leave request has been submitted.', 'leave_request', 'lr-1', 'PENDING'],
      );
      expect(result.id).toBe('notif-new');
      expect(result.recipientId).toBe('emp-1');
      expect(result.type).toBe('leave_submitted');
      expect(result.title).toBe('Leave Request Submitted');
      expect(result.message).toBe('Your leave request has been submitted.');
      expect(result.relatedEntityType).toBe('leave_request');
      expect(result.relatedEntityId).toBe('lr-1');
      expect(result.status).toBe('PENDING');
      expect(result.createdAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
      expect(result.readAt).toBeNull();
    });

    it('should handle null relatedEntityType and relatedEntityId', async () => {
      const input = {
        recipientId: 'emp-1',
        type: 'system',
        title: 'System Notification',
        message: 'A system event occurred.',
        relatedEntityType: null,
        relatedEntityId: null,
        status: 'PENDING' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-sys',
            recipient_id: 'emp-1',
            type: 'system',
            title: 'System Notification',
            message: 'A system event occurred.',
            related_entity_type: null,
            related_entity_id: null,
            status: 'PENDING',
            created_at: '2026-08-01T00:00:00.000Z',
            read_at: null,
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        ['emp-1', 'system', 'System Notification', 'A system event occurred.', null, null, 'PENDING'],
      );
      expect(result.relatedEntityType).toBeNull();
      expect(result.relatedEntityId).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should set status to READ and read_at to a timestamp', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            status: 'READ',
            read_at: '2026-08-01T12:00:00.000Z',
          }),
        ],
      });

      const result = await repo.markAsRead('notif-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE notifications
       SET status = 'READ', read_at = NOW()
       WHERE id = $1
       RETURNING *`,
        ['notif-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('READ');
      expect(result!.readAt).toEqual(new Date('2026-08-01T12:00:00.000Z'));
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.markAsRead('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update the status to SENT', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ status: 'SENT' })],
      });

      const result = await repo.updateStatus('notif-1', 'SENT');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE notifications
       SET status = $1
       WHERE id = $2
       RETURNING *`,
        ['SENT', 'notif-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('SENT');
    });

    it('should update the status to ARCHIVED', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ status: 'ARCHIVED' })],
      });

      const result = await repo.updateStatus('notif-1', 'ARCHIVED');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE notifications
       SET status = $1
       WHERE id = $2
       RETURNING *`,
        ['ARCHIVED', 'notif-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('ARCHIVED');
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', 'SENT');

      expect(result).toBeNull();
    });
  });
});
