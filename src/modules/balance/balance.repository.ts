import { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';

export interface ILeaveBalanceRepository {
  create(data: CreateLeaveBalanceDto): Promise<LeaveBalance>;
  findById(id: string): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  update(id: string, data: Partial<CreateLeaveBalanceDto>): Promise<LeaveBalance>;
  delete(id: string): Promise<void>;
}

export class PgLeaveBalanceRepository implements ILeaveBalanceRepository {
  async create(data: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    throw new Error('Method not implemented.');
  }
  async findById(id: string): Promise<LeaveBalance | null> {
    throw new Error('Method not implemented.');
  }
  async findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    throw new Error('Method not implemented.');
  }
  async update(id: string, data: Partial<CreateLeaveBalanceDto>): Promise<LeaveBalance> {
    throw new Error('Method not implemented.');
  }
  async delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
