import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaveTypeCode } from '../../shared/types/index';
import { ApiClient } from './api-client';
import { TokenStorage } from './token-storage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const profile = {
  id: 'emp-1',
  employeeNumber: 'E001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'EMPLOYEE',
  managerId: null,
  department: 'Engineering',
  hireDate: '2020-01-01T00:00:00.000Z',
  employmentStatus: 'ACTIVE',
};

const leave = {
  id: 'leave-1',
  employeeId: 'emp-1',
  leaveTypeCode: 'annual',
  startDate: '2024-01-02T00:00:00.000Z',
  endDate: '2024-01-05T00:00:00.000Z',
  requestedDays: 4,
  reason: null,
  status: 'DRAFT',
  approverId: null,
  approvalComment: null,
  submittedAt: null,
  decidedAt: null,
  cancelledBy: null,
  cancelledAt: null,
};

describe('ApiClient', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Authorization header on authenticated calls when a token is present', async () => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(profile));

    const client = new ApiClient(storage);
    await client.getMe();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(url).toBe('/employees/me');
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-token',
    });
  });

  it('does not attach Authorization header on the public login call', async () => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ token: 'new-token', profile }),
    );

    const client = new ApiClient(storage);
    await client.login('ada@example.com', 'secret');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('clears the token from sessionStorage on a 401 response', async () => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401),
    );

    const client = new ApiClient(storage);

    await expect(client.getMe()).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(storage.getToken()).toBeNull();
  });

  it('maps non-2xx responses to ApiError with status and code', async () => {
    const storage = new TokenStorage();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Not found', code: 'NOT_FOUND' }, 404),
    );

    const client = new ApiClient(storage);

    await expect(client.getLeave('nope')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Not found',
    });
    expect(storage.getToken()).toBeNull();
  });

  it('createLeave issues POST /leaves with the JSON body and bearer token', async () => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(leave));

    const client = new ApiClient(storage);
    await client.createLeave({
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: '2024-01-02',
      endDate: '2024-01-05',
    });

    const url = fetchMock.mock.calls[0][0];
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(url).toBe('/leaves');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: '2024-01-02',
        endDate: '2024-01-05',
      }),
    );
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    });
  });

  it.each([
    ['submitLeave', `/leaves/leave-1/submit`],
    ['approveLeave', `/leaves/leave-1/approve`],
    ['rejectLeave', `/leaves/leave-1/reject`],
    ['cancelLeave', `/leaves/leave-1/cancel`],
  ] as const)('%s issues POST %s with no body and bearer token', async (method, path) => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(leave));

    const client = new ApiClient(storage);
    await client[method]('leave-1');

    const url = fetchMock.mock.calls[0][0];
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(url).toBe(path);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-token',
    });
  });

  it('maps a rejected create to ApiError carrying the backend error message and code', async () => {
    const storage = new TokenStorage();
    storage.setToken('test-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { error: 'Insufficient leave balance', code: 'INSUFFICIENT_BALANCE' },
        400,
      ),
    );

    const client = new ApiClient(storage);

    await expect(
      client.createLeave({
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: '2024-01-02',
        endDate: '2024-01-05',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'INSUFFICIENT_BALANCE',
      message: 'Insufficient leave balance',
    });
  });
});
