import { LeaveRequestDTO } from '../../shared/types/index';

export interface INotificationService {
  notifyLeaveSubmitted(request: LeaveRequestDTO): Promise<void>;
  notifyLeaveApproved(request: LeaveRequestDTO): Promise<void>;
  notifyLeaveRejected(request: LeaveRequestDTO): Promise<void>;
  notifyLeaveCancelled(request: LeaveRequestDTO): Promise<void>;
}
