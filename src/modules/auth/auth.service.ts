import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';

export interface IAuthService {
  login(username: string, password: string): Promise<string>;
}

export class AuthService implements IAuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtSecret: string
  ) {}

  async login(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return jwt.sign(
      { sub: user.employeeId, role: user.role },
      this.jwtSecret,
      { expiresIn: '8h' }
    );
  }
}
