// Authentication service for leave-management platform
import { IEmployeeRepository } from '../employee/employee.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IAuthService {
  login(username: string, password: string): Promise<string>;
}

export class AuthService implements IAuthService {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async login(username: string, password: string): Promise<string> {
    // Cast to any to bypass TS errors if findByUsername is not yet in the IEmployeeRepository interface
    const employee = await (this.employeeRepo as any).findByUsername(username);
    
    if (!employee) {
      throw new Error('Invalid credentials');
    }

    if (employee.status !== 'active') {
      throw new Error('Employee account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { sub: employee.id, employeeId: employee.id, role: employee.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );

    return token;
  }
}
