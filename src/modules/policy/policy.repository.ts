import { LeavePolicy, CreateLeavePolicyDto } from './policy.model';

export interface ILeavePolicyRepository {
  findAll(): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy | null>;
  delete(id: string): Promise<boolean>;
}
