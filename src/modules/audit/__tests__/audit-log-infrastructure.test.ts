import { describe, it, expect, vi } from 'vitest';
import { AuditLogService } from '../service/audit-log-service';
import { AuditLogRepository } from '../repository/audit-log-repository';

// SC-2: The GET /audit/logs endpoint uses the existing audit-log infrastructure.
describe('SC-2: Audit Log Infrastructure', () => {
  it('should use the AuditLogRepository to fetch logs', async () => {
    const mockRepository = {
      getAuditLogs: vi.fn().mockResolvedValue([])
    };
    const service = new AuditLogService(mockRepository as unknown as AuditLogRepository);

    await service.getAuditLogs('2023-01-01', '2023-12-31', 10);

    expect(mockRepository.getAuditLogs).toHaveBeenCalledWith('2023-01-01', '2023-12-31', 10);
  });

  it('should handle repository errors gracefully', async () => {
    const mockRepository = {
      getAuditLogs: vi.fn().mockRejectedValue(new Error('Database error'))
    };
    const service = new AuditLogService(mockRepository as unknown as AuditLogRepository);

    await expect(service.getAuditLogs('2023-01-01', '2023-12-31', 10)).rejects.toThrow('Database error');
  });
});