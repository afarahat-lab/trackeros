export interface INotificationService {
  notifyLeaveSubmitted(employeeId: string, leaveRequestId: string): Promise<void>;
  notifyLeaveStatusChange(
    employeeId: string,
    leaveRequestId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void>;
}
