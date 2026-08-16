import { IAuditService } from './audit.service.interface';
import { IAuditRepository } from './audit.repository';

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    performedBy: string | null;
  }): Promise<void> {
    await this.auditRepository.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValues: params.oldValues,
      newValues: params.newValues,
      performedBy: params.performedBy,
      performedAt: new Date(),
    });
  }
}
