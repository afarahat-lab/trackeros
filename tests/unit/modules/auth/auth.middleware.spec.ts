import jwt from 'jsonwebtoken';

import { createAuthMiddleware, LOCAL_USERS } from '../../../../src/modules/auth/auth.middleware';
import { UserRole } from '../../../../src/shared/types';

const SECRET = 'test-secret-not-a-real-token';

interface FakeReply {
  statusCode: number;
  body: unknown;
  status(code: number): FakeReply;
  send(body: unknown): FakeReply;
}

function makeReply(): FakeReply {
  const reply: FakeReply = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return reply;
}

interface FakeRequest {
  headers: Record<string, unknown>;
  user?: { id: string; role: UserRole };
}

function makeRequest(headers: Record<string, unknown>): FakeRequest {
  return { headers };
}

const employee = LOCAL_USERS.find((u) => u.role === UserRole.employee)!;

describe('auth middleware', () => {
  const middleware = createAuthMiddleware({ secret: SECRET, users: LOCAL_USERS });

  it('sets request.user for a valid token', async () => {
    const token = jwt.sign({ sub: employee.id }, SECRET, { expiresIn: '1h' });
    const request = makeRequest({ authorization: `Bearer ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toEqual({ id: employee.id, role: employee.role });
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toBeUndefined();
  });

  it('leaves request.user unset and returns 401 for a missing header', async () => {
    const request = makeRequest({});
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 for a malformed bearer header and leaves user unset', async () => {
    const token = jwt.sign({ sub: employee.id }, SECRET);
    const request = makeRequest({ authorization: `Token ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 for an invalid (tampered) token and leaves user unset', async () => {
    const token = jwt.sign({ sub: employee.id }, SECRET);
    const request = makeRequest({ authorization: `Bearer ${token}oops` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: employee.id }, 'other-secret');
    const request = makeRequest({ authorization: `Bearer ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 for an expired token and leaves user unset', async () => {
    const token = jwt.sign({ sub: employee.id }, SECRET, { expiresIn: '-1s' });
    const request = makeRequest({ authorization: `Bearer ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 401 for a subject that is not a seeded local user', async () => {
    const token = jwt.sign({ sub: 'unknown-user' }, SECRET);
    const request = makeRequest({ authorization: `Bearer ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toBeUndefined();
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('does not grant a role from the token payload (role comes from seeds)', async () => {
    const token = jwt.sign({ sub: employee.id, role: UserRole.hr_admin }, SECRET);
    const request = makeRequest({ authorization: `Bearer ${token}` });
    const reply = makeReply();

    await middleware(request as never, reply as never);

    expect(request.user).toEqual({ id: employee.id, role: employee.role });
    expect(request.user!.role).toBe(UserRole.employee);
  });
});
