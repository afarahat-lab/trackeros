import type { ILeaveService } from '../leave/index';
import type { IEmployeeService } from '../employee/index';
import { LeaveStatus } from '../../shared/types/index';
import type {
  LeaveTypeCode,
  LeaveRequestView,
  EmployeeProfile,
} from '../../shared/types/index';

export type ApprovalDecision = 'approve' | 'reject';

/**
 * Derived read-model projection of a leave request awaiting the signed-in
 * manager's decision. Never persisted: membership is computed from
 * `LeaveRequestView` rows whose status is SUBMITTED and whose requester is not
 * the signed-in viewer. While in the queue, `status` is always
 * `LeaveStatus.SUBMITTED` and `employeeName` is always `null` (the API
 * exposes no endpoint returning another employee's name).
 */
export interface ApprovalsQueueItem {
  requestId: string;
  employeeId: string;
  employeeName: string | null;
  leaveTypeCode: LeaveTypeCode;
  startDate: Date;
  endDate: Date;
  status: LeaveStatus;
}

export interface IApprovalsService {
  getQueue(): Promise<ApprovalsQueueItem[]>;
  decide(
    requestId: string,
    action: ApprovalDecision,
  ): Promise<LeaveRequestView>;
}

/**
 * Stateless orchestration boundary over `ILeaveService` and `IEmployeeService`.
 * The identity/role of the signed-in viewer comes from
 * `employeeService.getMe()` (never decoded from the JWT), and `decide`
 * delegates verbatim to `leaveService.approve`/`reject`, returning the
 * resulting `LeaveRequestView` unchanged so the caller can replace the decided
 * row with it rather than re-fetching the list.
 */
export class ApprovalsService implements IApprovalsService {
  private readonly leaveService: ILeaveService;
  private readonly employeeService: IEmployeeService;

  constructor(leaveService: ILeaveService, employeeService: IEmployeeService) {
    this.leaveService = leaveService;
    this.employeeService = employeeService;
  }

  async getQueue(): Promise<ApprovalsQueueItem[]> {
    const profile: EmployeeProfile = await this.employeeService.getMe();
    const requests: LeaveRequestView[] = await this.leaveService.list();

    return requests
      .filter(
        (view) =>
          view.status === LeaveStatus.SUBMITTED &&
          view.employeeId !== profile.id,
      )
      .map(
        (view): ApprovalsQueueItem => ({
          requestId: view.id,
          employeeId: view.employeeId,
          employeeName: null,
          leaveTypeCode: view.leaveTypeCode,
          startDate: view.startDate,
          endDate: view.endDate,
          status: view.status,
        }),
      );
  }

  decide(
    requestId: string,
    action: ApprovalDecision,
  ): Promise<LeaveRequestView> {
    if (action === 'approve') {
      return this.leaveService.approve(requestId);
    }
    return this.leaveService.reject(requestId);
  }
}
