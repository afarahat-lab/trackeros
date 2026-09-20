import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../infrastructure/api/index';
import type { IApiClient } from '../../infrastructure/api/index';
import {
  LeaveStatus,
  LeaveTypeCode,
} from '../../shared/types/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { LeaveService } from './leave.service';

const leave: LeaveRequestView = {
  id: 'leave-1',
  employeeId: 'emp-1',
  leaveTypeCode: LeaveTypeCode.ANNUAL,
  startDate: new Date('2024-07-01T00:00:00.000Z'),
  endDate: new Date('2024-07-05T00:00:00.000Z'),
  requestedDays: 5,
  reason: 'Summer break',
  status: LeaveStatus.SUBMITTED,
  approverId: null,
  approvalComment: null,
  submittedAt: new Date('2024-06-01T12:00:00.000Z'),
  decidedAt: null,
  cancelledBy: null,
  cancelledAt: null,
};

function makeApiClient(
  getLeaves: IApiClient['getLeaves'],
  getLeave: IApiClient['getLeave'],
): IApiClient {
  return {
    login: () => Promise.reject(new ApiError('unused', 0)),
    getMe: () => Promise.reject(new ApiError('unused', 0)),
    getLeaves,
    getLeave,
    getBalances: () => Promise.resolve([]),
    createLeave: () => Promise.reject(new ApiError('unused', 0)),
    submitLeave: () => Promise.reject(new ApiError('unused', 0)),
    approveLeave: () => Promise.reject(new ApiError('unused', 0)),
    rejectLeave: () => Promise.reject(new ApiError('unused', 0)),
    cancelLeave: () => Promise.reject(new ApiError('unused', 0)),
  };
}

describe('LeaveService', () => {
  it('list delegates to apiClient.getLeaves and returns the value unchanged', async () => {
    const getLeaves = vi.fn<IApiClient['getLeaves']>(() =>
      Promise.resolve([leave]),
    );
    const getLeave = vi.fn<IApiClient['getLeave']>();
    const service = new LeaveService(makeApiClient(getLeaves, getLeave));

    const result = await service.list();

    expect(getLeaves).toHaveBeenCalledTimes(1);
    expect(getLeave).not.toHaveBeenCalled();
    expect(result).toEqual([leave]);
  });

  it('getById delegates to apiClient.getLeave with the id and returns the value unchanged', async () => {
    const getLeaves = vi.fn<IApiClient['getLeaves']>();
    const getLeave = vi.fn<IApiClient['getLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient(getLeaves, getLeave));

    const result = await service.getById('leave-1');

    expect(getLeave).toHaveBeenCalledTimes(1);
    expect(getLeave).toHaveBeenCalledWith('leave-1');
    expect(getLeaves).not.toHaveBeenCalled();
    expect(result).toBe(leave);
  });

  it('list propagates the API client error unchanged', async () => {
    const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    const apiClient = makeApiClient(
      () => Promise.reject(error),
      () => Promise.resolve(leave),
    );
    const service = new LeaveService(apiClient);

    await expect(service.list()).rejects.toBe(error);
  });

  it('getById propagates the API client error unchanged (including 404)', async () => {
    const error = new ApiError('Not found', 404);
    const apiClient = makeApiClient(
      () => Promise.resolve([leave]),
      () => Promise.reject(error),
    );
    const service = new LeaveService(apiClient);

    await expect(service.getById('missing')).rejects.toBe(error);
  });
});
