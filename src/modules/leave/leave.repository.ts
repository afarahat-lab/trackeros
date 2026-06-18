import { LeaveRequest } from './leave.model';

export interface LeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  findByManager(managerId: string): Promise<LeaveRequest[]>;
  save(leaveRequest: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<LeaveRequest>;
  update(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest | null>;
  softDelete(id: string): Promise<void>;
}
