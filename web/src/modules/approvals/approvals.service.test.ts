import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../infrastructure/api/index';
import { ApprovalsService } from './index';
import type { ApprovalsQueueItem } from './index';
import type { ILeaveService } from '../leave/index';
import type { IEmployeeService } from '../employee/index';
import {
  EmployeeRole,
  EmploymentStatus,
  LeaveStatus,
  LeaveTypeCode,
} from '../../shared/types/index';
import type {
  LeaveRequestView,
  EmployeeProfile,
} from '../../shared/types/index';

const profile: EmployeeProfile = {
  id: 'emp-1',
  employeeNumber: 'E001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: EmployeeRole.MANAGER,
  managerId: null,
  department: 'Engineering',
  hireDate: new Date('2020-01-01T00:00:00.000Z'),
  employmentStatus: EmploymentStatus.ACTIVE,
};

function makeLeave(
  overrides: Partial<LeaveRequestView> = {},
): LeaveRequestView {
  return {
    id: 'leave-1',
    employeeId: 'emp-2',
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
    ...overrides,
  };
}

interface LeaveServiceOverrides {
  list?: ILeaveService['list'];
  getById?: ILeaveService['getById'];
  create?: ILeaveService['create'];
  submit?: ILeaveService['submit'];
  approve?: ILeaveService['approve'];
  reject?: ILeaveService['reject'];
  cancel?: ILeaveService['cancel'];
}

function makeLeaveService(
  overrides: LeaveServiceOverrides = {},
): ILeaveService {
  const unused = (): Promise<never> =>
    Promise.reject(new ApiError('unused', 0));
  return {
    list: overrides.list ?? unused,
    getById: overrides.getById ?? unused,
    create: overrides.create ?? unused,
    submit: overrides.submit ?? unused,
    approve: overrides.approve ?? unused,
    reject: overrides.reject ?? unused,
    cancel: overrides.cancel ?? unused,
  };
}

function makeEmployeeService(
  getMe: IEmployeeService['getMe'],
): IEmployeeService {
  return { getMe };
}

describe('ApprovalsService', () => {
  it('getQueue returns only non-own SUBMITTED rows with a null employeeName', async () => {
    const getMe = vi.fn<IEmployeeService['getMe']>(() =>
      Promise.resolve(profile),
    );
    const a = makeLeave({ id: 'leave-submitted', employeeId: 'emp-2' });
    const own = makeLeave({ id: 'leave-own', employeeId: profile.id });
    const draft = makeLeave({ id: 'leave-draft', status: LeaveStatus.DRAFT });
    const approved = makeLeave({
      id: 'leave-approved',
      status: LeaveStatus.APPROVED,
    });
    const rejected = makeLeave({
      id: 'leave-rejected',
      status: LeaveStatus.REJECTED,
    });
    const cancelled = makeLeave({
      id: 'leave-cancelled',
      status: LeaveStatus.CANCELLED,
    });
    const list = vi.fn<ILeaveService['list']>(() =>
      Promise.resolve([draft, a, approved, own, rejected, cancelled]),
    );
    const leaveService = makeLeaveService({ list });
    const employeeService = makeEmployeeService(getMe);
    const service = new ApprovalsService(leaveService, employeeService);

    const result = await service.getQueue();

    const expected: ApprovalsQueueItem = {
      requestId: a.id,
      employeeId: a.employeeId,
      employeeName: null,
      leaveTypeCode: a.leaveTypeCode,
      startDate: a.startDate,
      endDate: a.endDate,
      status: LeaveStatus.SUBMITTED,
    };
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(1);
    expect(result).toEqual([expected]);
    expect(result[0].employeeName).toBeNull();
    expect(result[0].status).toBe(LeaveStatus.SUBMITTED);
  });

  it('getQueue applies the same SUBMITTED/non-own filter for an ADMIN profile', async () => {
    const admin: EmployeeProfile = {
      ...profile,
      id: 'emp-admin',
      role: EmployeeRole.ADMIN,
    };
    const submittedOther = makeLeave({
      id: 'leave-submitted',
      employeeId: 'emp-2',
      status: LeaveStatus.SUBMITTED,
    });
    const submittedOwn = makeLeave({
      id: 'leave-own',
      employeeId: admin.id,
      status: LeaveStatus.SUBMITTED,
    });
    const approved = makeLeave({
      id: 'leave-approved',
      employeeId: 'emp-3',
      status: LeaveStatus.APPROVED,
    });
    const getMe = vi.fn<IEmployeeService['getMe']>(() =>
      Promise.resolve(admin),
    );
    const list = vi.fn<ILeaveService['list']>(() =>
      Promise.resolve([approved, submittedOther, submittedOwn]),
    );
    const service = new ApprovalsService(
      makeLeaveService({ list }),
      makeEmployeeService(getMe),
    );

    const result = await service.getQueue();

    expect(result).toEqual([
      {
        requestId: 'leave-submitted',
        employeeId: 'emp-2',
        employeeName: null,
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: new Date('2024-07-01T00:00:00.000Z'),
        endDate: new Date('2024-07-05T00:00:00.000Z'),
        status: LeaveStatus.SUBMITTED,
      },
    ]);
  });

  it('getQueue returns [] when there are no non-own SUBMITTED rows', async () => {
    const getMe = vi.fn<IEmployeeService['getMe']>(() =>
      Promise.resolve(profile),
    );
    const list = vi.fn<ILeaveService['list']>(() => Promise.resolve([]));
    const service = new ApprovalsService(
      makeLeaveService({ list }),
      makeEmployeeService(getMe),
    );

    const result = await service.getQueue();

    expect(result).toEqual([]);
  });

  it('getQueue propagates a getMe rejection unchanged', async () => {
    const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    const getMe = vi.fn<IEmployeeService['getMe']>(() => Promise.reject(error));
    const service = new ApprovalsService(
      makeLeaveService(),
      makeEmployeeService(getMe),
    );

    await expect(service.getQueue()).rejects.toBe(error);
  });

  it('getQueue propagates a list rejection unchanged', async () => {
    const error = new ApiError('Internal Server Error', 500);
    const getMe = vi.fn<IEmployeeService['getMe']>(() =>
      Promise.resolve(profile),
    );
    const list = vi.fn<ILeaveService['list']>(() => Promise.reject(error));
    const service = new ApprovalsService(
      makeLeaveService({ list }),
      makeEmployeeService(getMe),
    );

    await expect(service.getQueue()).rejects.toBe(error);
  });

  it('decide with "approve" delegates to leaveService.approve and returns the view unchanged', async () => {
    const decided = makeLeave({ id: 'leave-1', status: LeaveStatus.APPROVED });
    const approve = vi.fn<ILeaveService['approve']>(() =>
      Promise.resolve(decided),
    );
    const reject = vi.fn<ILeaveService['reject']>();
    const service = new ApprovalsService(
      makeLeaveService({ approve, reject }),
      makeEmployeeService(
        vi.fn<IEmployeeService['getMe']>(() => Promise.resolve(profile)),
      ),
    );

    const result = await service.decide('leave-1', 'approve');

    expect(approve).toHaveBeenCalledTimes(1);
    expect(approve).toHaveBeenCalledWith('leave-1');
    expect(reject).not.toHaveBeenCalled();
    expect(result).toBe(decided);
  });

  it('decide with "reject" delegates to leaveService.reject and returns the view unchanged', async () => {
    const decided = makeLeave({ id: 'leave-1', status: LeaveStatus.REJECTED });
    const approve = vi.fn<ILeaveService['approve']>();
    const reject = vi.fn<ILeaveService['reject']>(() =>
      Promise.resolve(decided),
    );
    const service = new ApprovalsService(
      makeLeaveService({ approve, reject }),
      makeEmployeeService(
        vi.fn<IEmployeeService['getMe']>(() => Promise.resolve(profile)),
      ),
    );

    const result = await service.decide('leave-1', 'reject');

    expect(reject).toHaveBeenCalledTimes(1);
    expect(reject).toHaveBeenCalledWith('leave-1');
    expect(approve).not.toHaveBeenCalled();
    expect(result).toBe(decided);
  });

  it('decide propagates an approve rejection unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const approve = vi.fn<ILeaveService['approve']>(() => Promise.reject(error));
    const service = new ApprovalsService(
      makeLeaveService({ approve }),
      makeEmployeeService(
        vi.fn<IEmployeeService['getMe']>(() => Promise.resolve(profile)),
      ),
    );

    await expect(service.decide('leave-1', 'approve')).rejects.toBe(error);
  });

  it('decide propagates a reject rejection unchanged', async () => {
    const error = new ApiError('Forbidden', 403);
    const reject = vi.fn<ILeaveService['reject']>(() => Promise.reject(error));
    const service = new ApprovalsService(
      makeLeaveService({ reject }),
      makeEmployeeService(
        vi.fn<IEmployeeService['getMe']>(() => Promise.resolve(profile)),
      ),
    );

    await expect(service.decide('leave-1', 'reject')).rejects.toBe(error);
  });
});
