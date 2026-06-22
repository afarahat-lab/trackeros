import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from './user.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { User } from './user.entity';

export interface IAuthService {
  login(username: string, password: string): Promise<string>;
}

export class AuthService implements IAuthService {
  constructor(
    private userRepository: UserRepository,
    private employeeRepository: IEmployeeRepository
  ) {}

  async login(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const employee = await this.employeeRepository.findById(user.employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }


    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { sub: user.id, employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );
    return token;
  }
}
