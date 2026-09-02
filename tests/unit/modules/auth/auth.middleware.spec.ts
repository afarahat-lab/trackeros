import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

import { UserRole } from '../../../../src/shared/types';
import { authenticate } from '../../../../src/modules/auth/auth.middleware';
import { findLocalUserById } from '../../../../src/modules/auth/local-users';

const SECRET = 'test-secret';

function makeToken(
  sub: string,
  role: UserRole,
  options: { secret?: string; expiresIn?: string | number } = {}
): string {
  return jwt.sign({ role }, options.secret ?? SECRET, {
    subject: sub,
    ...(options.expiresIn !== undefined ? { expiresIn: options.expiresIn } : {}),
  });
}

function makeRequest(authorization?: string): FastifyRequest {
  return { headers: authorization ? { authorization } : {} } as unknown as FastifyRequest;
}

describe('authenticate', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('populates request.user for a valid bearer token', () => {
    const user = findLocalUserById('mgr-2001');
    expect(user).toBeDefined();

    const request = makeRequest(`Bearer ${makeToken('mgr-2001', UserRole.manager)}`);
    const reply = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(reply.status).not.toHaveBeenCalled();
    expect(request.user).toEqual({ id: 'mgr-2001', role: UserRole.manager });
  });

  it('returns 401 and leaves user unset when the header is missing', () => {
    const request = makeRequest();
    const send = jest.fn();
    const reply = {
      status: jest.fn().mockReturnThis(),
      send,
    } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(done).toHaveBeenCalledTimes(1);
    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ error: 'Missing bearer token', code: 'MISSING_TOKEN' });
    expect(request.user).toBeUndefined();
  });

  it('returns 401 for an invalid token', () => {
    const request = makeRequest('Bearer not-a-jwt');
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
    expect(request.user).toBeUndefined();
  });

  it('returns 401 for a token signed with a different secret', () => {
    const token = makeToken('mgr-2001', UserRole.manager, { secret: 'wrong-secret' });
    const request = makeRequest(`Bearer ${token}`);
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
    expect(request.user).toBeUndefined();
  });

  it('returns 401 with TOKEN_EXPIRED for an expired token', () => {
    const token = makeToken('mgr-2001', UserRole.manager, { expiresIn: '-1s' });
    const request = makeRequest(`Bearer ${token}`);
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' })
    );
    expect(request.user).toBeUndefined();
  });

  it('returns 401 for a token whose subject is not a seeded local user', () => {
    const token = makeToken('ghost-user', UserRole.employee);
    const request = makeRequest(`Bearer ${token}`);
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
    expect(request.user).toBeUndefined();
  });

  it('returns 401 for a token whose role is not a valid UserRole', () => {
    const token =
      'Bearer ' +
      jwt.sign({ role: 'super_admin' }, SECRET, { subject: 'mgr-2001' });
    const request = makeRequest(token);
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    const done = jest.fn();

    authenticate(request, reply, done);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
    expect(request.user).toBeUndefined();
  });
});
