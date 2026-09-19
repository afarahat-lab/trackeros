import type { IApiClient } from '../../infrastructure/api/index';
import type { LeaveBalanceView } from '../../shared/types/index';

export interface IBalanceService {
  getBalances(): Promise<LeaveBalanceView[]>;
}

/**
 * Read-only access to the current employee's leave balances. Delegates
 * verbatim to the API client; `available` is display-only and never
 * recomputed or mutated — the API client's value is passed through unchanged.
 */
export class BalanceService implements IBalanceService {
  private readonly apiClient: IApiClient;

  constructor(apiClient: IApiClient) {
    this.apiClient = apiClient;
  }

  getBalances(): Promise<LeaveBalanceView[]> {
    return this.apiClient.getBalances();
  }
}
