export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  details: Record<string, unknown>;
}