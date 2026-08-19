import crypto from 'crypto';

import { EmploymentStatus } from '../../shared/types/index';
import { AuditRecord, IAuditRepository } from '../audit/index';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { CreateEmployeeDto, IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(
    private readonly repo: IEmployeeRepository,
    private readonly auditRepo: IAuditRepository,
  ) {}

  async getById(id: string): Promise<Employee | null> {
    return this.repo.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.repo.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.repo.findByManagerId(managerId);
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    const now = new Date();
    const employee: Employee = {
      id: crypto.randomUUID(),
      employeeNumber: data.employeeNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      managerId: data.managerId ?? null,
      department: data.department,
      hireDate: data.hireDate,
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const created = await this.repo.create(employee);

    const auditRecord: AuditRecord = {
      id: crypto.randomUUID(),
      entityType: 'Employee',
      entityId: created.id,
      action: 'CREATE',
      oldValues: null,
      newValues: this.employeeToRecord(created),
      performedBy: 'system',
      performedAt: now,
      ipAddress: undefined,
      userAgent: undefined,
      createdAt: now,
    };
    await this.auditRepo.create(auditRecord);

    return created;
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      return null;
    }

    const allowedFields: (keyof Employee)[] = [
      'firstName',
      'lastName',
      'email',
      'managerId',
      'department',
      'hireDate',
    ];
    const sanitized: Partial<Employee> = {};
    for (const key of allowedFields) {
      if (key in data) {
        (sanitized as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
      }
    }
    const updated = await this.repo.update(id, sanitized);
    if (!updated) {
      return null;
    }

    const now = new Date();
    const auditRecord: AuditRecord = {
      id: crypto.randomUUID(),
      entityType: 'Employee',
      entityId: updated.id,
      action: 'UPDATE',
      oldValues: this.employeeToRecord(existing),
      newValues: this.employeeToRecord(updated),
      performedBy: 'system',
      performedAt: now,
      ipAddress: undefined,
      userAgent: undefined,
      createdAt: now,
    };
    await this.auditRepo.create(auditRecord);

    return updated;
  }

  async terminate(id: string): Promise<Employee | null> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      return null;
    }
    const updated = await this.repo.update(id, {
      employmentStatus: EmploymentStatus.TERMINATED,
      terminationDate: new Date(),
    });
    if (!updated) {
      return null;
    }

    const now = new Date();
    const auditRecord: AuditRecord = {
      id: crypto.randomUUID(),
      entityType: 'Employee',
      entityId: updated.id,
      action: 'TERMINATE',
      oldValues: this.employeeToRecord(existing),
      newValues: this.employeeToRecord(updated),
      performedBy: 'system',
      performedAt: now,
      ipAddress: undefined,
      userAgent: undefined,
      createdAt: now,
    };
    await this.auditRepo.create(auditRecord);

    return updated;
  }

  private employeeToRecord(employee: Employee): Record<string, unknown> {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      managerId: employee.managerId,
      department: employee.department,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate,
      employmentStatus: employee.employmentStatus,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      deletedAt: employee.deletedAt,
    };
  }
}
