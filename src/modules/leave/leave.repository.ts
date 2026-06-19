import { LeaveRequest } from './leave.model';

export interface LeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByManagerId(managerId: string): Promise<LeaveRequest[]>;
  findByStatus(status: string): Promise<LeaveRequest[]>;
  save(request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveRequest | null>;
}
