import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
