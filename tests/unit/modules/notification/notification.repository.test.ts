import { PgNotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Notification } from '../../../../src/modules/notification/notification.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeNotificationRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'notif-001',
    recipient_id: 'emp-001',
    type: 'LEAVE_SUBMITTED',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted.',
    related_entity_type: 'LeaveRequest',
    related_entity_id: 'lr-001',
    status: 'PENDING',
    created_at: now,
    read_at: null,
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const now = new Date();
  return {
    id: 'notif-001',
    recipientId: 'emp-001',
    type: 'LEAVE_SUBMITTED',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted.',
    relatedEntityType: 'LeaveRequest',
    relatedEntityId: 'lr-001',
    status: 'PENDING',
    createdAt: now,
    readAt: null,
    ...overrides,
  };
}

describe('PgNotificationRepository', () => {
  let repo: PgNotificationRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgNotificationRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const row = makeNotificationRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('notif-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE id = $1',
        ['notif-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('notif-001');
      expect(result!.recipientId).toBe('emp-001');
      expect(result!.type).toBe('LEAVE_SUBMITTED');
      expect(result!.title).toBe('Leave Request Submitted');
      expect(result!.message).toBe('Your leave request has been submitted.');
      expect(result!.relatedEntityType).toBe('LeaveRequest');
      expect(result!.relatedEntityId).toBe('lr-001');
      expect(result!.status).toBe('PENDING');
      expect(result!.readAt).toBeNull();
    });

    it('should return null when notification is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, recipient_id: 'emp-001' }], rowCount: 1 });

      const result = await repo.findById('notif-001');

      expect(result).toBeNull();
    });

    it('should return null when type is invalid', async () => {
      const row = makeNotificationRow({ type: 'INVALID_TYPE' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('notif-001');

      expect(result).toBeNull();
    });

    it('should return null when status is invalid', async () => {
      const row = makeNotificationRow({ status: 'INVALID_STATUS' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('notif-001');

      expect(result).toBeNull();
    });

    it('should return null when read_at is not null and not a Date', async () => {
      const row = makeNotificationRow({ read_at: '2025-01-15' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('notif-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('notif-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByRecipient', () => {
    it('should return notifications for a recipient', async () => {
      const row1 = makeNotificationRow({ id: 'notif-001' });
      const row2 = makeNotificationRow({ id: 'notif-002', type: 'LEAVE_APPROVED', status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByRecipient('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE recipient_id = $1',
        ['emp-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-001');
      expect(result[1].id).toBe('notif-002');
    });

    it('should filter by status when provided', async () => {
      const row = makeNotificationRow({ id: 'notif-001', status: 'PENDING' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByRecipient('emp-001', 'PENDING');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE recipient_id = $1 AND status = $2',
        ['emp-001', 'PENDING']
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-001');
    });

    it('should return an empty array when no notifications found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByRecipient('unknown');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeNotificationRow({ id: 'notif-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByRecipient('emp-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByRecipient('emp-001')).rejects.toThrow('query failed');
    });
  });

  describe('create', () => {
    it('should create a notification and return it', async () => {
      const input = {
        recipientId: 'emp-001',
        type: 'LEAVE_SUBMITTED' as const,
        title: 'Leave Request Submitted',
        message: 'Your leave request has been submitted.',
        relatedEntityType: 'LeaveRequest' as const,
        relatedEntityId: 'lr-001',
        status: 'PENDING' as const,
        readAt: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeNotificationRow()],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO notifications');
      expect(queryText).toContain('RETURNING *');
      expect(result.recipientId).toBe('emp-001');
      expect(result.type).toBe('LEAVE_SUBMITTED');
      expect(result.title).toBe('Leave Request Submitted');
      expect(result.message).toBe('Your leave request has been submitted.');
      expect(result.relatedEntityType).toBe('LeaveRequest');
      expect(result.relatedEntityId).toBe('lr-001');
      expect(result.status).toBe('PENDING');
      expect(result.readAt).toBeNull();
    });

    it('should generate id and createdAt server-side', async () => {
      const input = {
        recipientId: 'emp-001',
        type: 'LEAVE_APPROVED' as const,
        title: 'Leave Approved',
        message: 'Your leave has been approved.',
        relatedEntityType: 'LeaveRequest' as const,
        relatedEntityId: 'lr-002',
        status: 'PENDING' as const,
        readAt: null,
      };

      const row = makeNotificationRow({
        id: 'generated-uuid',
        type: 'LEAVE_APPROVED',
        title: 'Leave Approved',
        message: 'Your leave has been approved.',
        related_entity_id: 'lr-002',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.create(input);

      expect(result.id).toBe('generated-uuid');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          recipientId: 'emp-001',
          type: 'LEAVE_SUBMITTED',
          title: 'Test',
          message: 'Test message',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-001',
          status: 'PENDING',
          readAt: null,
        })
      ).rejects.toThrow('Failed to create notification');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          recipientId: 'emp-001',
          type: 'LEAVE_SUBMITTED',
          title: 'Test',
          message: 'Test message',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-001',
          status: 'PENDING',
          readAt: null,
        })
      ).rejects.toThrow('Failed to create notification');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(
        repo.create({
          recipientId: 'emp-001',
          type: 'LEAVE_SUBMITTED',
          title: 'Test',
          message: 'Test message',
          relatedEntityType: 'LeaveRequest',
          relatedEntityId: 'lr-001',
          status: 'PENDING',
          readAt: null,
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('updateStatus', () => {
    it('should update the notification status and return the updated notification', async () => {
      const row = makeNotificationRow({ id: 'notif-001', status: 'SENT' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.updateStatus('notif-001', 'SENT');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE notifications SET status = $1 WHERE id = $2 RETURNING *',
        ['SENT', 'notif-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('notif-001');
      expect(result!.status).toBe('SENT');
    });

    it('should return null when notification does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.updateStatus('nonexistent', 'SENT');

      expect(result).toBeNull();
    });

    it('should return null when returned row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      const result = await repo.updateStatus('notif-001', 'SENT');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(repo.updateStatus('notif-001', 'SENT')).rejects.toThrow('update failed');
    });
  });

  describe('markAsRead', () => {
    it('should set status to READ and readAt to current timestamp', async () => {
      const readAt = new Date();
      const row = makeNotificationRow({ id: 'notif-001', status: 'READ', read_at: readAt });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.markAsRead('notif-001');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      const queryParams = mockQuery.mock.calls[0][1];
      expect(queryText).toBe(
        'UPDATE notifications SET status = $1, read_at = $2 WHERE id = $3 RETURNING *'
      );
      expect(queryParams[0]).toBe('READ');
      expect(queryParams[1]).toBeInstanceOf(Date);
      expect(queryParams[2]).toBe('notif-001');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('READ');
      expect(result!.readAt).toBeInstanceOf(Date);
    });

    it('should return null when notification does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.markAsRead('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when returned row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      const result = await repo.markAsRead('notif-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(repo.markAsRead('notif-001')).rejects.toThrow('update failed');
    });
  });

  describe('findByRelatedEntity', () => {
    it('should return notifications for a given entity', async () => {
      const row1 = makeNotificationRow({ id: 'notif-001' });
      const row2 = makeNotificationRow({ id: 'notif-002', type: 'LEAVE_APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByRelatedEntity('LeaveRequest', 'lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE related_entity_type = $1 AND related_entity_id = $2',
        ['LeaveRequest', 'lr-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-001');
      expect(result[1].id).toBe('notif-002');
    });

    it('should return an empty array when no notifications found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByRelatedEntity('LeaveRequest', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeNotificationRow({ id: 'notif-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByRelatedEntity('LeaveRequest', 'lr-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByRelatedEntity('LeaveRequest', 'lr-001')).rejects.toThrow('query failed');
    });
  });
});
