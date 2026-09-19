import type { IApiClient } from '../../infrastructure/api/index';
import type { LeaveRequestView } from '../../shared/types/index';

export interface ILeaveService {
  list(): Promise<LeaveRequestView[]>;
  getById(id: string): Promise<LeaveRequestView>;
}

/**
 * Read-only access to leave requests. Both methods delegate verbatim to the
 * API client, which handles the bearer token and 401-clearing; the service
 * performs no lifecycle transition and returns the API client's value
 * unchanged (status is display-only).
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
}
