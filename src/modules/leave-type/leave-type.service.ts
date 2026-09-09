import { LeaveTypeCode } from '../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors';
import { LeaveType, CreateLeaveTypeInput } from './leave-type.model';
import { ILeaveTypeRepository } from './leave-type.repository.interface';
import { ILeaveTypeService } from './leave-type.service.interface';

export class LeaveTypeService implements ILeaveTypeService {
  constructor(private readonly repository: ILeaveTypeRepository) {}

  async createLeaveType(input: CreateLeaveTypeInput): Promise<LeaveType> {
    this.validate(input);

    const existing = await this.repository.findByCode(input.code);
    if (existing) {
      throw new ConflictError('Leave type already exists');
    }

    return this.repository.create(input);
  }

  async getLeaveTypeByCode(code: LeaveTypeCode): Promise<LeaveType> {
    const leaveType = await this.repository.findByCode(code);
    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }
    return leaveType;
  }

  private validate(input: CreateLeaveTypeInput): void {
    if (!Object.values(LeaveTypeCode).includes(input.code)) {
      throw new ValidationError('Invalid code');
    }

    if (typeof input.name !== 'string' || input.name.trim() === '') {
      throw new ValidationError('Invalid name');
    }

    if (
      typeof input.maxConsecutiveDays !== 'number' ||
      !Number.isInteger(input.maxConsecutiveDays) ||
      input.maxConsecutiveDays <= 0
    ) {
      throw new ValidationError('Invalid maxConsecutiveDays');
    }
  }
}
