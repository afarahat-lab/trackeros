import type { PoolClient } from 'pg';

import type {
  LeaveBalance,
  CreateLeaveBalanceInput,
  UpdateLeaveBalanceInput,
} from './balance.model';
import { LeaveBalanceRepository } from './balance.repository';
import type { ILeaveBalanceRepository } from './balance.repository';
import type { ILeaveBalanceService } from './balance.service.interface';

export class LeaveBalanceService implements ILeaveBalanceService {
  private readonly repository: ILeaveBalanceRepository;

  constructor(repository?: ILeaveBalanceRepository) {
    this.repository = repository ?? new LeaveBalanceRepository();
  }

  create(input: CreateLeaveBalanceInput, client?: PoolClient): Promise<LeaveBalance> {
    return this.repository.create(input, client);
  }

  findById(id: string): Promise<LeaveBalance | null> {
    return this.repository.findById(id);
  }

  findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    return this.repository.findByEmployee(employeeId);
  }

  findByEmployeeAndPolicy(employeeId: string, policyId: string): Promise<LeaveBalance[]> {
    return this.repository.findByEmployeeAndPolicy(employeeId, policyId);
  }

  findByEmployeeAndFiscalYear(
    employeeId: string,
    policyId: string,
    fiscalYear: number
  ): Promise<LeaveBalance | null> {
    return this.repository.findByEmployeeAndFiscalYear(employeeId, policyId, fiscalYear);
  }

  update(
    id: string,
    changes: UpdateLeaveBalanceInput,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    return this.repository.update(id, changes, client);
  }

  commitDays(
    employeeId: string,
    policyId: string,
    fiscalYear: number,
    days: number,
    client?: PoolClient
  ): Promise<LeaveBalance> {
    return this.repository.commitDays(employeeId, policyId, fiscalYear, days, client);
  }
}
