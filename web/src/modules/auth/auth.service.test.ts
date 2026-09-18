import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, TokenStorage } from '../../infrastructure/api';
import type { IApiClient } from '../../infrastructure/api';
import {
  AuthSessionStatus,
  EmployeeRole,
  EmploymentStatus,
} from '../../shared/types/index';
import type { EmployeeProfile } from '../../shared/types/index';
import { AuthService } from './auth.service';

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

function makeApiClient(login: IApiClient['login']): IApiClient {
  return {
    login,
    getMe: () => Promise.resolve(profile),
    getLeaves: () => Promise.resolve([]),
    getLeave: () => Promise.reject(new ApiError('Not found', 404)),
    getBalances: () => Promise.resolve([]),
  };
}

describe('AuthService', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('login stores the token and returns an authenticated session', async () => {
    const storage = new TokenStorage();
    const apiClient = makeApiClient(() =>
      Promise.resolve({ token: 'abc123', profile }),
    );
    const service = new AuthService(apiClient, storage);

    const session = await service.login('ada@example.com', 'secret');

    expect(storage.getToken()).toBe('abc123');
    expect(session).toEqual({
      token: 'abc123',
      profile,
      status: AuthSessionStatus.AUTHENTICATED,
    });
  });

  it('login propagates the server error message without an email-existence hint', async () => {
    const storage = new TokenStorage();
    storage.setToken('existing-token');
    const apiClient = makeApiClient(() =>
      Promise.reject(new ApiError('Invalid credentials', 401, 'UNAUTHORIZED')),
    );
    const service = new AuthService(apiClient, storage);

    await expect(service.login('ada@example.com', 'wrong')).rejects.toThrow(
      'Invalid credentials',
    );
    // A failed login must not clear an already-stored token and must not
    // reveal whether the email exists (the message stays a generic 401).
    expect(storage.getToken()).toBe('existing-token');
  });

  it('logout clears the token and is safe to call when already logged out', () => {
    const storage = new TokenStorage();
    storage.setToken('abc123');
    const apiClient = makeApiClient(() => Promise.reject(new ApiError('x', 0)));
    const service = new AuthService(apiClient, storage);

    expect(() => service.logout()).not.toThrow();
    expect(storage.getToken()).toBeNull();

    // Idempotent: a second call is a no-op and does not throw.
    expect(() => service.logout()).not.toThrow();
    expect(storage.getToken()).toBeNull();
  });
});
