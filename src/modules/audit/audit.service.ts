import { AuditAction } from '../../shared/types';
import { ValidationError, NotFoundError } from '../../shared/errors';
import { AuditLog, CreateAuditLogInput } from './audit.model';
import { IAuditRepository } from './audit.repository.interface';
import { IAuditService } from './audit.service.interface';

export class AuditService implements IAuditService {
  constructor(private readonly repository: IAuditRepository) {}

  async record(input: CreateAuditLogInput): Promise<AuditLog> {
    this.validate(input);
    return this.repository.create(input);
  }

  async getById(id: string): Promise<AuditLog> {
    const auditLog = await this.repository.findById(id);
    if (!auditLog) {
      throw new NotFoundError('Audit log not found');
    }
    return auditLog;
  }

  private validate(input: CreateAuditLogInput): void {
    const requiredStrings: Array<[keyof CreateAuditLogInput, string]> = [
      ['actorId', 'actorId'],
      ['entityType', 'entityType'],
      ['entityId', 'entityId'],
    ];

    for (const [key, label] of requiredStrings) {
      const value = input[key];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new ValidationError(`Invalid ${label}`);
      }
    }

    if (!Object.values(AuditAction).includes(input.action)) {
      throw new ValidationError('Invalid action');
    }
  }
}
