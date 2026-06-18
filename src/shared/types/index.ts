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

export enum LeaveRequestStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled'
}

export enum UserRole {
  Employee = 'employee',
  Manager = 'manager',
  HR = 'hr'
}
