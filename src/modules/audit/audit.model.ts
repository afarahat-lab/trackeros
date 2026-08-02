import type { BaseEntity } from '../../shared/types/base-entity.interface';

export interface AuditLog extends BaseEntity {
  actorId: string;
  action: string;
  targetId: string;
  targetType: string;
  details: Record<string, unknown> | null;
  timestamp: Date;
}
