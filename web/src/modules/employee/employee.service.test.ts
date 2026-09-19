import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../infrastructure/api/index';
import type { IApiClient } from '../../infrastructure/api/index';
import {
  EmployeeRole,
  EmploymentStatus,
} from '../../shared/types/index';
import type { EmployeeProfile } from '../../shared/types/index';
import { EmployeeService } from './employee.service';

const profile: EmployeeProfile = {
  id: 'emp-1',
  employeeNumber: 'E001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: EmployeeRole.EMPLOYEE,
  managerId: null,
  department: 'Engineering',
  hireDate: new Date('2020-01-01T00:00:00.000Z'),
  employmentStatus: EmploymentStatus.ACTIVE,
};

function makeApiClient(getMe: IApiClient['getMe']): IApiClient {
  return {
    login: () => Promise.reject(new ApiError('unused', 0)),
    getMe,
    getLeaves: () => Promise.resolve([]),
    getLeave: () => Promise.reject(new ApiError('Not found', 404)),
    getBalances: () => Promise.resolve([]),
  };
}

describe('EmployeeService', () => {
  it('getMe delegates to apiClient.getMe and returns the profile unchanged', async () => {
    const getMe = vi.fn<IApiClient['getMe']>(() => Promise.resolve(profile));
    const service = new EmployeeService(makeApiClient(getMe));

    const result = await service.getMe();

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result).toBe(profile);
  });

  it('getMe propagates the API client error unchanged', async () => {
    const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    const apiClient = makeApiClient(() => Promise.reject(error));
    const service = new EmployeeService(apiClient);

    await expect(service.getMe()).rejects.toBe(error);
  });
});
