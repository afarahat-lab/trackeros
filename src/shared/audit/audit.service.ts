export interface IAuditService {
  log(action: string, details: Record<string, unknown>): Promise<void>;
}
