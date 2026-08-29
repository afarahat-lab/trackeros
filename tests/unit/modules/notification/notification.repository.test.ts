jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgNotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Notification } from '../../../../src/modules/notification/notification.model';
import { NotFoundError } from '../../../../src/shared/types/errors';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n-1',
    recipient_id: 'emp-1',
    type: 'LEAVE_APPROVED',
    title: 'Leave approved',
    message: 'Your leave was approved',
    related_entity_type: 'LeaveRequest',
    related_entity_id: 'req-1',
    status: 'PENDING',
    created_at: new Date('2026-01-01T00:00:00Z'),
    read_at: null,
    ...overrides
  };
}

function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: 'n-1',
    recipientId: 'emp-1',
    type: 'LEAVE_APPROVED',
    title: 'Leave approved',
    message: 'Your leave was approved',
    relatedEntityType: 'LeaveRequest',
    relatedEntityId: 'req-1',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    readAt: null,
    ...overrides
  };
}

describe('PgNotificationRepository', () => {
  let repo: PgNotificationRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgNotificationRepository();
  });

  describe('mapRow status fallback', () => {
    it('preserves a recognized status', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ status: 'ARCHIVED' })] });

      const result = await repo.findById('n-1');

      expect(result?.status).toBe('ARCHIVED');
    });

    it('falls back to PENDING for an unknown status', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ status: 'MYSTERY' })] });

      const result = await repo.findById('n-1');

      expect(result?.status).toBe('PENDING');
    });
  });

  describe('create', () => {
    it('maps the row and preserves nullable related fields and readAt', async () => {
      queryMock.mockResolvedValue({
        rows: [
          makeRow({
            related_entity_type: null,
            related_entity_id: null,
            read_at: null
          })
        ]
      });

      const result = await repo.create(
        makeNotification({
          relatedEntityType: null,
          relatedEntityId: null,
          readAt: null
        })
      );

      expect(result.relatedEntityType).toBeNull();
      expect(result.relatedEntityId).toBeNull();
      expect(result.readAt).toBeNull();
    });

    it('uses the provided client when given', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [makeRow()] })
      };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeNotification(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns null when no row is present', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByRecipient', () => {
    it('maps a list ordered newest-first', async () => {
      queryMock.mockResolvedValue({
        rows: [makeRow({ id: 'n-2' }), makeRow({ id: 'n-1' })]
      });

      const results = await repo.findByRecipient('emp-1');

      expect(results.map((n) => n.id)).toEqual(['n-2', 'n-1']);
      expect(queryMock.mock.calls[0][1]).toEqual(['emp-1']);
    });

    it('appends a status filter when provided', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ status: 'READ' })] });

      await repo.findByRecipient('emp-1', 'READ');

      expect(queryMock.mock.calls[0][1]).toEqual(['emp-1', 'READ']);
      expect(queryMock.mock.calls[0][0]).toMatch(/status = \$2/);
    });
  });

  describe('updateStatus', () => {
    it('sets read_at when transitioning to READ and returns the row', async () => {
      const readAt = new Date('2026-01-02T00:00:00Z');
      queryMock.mockResolvedValue({
        rows: [makeRow({ status: 'READ', read_at: readAt })]
      });

      const result = await repo.updateStatus('n-1', 'READ');

      expect(result.status).toBe('READ');
      expect(result.readAt).toEqual(readAt);
      expect(queryMock.mock.calls[0][1]).toEqual(['n-1', 'READ']);
    });

    it('throws NotFoundError when no row matches', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.updateStatus('missing', 'SENT')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
