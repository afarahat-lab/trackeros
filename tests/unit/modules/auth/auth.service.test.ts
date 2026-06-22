import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/auth/user.repository';
import bcrypt from 'bcryptjs';

jest.mock('../../../src/modules/auth/user.repository');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepo = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepo, 'test-secret');
  });

  it('should return a token for valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('password', 10);
    mockUserRepo.findByUsername.mockResolvedValue({
      id: '1',
      username: 'test',
      passwordHash: hashedPassword,
      employeeId: 'emp1',
      role: 'employee'
    });

    const token = await authService.login('test', 'password');
    expect(token).toBeDefined();
  });

  it('should reject with Invalid credentials for invalid username', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(null);

    await expect(authService.login('test', 'password')).rejects.toThrow('Invalid credentials');
  });

  it('should reject with Invalid credentials for invalid password', async () => {
    const hashedPassword = await bcrypt.hash('correct', 10);
    mockUserRepo.findByUsername.mockResolvedValue({
      id: '1',
      username: 'test',
      passwordHash: hashedPassword,
      employeeId: 'emp1',
      role: 'employee'
    });

    await expect(authService.login('test', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
