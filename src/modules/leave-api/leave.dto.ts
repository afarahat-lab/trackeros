import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectLeaveRequestDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CancelLeaveRequestDto {}

export class DiscardLeaveRequestDto {}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  managerComment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceResponse {
  leaveTypeId: string;
  balance: number;
  year: number;
}
