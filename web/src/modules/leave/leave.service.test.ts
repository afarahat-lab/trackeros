import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../infrastructure/api/index';
import type { IApiClient } from '../../infrastructure/api/index';
import {
  EmployeeRole,
  LeaveStatus,
  LeaveTypeCode,
} from '../../shared/types/index';
import type {
  CreateLeaveRequestInput,
  LeaveRequestView,
} from '../../shared/types/index';
import { getAvailableLeaveActions } from './leave.actions';
import { LeaveService } from './leave.service';
import { validateLeaveRequestInput } from './leave.validation';

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

const input: CreateLeaveRequestInput = {
  leaveTypeCode: LeaveTypeCode.ANNUAL,
  startDate: '2024-07-01',
  endDate: '2024-07-05',
};

interface ApiClientOverrides {
  getLeaves?: IApiClient['getLeaves'];
  getLeave?: IApiClient['getLeave'];
  createLeave?: IApiClient['createLeave'];
  submitLeave?: IApiClient['submitLeave'];
  approveLeave?: IApiClient['approveLeave'];
  rejectLeave?: IApiClient['rejectLeave'];
  cancelLeave?: IApiClient['cancelLeave'];
}

function makeApiClient(overrides: ApiClientOverrides = {}): IApiClient {
  const unused = (): Promise<never> =>
    Promise.reject(new ApiError('unused', 0));
  return {
    login: () => Promise.reject(new ApiError('unused', 0)),
    getMe: () => Promise.reject(new ApiError('unused', 0)),
    getBalances: () => Promise.resolve([]),
    getLeaves: overrides.getLeaves ?? unused,
    getLeave: overrides.getLeave ?? unused,
    createLeave: overrides.createLeave ?? unused,
    submitLeave: overrides.submitLeave ?? unused,
    approveLeave: overrides.approveLeave ?? unused,
    rejectLeave: overrides.rejectLeave ?? unused,
    cancelLeave: overrides.cancelLeave ?? unused,
  };
}

describe('LeaveService', () => {
  it('list delegates to apiClient.getLeaves and returns the value unchanged', async () => {
    const getLeaves = vi.fn<IApiClient['getLeaves']>(() =>
      Promise.resolve([leave]),
    );
    const getLeave = vi.fn<IApiClient['getLeave']>();
    const service = new LeaveService(makeApiClient({ getLeaves, getLeave }));

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
    const service = new LeaveService(makeApiClient({ getLeaves, getLeave }));

    const result = await service.getById('leave-1');

    expect(getLeave).toHaveBeenCalledTimes(1);
    expect(getLeave).toHaveBeenCalledWith('leave-1');
    expect(getLeaves).not.toHaveBeenCalled();
    expect(result).toBe(leave);
  });

  it('list propagates the API client error unchanged', async () => {
    const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    const apiClient = makeApiClient({
      getLeaves: () => Promise.reject(error),
      getLeave: () => Promise.resolve(leave),
    });
    const service = new LeaveService(apiClient);

    await expect(service.list()).rejects.toBe(error);
  });

  it('getById propagates the API client error unchanged (including 404)', async () => {
    const error = new ApiError('Not found', 404);
    const apiClient = makeApiClient({
      getLeaves: () => Promise.resolve([leave]),
      getLeave: () => Promise.reject(error),
    });
    const service = new LeaveService(apiClient);

    await expect(service.getById('missing')).rejects.toBe(error);
  });

  it('create delegates to apiClient.createLeave with the input and returns the value unchanged', async () => {
    const createLeave = vi.fn<IApiClient['createLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient({ createLeave }));

    const result = await service.create(input);

    expect(createLeave).toHaveBeenCalledTimes(1);
    expect(createLeave).toHaveBeenCalledWith(input);
    expect(result).toBe(leave);
  });

  it('create propagates the API client error unchanged', async () => {
    const error = new ApiError('Invalid leave type', 400, 'VALIDATION');
    const service = new LeaveService(
      makeApiClient({ createLeave: () => Promise.reject(error) }),
    );

    await expect(service.create(input)).rejects.toBe(error);
  });

  it('submit delegates to apiClient.submitLeave with the id and returns the value unchanged', async () => {
    const submitLeave = vi.fn<IApiClient['submitLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient({ submitLeave }));

    const result = await service.submit('leave-1');

    expect(submitLeave).toHaveBeenCalledTimes(1);
    expect(submitLeave).toHaveBeenCalledWith('leave-1');
    expect(result).toBe(leave);
  });

  it('submit propagates the API client error unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const service = new LeaveService(
      makeApiClient({ submitLeave: () => Promise.reject(error) }),
    );

    await expect(service.submit('leave-1')).rejects.toBe(error);
  });

  it('approve delegates to apiClient.approveLeave with the id and returns the value unchanged', async () => {
    const approveLeave = vi.fn<IApiClient['approveLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient({ approveLeave }));

    const result = await service.approve('leave-1');

    expect(approveLeave).toHaveBeenCalledTimes(1);
    expect(approveLeave).toHaveBeenCalledWith('leave-1');
    expect(result).toBe(leave);
  });

  it('approve propagates the API client error unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const service = new LeaveService(
      makeApiClient({ approveLeave: () => Promise.reject(error) }),
    );

    await expect(service.approve('leave-1')).rejects.toBe(error);
  });

  it('reject delegates to apiClient.rejectLeave with the id and returns the value unchanged', async () => {
    const rejectLeave = vi.fn<IApiClient['rejectLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient({ rejectLeave }));

    const result = await service.reject('leave-1');

    expect(rejectLeave).toHaveBeenCalledTimes(1);
    expect(rejectLeave).toHaveBeenCalledWith('leave-1');
    expect(result).toBe(leave);
  });

  it('reject propagates the API client error unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const service = new LeaveService(
      makeApiClient({ rejectLeave: () => Promise.reject(error) }),
    );

    await expect(service.reject('leave-1')).rejects.toBe(error);
  });

  it('cancel delegates to apiClient.cancelLeave with the id and returns the value unchanged', async () => {
    const cancelLeave = vi.fn<IApiClient['cancelLeave']>(() =>
      Promise.resolve(leave),
    );
    const service = new LeaveService(makeApiClient({ cancelLeave }));

    const result = await service.cancel('leave-1');

    expect(cancelLeave).toHaveBeenCalledTimes(1);
    expect(cancelLeave).toHaveBeenCalledWith('leave-1');
    expect(result).toBe(leave);
  });

  it('cancel propagates the API client error unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const service = new LeaveService(
      makeApiClient({ cancelLeave: () => Promise.reject(error) }),
    );

    await expect(service.cancel('leave-1')).rejects.toBe(error);
  });
});

describe('getAvailableLeaveActions', () => {
  it('allows the owner to submit and cancel a DRAFT', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.DRAFT,
        EmployeeRole.EMPLOYEE,
        true,
      ),
    ).toEqual(['submit', 'cancel']);
  });

  it('allows the owner to cancel a SUBMITTED request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.SUBMITTED,
        EmployeeRole.EMPLOYEE,
        true,
      ),
    ).toEqual(['cancel']);
  });

  it('allows a MANAGER to approve and reject a SUBMITTED request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.SUBMITTED,
        EmployeeRole.MANAGER,
        false,
      ),
    ).toEqual(['approve', 'reject']);
  });

  it('allows an ADMIN to approve and reject a SUBMITTED request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.SUBMITTED,
        EmployeeRole.ADMIN,
        false,
      ),
    ).toEqual(['approve', 'reject']);
  });

  it('returns empty for the owner of an APPROVED request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.APPROVED,
        EmployeeRole.EMPLOYEE,
        true,
      ),
    ).toEqual([]);
  });

  it('returns empty for a non-owner employee on a SUBMITTED request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.SUBMITTED,
        EmployeeRole.EMPLOYEE,
        false,
      ),
    ).toEqual([]);
  });

  it('returns empty for a MANAGER on a DRAFT request', () => {
    expect(
      getAvailableLeaveActions(
        LeaveStatus.DRAFT,
        EmployeeRole.MANAGER,
        false,
      ),
    ).toEqual([]);
  });
});

describe('validateLeaveRequestInput', () => {
  it('returns empty for a valid input', () => {
    expect(validateLeaveRequestInput(input)).toEqual([]);
  });

  it('reports a missing start date', () => {
    expect(
      validateLeaveRequestInput({ ...input, startDate: '' }),
    ).toEqual(['Start date is required.']);
  });

  it('reports a missing end date', () => {
    expect(
      validateLeaveRequestInput({ ...input, endDate: '' }),
    ).toEqual(['End date is required.']);
  });

  it('reports both missing dates', () => {
    expect(
      validateLeaveRequestInput({ ...input, startDate: '', endDate: '' }),
    ).toEqual(['Start date is required.', 'End date is required.']);
  });

  it('reports an end date before the start date', () => {
    expect(
      validateLeaveRequestInput({
        ...input,
        startDate: '2024-07-05',
        endDate: '2024-07-01',
      }),
    ).toEqual(['End date must not be before the start date.']);
  });

  it('reports a missing leave type', () => {
    expect(
      validateLeaveRequestInput({
        ...input,
        leaveTypeCode: undefined as unknown as LeaveTypeCode,
      }),
    ).toEqual(['A leave type must be selected.']);
  });
});
