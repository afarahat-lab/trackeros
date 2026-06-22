import { AuthService } from '../../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../../src/modules/auth/user.repository';
import { EmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../../../src/modules/auth/user.repository');
jest.mock('../../../../src/modules/employee/employee.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService.login', () => {
  let authService: AuthService;
  let userRepo: jest.Mocked<UserRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;

  beforeEach(() => {
    userRepo = new UserRepository(null as any) as any;
    employeeRepo = new EmployeeRepository(null as any) as any;
    authService = new AuthService(userRepo, employeeRepo);
  });

  it('should return a token for valid credentials', async () => {
    const mockUser = { id: '1', username: 'test', passwordHash: 'hash', employeeId: 'e1', role: 'employee' as const };
    const mockEmployee = { id: 'e1', status: 'active' };
    userRepo.findByUsername.mockResolvedValue(mockUser);
    employeeRepo.findById.mockResolvedValue(mockEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token123');

    const token = await authService.login('test', 'pass');
    expect(token).toBe('token123');
    expect(userRepo.findByUsername).toHaveBeenCalledWith('test');
    expect(employeeRepo.findById).toHaveBeenCalledWith('e1');
    expect(bcrypt.compare).toHaveBeenCalledWith('pass', 'hash');
  });

  it('should throw for invalid username', async () => {
    userRepo.findByUsername.mockResolvedValue(null);
    await expect(authService.login('bad', 'pass')).rejects.toThrow('Invalid credentials');
  });

  it('should throw for inactive employee', async () => {
    const mockUser = { id: '1', username: 'test', passwordHash: 'hash', employeeId: 'e1', role: 'employee' as const };
    const mockEmployee = { id: 'e1', status: 'inactive' };
    userRepo.findByUsername.mockResolvedValue(mockUser);
    employeeRepo.findById.mockResolvedValue(mockEmployee);
    await expect(authService.login('test', 'pass')).rejects.toThrow('Employee account is not active');
  });

  it('should throw for wrong password', async () => {
    const mockUser = { id: '1', username: 'test', passwordHash: 'hash', employeeId: 'e1', role: 'employee' as const };
    const mockEmployee = { id: 'e1', status: 'active' };
    userRepo.findByUsername.mockResolvedValue(mockUser);
    employeeRepo.findById.mockResolvedValue(mockEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(authService.login('test', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
