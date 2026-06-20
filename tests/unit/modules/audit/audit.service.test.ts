import { AuditService } from "../../../../src/modules/audit/audit.service";
import { IAuditRepository } from "../../../../src/modules/audit/audit.repository.interface";
import { AuditRecord } from "../../../../src/shared/types/index";

describe("AuditService", () => {
  let service: AuditService;
  let mockRepo: jest.Mocked<IAuditRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByEntity: jest.fn(),
    };
    service = new AuditService(mockRepo);
  });

  it("should log an audit entry", async () => {
    const record: AuditRecord = { id: "1", entityType: "leave_request", entityId: "lr1", action: "created", changedBy: "emp1", changedAt: new Date(), details: JSON.stringify({ newValues: { status: "draft" } }) };
    mockRepo.create.mockResolvedValue(record);
    const result = await service.logEntry("leave_request", "lr1", "created", "emp1", undefined, { status: "draft" });
    expect(result).toEqual(record);
    expect(mockRepo.create).toHaveBeenCalledWith({ entityType: "leave_request", entityId: "lr1", action: "created", changedBy: "emp1", oldValues: undefined, newValues: { status: "draft" } });
  });

  // Additional tests for other methods would follow the same pattern
});
