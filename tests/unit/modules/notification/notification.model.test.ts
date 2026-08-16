import { NotificationStatus } from '../../../../src/shared/types';
import { LeaveNotification } from '../../../../src/modules/notification';

describe('LeaveNotification interface', () => {
  const validNotification: LeaveNotification = {
    id: 'notif-001',
    recipientId: 'emp-001',
    type: 'SUBMITTED',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted for approval.',
    leaveRequestId: 'lr-001',
    status: NotificationStatus.PENDING,
    createdAt: new Date('2026-08-16T10:00:00Z'),
    readAt: null,
  };

  it('should accept a valid LeaveNotification shape with all fields', () => {
    expect(validNotification.id).toBe('notif-001');
    expect(validNotification.recipientId).toBe('emp-001');
    expect(validNotification.type).toBe('SUBMITTED');
    expect(validNotification.title).toBe('Leave Request Submitted');
    expect(validNotification.message).toBe('Your leave request has been submitted for approval.');
    expect(validNotification.leaveRequestId).toBe('lr-001');
    expect(validNotification.status).toBe(NotificationStatus.PENDING);
    expect(validNotification.createdAt).toBeInstanceOf(Date);
    expect(validNotification.readAt).toBeNull();
  });

  it('should support all 6 notification type literals', () => {
    const types: LeaveNotification['type'][] = [
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
      'BALANCE_LOW',
      'BALANCE_EXHAUSTED',
    ];

    types.forEach((type) => {
      const notification: LeaveNotification = {
        ...validNotification,
        id: `notif-type-${type}`,
        type,
      };
      expect(notification.type).toBe(type);
    });
  });

  it('should support all NotificationStatus enum values', () => {
    const statuses: NotificationStatus[] = [
      NotificationStatus.PENDING,
      NotificationStatus.SENT,
      NotificationStatus.READ,
      NotificationStatus.ARCHIVED,
    ];

    statuses.forEach((status) => {
      const readAt: Date | null =
        status === NotificationStatus.READ || status === NotificationStatus.ARCHIVED
          ? new Date('2026-08-16T12:00:00Z')
          : null;

      const notification: LeaveNotification = {
        ...validNotification,
        id: `notif-status-${status}`,
        status,
        readAt,
      };
      expect(notification.status).toBe(status);
    });
  });

  it('should have readAt as null when status is PENDING', () => {
    const notification: LeaveNotification = {
      ...validNotification,
      status: NotificationStatus.PENDING,
      readAt: null,
    };
    expect(notification.status).toBe(NotificationStatus.PENDING);
    expect(notification.readAt).toBeNull();
  });

  it('should have readAt as null when status is SENT', () => {
    const notification: LeaveNotification = {
      ...validNotification,
      status: NotificationStatus.SENT,
      readAt: null,
    };
    expect(notification.status).toBe(NotificationStatus.SENT);
    expect(notification.readAt).toBeNull();
  });

  it('should have readAt as a non-null Date when status is READ', () => {
    const notification: LeaveNotification = {
      ...validNotification,
      status: NotificationStatus.READ,
      readAt: new Date('2026-08-16T12:00:00Z'),
    };
    expect(notification.status).toBe(NotificationStatus.READ);
    expect(notification.readAt).toBeInstanceOf(Date);
    expect(notification.readAt).not.toBeNull();
  });

  it('should have readAt as a non-null Date when status is ARCHIVED', () => {
    const notification: LeaveNotification = {
      ...validNotification,
      status: NotificationStatus.ARCHIVED,
      readAt: new Date('2026-08-16T14:00:00Z'),
    };
    expect(notification.status).toBe(NotificationStatus.ARCHIVED);
    expect(notification.readAt).toBeInstanceOf(Date);
    expect(notification.readAt).not.toBeNull();
  });

  it('should have exactly the expected field names', () => {
    const expectedFields = [
      'id',
      'recipientId',
      'type',
      'title',
      'message',
      'leaveRequestId',
      'status',
      'createdAt',
      'readAt',
    ];

    const actualFields = Object.keys(validNotification).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(9);
  });
});
