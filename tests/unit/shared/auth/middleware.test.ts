
import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requireRole } from '../../../../src/shared/auth/middleware';
import * as jwtUtils from '../../../../src/shared/auth/jwt';
import { UnauthorizedError, ForbiddenError } from '../../../../src/shared/errorTypes';

jest.mock('../../../../src/shared/auth/jwt');

const mockedJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;

function mockRequest(authHeader?: string): FastifyRequest {
  return {
    headers: {
      authorization: authHeader,
    },
    user: undefined,
  } as unknown as FastifyRequest;
}

function mockReply(): FastifyReply {
  return {} as FastifyReply;
}

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedError when Authorization header is missing', async () => {
    const request = mockRequest(undefined);
    const reply = mockReply();

    await expect(authenticate(request, reply)).rejects.toThrow(UnauthorizedError);
    await expect(authenticate(request, reply)).rejects.toThrow(
      'Missing or invalid Authorization header',
    );
  });

  it('should throw UnauthorizedError when token extraction returns null', async () => {
    mockedJwtUtils.extractTokenFromHeader.mockReturnValue(null);
    const request = mockRequest('Bearer');
    const reply = mockReply();

    await expect(authenticate(request, reply)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when token verification fails', async () => {
    mockedJwtUtils.extractTokenFromHeader.mockReturnValue('badtoken');
    mockedJwtUtils.verifyToken.mockRejectedValue(new Error('jwt malformed'));

    const request = mockRequest('Bearer badtoken');
    const reply = mockReply();

    await expect(authenticate(request, reply)).rejects.toThrow(UnauthorizedError);
    await expect(authenticate(request, reply)).rejects.toThrow('jwt malformed');
  });

  it('should re-throw UnauthorizedError from verifyToken as-is', async () => {
    const authError = new UnauthorizedError('custom auth error');
    mockedJwtUtils.extractTokenFromHeader.mockReturnValue('token');
    mockedJwtUtils.verifyToken.mockRejectedValue(authError);

    const request = mockRequest('Bearer token');
    const reply = mockReply();

    await expect(authenticate(request, reply)).rejects.toThrow(authError);
  });

  it('should re-throw ForbiddenError from verifyToken as-is', async () => {
    const forbiddenError = new ForbiddenError('custom forbidden');
    mockedJwtUtils.extractTokenFromHeader.mockReturnValue('token');
    mockedJwtUtils.verifyToken.mockRejectedValue(forbiddenError);

    const request = mockRequest('Bearer token');
    const reply = mockReply();

    await expect(authenticate(request, reply)).rejects.toThrow(forbiddenError);
  });

  it('should attach user to request on successful verification', async () => {
    mockedJwtUtils.extractTokenFromHeader.mockReturnValue('validtoken');
    mockedJwtUtils.verifyToken.mockResolvedValue({
      userId: 'user123',
      role: 'admin',
    });

    const request = mockRequest('Bearer validtoken');
    const reply = mockReply();

    await authenticate(request, reply);

    expect(request.user).toEqual({ userId: 'user123', role: 'admin' });
    expect(mockedJwtUtils.extractTokenFromHeader).toHaveBeenCalledWith(
      'Bearer validtoken',
    );
    expect(mockedJwtUtils.verifyToken).toHaveBeenCalledWith('validtoken');
  });
});

describe('requireRole', () => {
  it('should throw UnauthorizedError if user is not attached to request', async () => {
    const request = mockRequest();
    const reply = mockReply();
    const guard = requireRole('admin');

    await expect(guard(request, reply)).rejects.toThrow(UnauthorizedError);
    await expect(guard(request, reply)).rejects.toThrow('Authentication required');
  });

  it('should throw ForbiddenError if user role does not match', async () => {
    const request = mockRequest();
    (request as unknown as Record<string, unknown>).user = { userId: 'user1', role: 'employee' };
    const reply = mockReply();
    const guard = requireRole('admin', 'manager');

    await expect(guard(request, reply)).rejects.toThrow(ForbiddenError);
    await expect(guard(request, reply)).rejects.toThrow(
      'Insufficient role: required one of [admin, manager], got employee',
    );
  });

  it('should not throw if user role matches a single required role', async () => {
    const request = mockRequest();
    (request as unknown as Record<string, unknown>).user = { userId: 'user1', role: 'admin' };
    const reply = mockReply();
    const guard = requireRole('admin');

    await expect(guard(request, reply)).resolves.toBeUndefined();
  });

  it('should not throw if user role matches one of multiple required roles', async () => {
    const request = mockRequest();
    (request as unknown as Record<string, unknown>).user = { userId: 'user1', role: 'manager' };
    const reply = mockReply();
    const guard = requireRole('admin', 'manager', 'hr');

    await expect(guard(request, reply)).resolves.toBeUndefined();
  });
});
