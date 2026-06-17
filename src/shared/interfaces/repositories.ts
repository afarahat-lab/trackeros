import { LeaveRequest, CreateLeaveRequestDto } from '../../modules/leave/leave.model';
import { LeaveBalance } from '../../modules/balance/balance.model';
import { Employee } from '../../modules/employee/employee.model';
import { LeavePolicy } from '../../modules/policy/policy.model';

export interface ILeaveRepository {
  create(leaveRequest: CreateLeaveRequestDto): Promise<LeaveRequest>;
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  updateStatus(id: string, status: LeaveRequest['status'], managerNotes?: string): Promise<LeaveRequest>;
  update(leaveRequest: Partial<LeaveRequest> & { id: string }): Promise<LeaveRequest>;
}

export interface ILeaveBalanceRepository {
  findByEmployeeIdAndFiscalYear(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]>;
  findByEmployeeIdPolicyIdAndFiscalYear(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  updateBalance(id: string, balanceDays: number): Promise<LeaveBalance>;
  create(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
}

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: LeavePolicy['leaveType']): Promise<LeavePolicy[]>;
  findActivePolicies(): Promise<LeavePolicy[]>;
}
