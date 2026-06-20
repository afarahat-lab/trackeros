export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export enum LeaveType {
  Annual = 'annual',
  Sick = 'sick',
  Emergency = 'emergency'
}

export enum LeaveStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
}

export enum UserRole {
  Employee = 'employee',
  Manager = 'manager',
  HR = 'hr'
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  managerId?: string;
  role: UserRole;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: LeaveStatus;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  daysAllocated: number;
  daysUsed: number;
}
