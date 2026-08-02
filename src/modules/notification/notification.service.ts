import { LeaveRequestDTO } from '../../shared/types/index';
import { INotificationService } from './notification.service.interface';

export class NotificationService implements INotificationService {
  async notifyLeaveSubmitted(request: LeaveRequestDTO): Promise<void> {
    console.log(
      `[Notification] Leave submitted: requestId=${request.id}, employeeId=${request.employeeId}, ` +
        `leaveType=${request.leaveTypeId}, startDate=${request.startDate}, endDate=${request.endDate}`,
    );
  }

  async notifyLeaveApproved(request: LeaveRequestDTO): Promise<void> {
    console.log(
      `[Notification] Leave approved: requestId=${request.id}, employeeId=${request.employeeId}, ` +
        `leaveType=${request.leaveTypeId}, approvedBy=${request.approvedBy}`,
    );
  }

  async notifyLeaveRejected(request: LeaveRequestDTO): Promise<void> {
    console.log(
      `[Notification] Leave rejected: requestId=${request.id}, employeeId=${request.employeeId}, ` +
        `leaveType=${request.leaveTypeId}, reason=${request.rejectionReason ?? 'N/A'}`,
    );
  }

  async notifyLeaveCancelled(request: LeaveRequestDTO): Promise<void> {
    console.log(
      `[Notification] Leave cancelled: requestId=${request.id}, employeeId=${request.employeeId}, ` +
        `leaveType=${request.leaveTypeId}, cancelledAt=${request.cancelledAt}`,
    );
  }
}
