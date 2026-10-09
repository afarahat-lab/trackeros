import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../infrastructure/api/index';
import type { IApiClient } from '../../infrastructure/api/index';
import { LeaveTypeCode } from '../../shared/types/index';
import type { LeaveBalanceView } from '../../shared/types/index';
import { BalanceService } from './balance.service';

const balance: LeaveBalanceView = {
  id: 'balance-1',
  employeeId: 'emp-1',
  leaveTypeCode: LeaveTypeCode.ANNUAL,
  periodStart: new Date('2024-01-01T00:00:00.000Z'),
  periodEnd: new Date('2024-12-31T00:00:00.000Z'),
  entitledDays: 20,
  usedDays: 5,
  pendingDays: 2,
  available: 13,
};

function makeApiClient(getBalances: IApiClient['getBalances']): IApiClient {
  return {
    login: () => Promise.reject(new ApiError('unused', 0)),
    getMe: () => Promise.reject(new ApiError('unused', 0)),
    getLeaves: () => Promise.resolve([]),
    getLeave: () => Promise.reject(new ApiError('Not found', 404)),
    getBalances,
    createLeave: () => Promise.reject(new ApiError('unused', 0)),
    submitLeave: () => Promise.reject(new ApiError('unused', 0)),
    approveLeave: () => Promise.reject(new ApiError('unused', 0)),
    rejectLeave: () => Promise.reject(new ApiError('unused', 0)),
    cancelLeave: () => Promise.reject(new ApiError('unused', 0)),
  };
}

describe('BalanceService', () => {
  it('getBalances delegates to apiClient.getBalances and returns the value unchanged', async () => {
    const getBalances = vi.fn<IApiClient['getBalances']>(() =>
      Promise.resolve([balance]),
    );
    const service = new BalanceService(makeApiClient(getBalances));

    const result = await service.getBalances();

    expect(getBalances).toHaveBeenCalledTimes(1);
    expect(result).toEqual([balance]);
    // `available` is display-only and passed through without recomputation.
    expect(result[0].available).toBe(13);
  });

  it('getBalances propagates the API client error unchanged', async () => {
    const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    const apiClient = makeApiClient(() => Promise.reject(error));
    const service = new BalanceService(apiClient);

    await expect(service.getBalances()).rejects.toBe(error);
  });
});
