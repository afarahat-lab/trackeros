import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateLeaveRequestApiDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  leaveTypeId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
