import { IAuditService } from "./audit.service.interface";
import { IAuditRepository } from "./audit.repository.interface";
import { AuditRecord, AppError } from "../../shared/types/index";

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async logEntry(entityType: string, entityId: string, action: string, changedBy: string, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>): Promise<AuditRecord> {
    try {
      return await this.auditRepository.create({ entityType, entityId, action, changedBy, oldValues, newValues });
    } catch (error) {
      throw new AppError(`Failed to log audit entry: ${(error as Error).message}`, 500);
    }
  }

  async getAuditTrail(entityType: string, entityId: string): Promise<AuditRecord[]> {
    try {
      return await this.auditRepository.findByEntity(entityType, entityId);
    } catch (error) {
      throw new AppError(`Failed to get audit trail: ${(error as Error).message}`, 500);
    }
  }
}
