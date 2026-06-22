export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  requiresDocumentation: boolean;
  createdAt: Date;
}

export interface CreateLeaveTypeDto {
  name: string;
  description?: string | null;
  requiresDocumentation?: boolean;
}
