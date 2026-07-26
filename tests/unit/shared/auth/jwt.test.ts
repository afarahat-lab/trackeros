
import jwt from 'jsonwebtoken';
import { extractTokenFromHeader, verifyToken } from '../../../../src/shared/auth/jwt';

jest.mock('jsonwebtoken');

const mockedVerify = jwt.verify as jest.Mock;

describe('extractTokenFromHeader', () => {
  it('should return null for undefined header', () => {
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  it('should return null for empty string header', () => {
    expect(extractTokenFromHeader('')).toBeNull();
  });

  it('should return null for non-Bearer scheme', () => {
    expect(extractTokenFromHeader('Basic abc123')).toBeNull();
  });

  it('should return null for malformed header (no token)', () => {
    expect(extractTokenFromHeader('Bearer')).toBeNull();
  });

  it('should return null for header with extra parts', () => {
    expect(extractTokenFromHeader('Bearer token extra')).toBeNull();
  });

  it('should extract token from valid Bearer header', () => {
    expect(extractTokenFromHeader('Bearer mytoken123')).toBe('mytoken123');
  });

  it('should extract token with special characters', () => {
    expect(extractTokenFromHeader('Bearer eyJhbGciOiJIUzI1NiJ9.abc.def')).toBe(
      'eyJhbGciOiJIUzI1NiJ9.abc.def',
    );
  });
});

describe('verifyToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw if JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET;
    await expect(verifyToken('sometoken')).rejects.toThrow(
      'JWT_SECRET is not configured',
    );
  });

  it('should throw if token verification fails', async () => {
    mockedVerify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(verifyToken('badtoken')).rejects.toThrow('invalid token');
  });

  it('should throw if decoded payload is missing userId', async () => {
    mockedVerify.mockReturnValue({ role: 'admin' });

    await expect(verifyToken('token')).rejects.toThrow(
      'Token payload missing required fields: userId or role',
    );
  });

  it('should throw if decoded payload is missing role', async () => {
    mockedVerify.mockReturnValue({ userId: 'user1' });

    await expect(verifyToken('token')).rejects.toThrow(
      'Token payload missing required fields: userId or role',
    );
  });

  it('should return userId and role for a valid token', async () => {
    mockedVerify.mockReturnValue({
      userId: 'user123',
      role: 'manager',
    });

    const result = await verifyToken('validtoken');
    expect(result).toEqual({ userId: 'user123', role: 'manager' });
    expect(mockedVerify).toHaveBeenCalledWith('validtoken', 'test-secret');
  });
});
