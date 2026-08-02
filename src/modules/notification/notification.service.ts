import type { INotificationService } from './notification.service.interface';
import type { INotificationRepository } from './notification.repository';

export class NotificationService implements INotificationService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async notifyLeaveSubmitted(employeeId: string, leaveRequestId: string): Promise<void> {
    const recipientEmail = `${employeeId}@example.com`;

    try {
      await this.notificationRepo.create({
        recipientId: employeeId,
        recipientEmail,
        subject: 'Leave Request Submitted',
        body: `Your leave request ${leaveRequestId} has been submitted.`,
        sentAt: null,
        status: 'PENDING',
      });

      console.log(
        `[Notification] Leave submitted notification persisted for request ${leaveRequestId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Notification] Failed to persist leave-submitted notification for request ${leaveRequestId}: ${message}`,
      );
    }
  }

  async notifyLeaveStatusChange(
    employeeId: string,
    leaveRequestId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    const recipientEmail = `${employeeId}@example.com`;

    try {
      await this.notificationRepo.create({
        recipientId: employeeId,
        recipientEmail,
        subject: `Leave Request ${newStatus}`,
        body: `Your leave request ${leaveRequestId} has transitioned from ${oldStatus} to ${newStatus}.`,
        sentAt: null,
        status: 'PENDING',
      });

      console.log(
        `[Notification] Leave status-change notification persisted for request ${leaveRequestId} (${oldStatus} → ${newStatus})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Notification] Failed to persist status-change notification for request ${leaveRequestId}: ${message}`,
      );
    }
  }
}
