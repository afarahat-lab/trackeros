export enum LeaveType {
  annual = 'annual',
  sick = 'sick',
  emergency = 'emergency',
}

export enum LeaveStatus {
  draft = 'draft',
  submitted = 'submitted',
  approved = 'approved',
  rejected = 'rejected',
  cancelled = 'cancelled',
}

export enum EmploymentStatus {
  active = 'active',
  inactive = 'inactive',
  terminated = 'terminated',
}

export enum BalanceStatus {
  active = 'active',
  exhausted = 'exhausted',
}

export enum NotificationType {
  leave_submitted = 'leave_submitted',
  leave_approved = 'leave_approved',
  leave_rejected = 'leave_rejected',
  leave_cancelled = 'leave_cancelled',
}

export enum NotificationStatus {
  pending = 'pending',
  sent = 'sent',
  read = 'read',
  archived = 'archived',
}
