export enum EmploymentStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Terminated = 'Terminated',
  OnLeave = 'OnLeave',
}

export enum LeaveStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
