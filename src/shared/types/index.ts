export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
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
