import type { IApiClient } from '../../infrastructure/api/index';
import type { EmployeeProfile } from '../../shared/types/index';

export interface IEmployeeService {
  getMe(): Promise<EmployeeProfile>;
}

/**
 * Read-only access to the current employee's profile. Delegates verbatim to
 * the API client, which attaches the bearer token and clears it on a 401;
 * this service adds no auth logic and returns the profile unchanged.
 */
export class EmployeeService implements IEmployeeService {
  private readonly apiClient: IApiClient;

  constructor(apiClient: IApiClient) {
    this.apiClient = apiClient;
  }

  getMe(): Promise<EmployeeProfile> {
    return this.apiClient.getMe();
  }
}
