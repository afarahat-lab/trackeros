import type { IApiClient } from '../../infrastructure/api/index';
import type {
  CreateLeaveRequestInput,
  LeaveRequestView,
} from '../../shared/types/index';

export interface ILeaveService {
  list(): Promise<LeaveRequestView[]>;
  getById(id: string): Promise<LeaveRequestView>;
  create(input: CreateLeaveRequestInput): Promise<LeaveRequestView>;
  submit(id: string): Promise<LeaveRequestView>;
  approve(id: string): Promise<LeaveRequestView>;
  reject(id: string): Promise<LeaveRequestView>;
  cancel(id: string): Promise<LeaveRequestView>;
}

/**
 * Thin delegation boundary over the API client. Every method (read and
 * write) delegates verbatim to the client, which handles the bearer token and
 * 401-clearing; the service performs no lifecycle transition and returns the
 * API client's value unchanged (status is display-only).
 */
export class LeaveService implements ILeaveService {
  private readonly apiClient: IApiClient;

  constructor(apiClient: IApiClient) {
    this.apiClient = apiClient;
  }

  list(): Promise<LeaveRequestView[]> {
    return this.apiClient.getLeaves();
  }

  getById(id: string): Promise<LeaveRequestView> {
    return this.apiClient.getLeave(id);
  }

  create(input: CreateLeaveRequestInput): Promise<LeaveRequestView> {
    return this.apiClient.createLeave(input);
  }

  submit(id: string): Promise<LeaveRequestView> {
    return this.apiClient.submitLeave(id);
  }

  approve(id: string): Promise<LeaveRequestView> {
    return this.apiClient.approveLeave(id);
  }

  reject(id: string): Promise<LeaveRequestView> {
    return this.apiClient.rejectLeave(id);
  }

  cancel(id: string): Promise<LeaveRequestView> {
    return this.apiClient.cancelLeave(id);
  }
}
