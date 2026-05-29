import { LeaveRequestRepository } from '../repository/leave-request-repository';
import { LeaveRequest } from '../domain/leave-request';

export class LeaveRequestService {
  private repository: LeaveRequestRepository;

  constructor() {
    this.repository = new LeaveRequestRepository();
  }

  /**
   * Create a new leave request.
   * @param leaveRequest - The leave request data.
   * @returns The created leave request.
   */
  public async createLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    return this.repository.create(leaveRequest);
  }

  /**
   * List leave requests, optionally filtered by status.
   * @param status - The status to filter by.
   * @returns A list of leave requests.
   */
  public async listLeaveRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<LeaveRequest[]> {
    return this.repository.list(status);
  }
}
