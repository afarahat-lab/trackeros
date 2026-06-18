import { LeavePolicy, CreateLeavePolicyDto } from './policy.model';

export interface ILeavePolicyRepository {
  create(data: CreateLeavePolicyDto): Promise<LeavePolicy>;
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  update(id: string, data: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy>;
  delete(id: string): Promise<void>;
}

export class PgLeavePolicyRepository implements ILeavePolicyRepository {
  async create(data: CreateLeavePolicyDto): Promise<LeavePolicy> {
    throw new Error('Method not implemented.');
  }
  async findById(id: string): Promise<LeavePolicy | null> {
    throw new Error('Method not implemented.');
  }
  async findAll(): Promise<LeavePolicy[]> {
    throw new Error('Method not implemented.');
  }
  async update(id: string, data: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy> {
    throw new Error('Method not implemented.');
  }
  async delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
