import { AuthService } from '../../../../src/modules/auth/auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockEmployeeRepo: any;

  beforeEach(() => {
    mockEmployeeRepo = {
      findByUsername: jest.fn(),
    };
    authService = new AuthService(mockEmployeeRepo);
    jest.clearAllMocks();
  });

  it('valid credentials returns token', async () => {
    const mockEmployee = { id: '1', username: 'test', passwordHash: 'hash', status: 'active', role: 'employee' };
    mockEmployeeRepo.findByUsername.mockResolvedValue(mockEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock-token');

    const token = await authService.login('test', 'password');

    expect(mockEmployeeRepo.findByUsername).toHaveBeenCalledWith('test');
    expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: '1', employeeId: '1', role: 'employee' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );
    expect(token).toBe('mock-token');
  });

  it('unknown username throws Invalid credentials', async () => {
    mockEmployeeRepo.findByUsername.mockResolvedValue(null);

    await expect(authService.login('unknown', 'password')).rejects.toThrow('Invalid credentials');
    expect(mockEmployeeRepo.findByUsername).toHaveBeenCalledWith('unknown');
  });

  it('inactive employee throws Employee account is not active', async () => {
    const mockEmployee = { id: '1', username: 'test', passwordHash: 'hash', status: 'inactive', role: 'employee' };
    mockEmployeeRepo.findByUsername.mockResolvedValue(mockEmployee);

    await expect(authService.login('test', 'password')).rejects.toThrow('Employee account is not active');
  });

  it('wrong password throws Invalid credentials', async () => {
    const mockEmployee = { id: '1', username: 'test', passwordHash: 'hash', status: 'active', role: 'employee' };
    mockEmployeeRepo.findByUsername.mockResolvedValue(mockEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(authService.login('test', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hash');
  });
});
