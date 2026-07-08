import { Knex } from 'knex';
import { BaseKnexRepository, IBaseRepository } from '../../shared/base.repository';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestStatusDto } from './leave.model';

export interface ILeaveRepository extends IBaseRepository<LeaveRequest> {
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: string): Promise<LeaveRequest[]>;
  findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest>;
}

export class KnexLeaveRepository
  extends BaseKnexRepository<LeaveRequest>
  implements ILeaveRepository
{
  constructor(knex: Knex) {
    super(knex, 'leave_requests');
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    return this.knex(this.tableName).where({ employeeId }).select('*');
  }

  async findByStatus(status: string): Promise<LeaveRequest[]> {
    return this.knex(this.tableName).where({ status }).select('*');
  }

  async findOverlapping(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<LeaveRequest[]> {
    const query = this.knex(this.tableName)
      .where({ employeeId })
      .whereIn('status', ['SUBMITTED', 'APPROVED'])
      .where(function () {
        this.where(function () {
          this.where('startDate', '<=', endDate).andWhere('endDate', '>=', startDate);
        });
      });

    if (excludeId) {
      query.andWhere('id', '!=', excludeId);
    }

    return query.select('*');
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const [row] = await this.knex(this.tableName)
      .insert({
        ...dto,
        status: 'DRAFT',
      })
      .returning('*');
    return row;
  }

  async updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest> {
    const [row] = await this.knex(this.tableName)
      .where({ id })
      .update(dto)
      .returning('*');
    return row;
  }
}
