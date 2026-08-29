jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { AuditService } from '../../../../src/modules/audit/audit.service';
import {
  AuditLogInput,
  IAuditLogRepository
} from '../../../../src/modules/audit/audit.model';

describe('AuditService', () => {
  let repository: jest.Mocked<IAuditLogRepository>;
  let service: AuditService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEntity: jest.fn()
    };
    repository.create.mockImplementation(async (log) => log);
    service = new AuditService(repository);
  });

  function baseInput(): AuditLogInput {
    return {
      entityType: 'LeaveRequest',
      entityId: 'req-1',
      action: 'APPROVE'
    };
  }

  it('sets performedAt at write time and generates an id', async () => {
    const result = await service.record(baseInput());

    expect(result.id).toHaveLength(36);
    expect(result.performedAt).toBeInstanceOf(Date);
  });

  it('coerces absent oldValues/newValues/performedBy to null', async () => {
    const result = await service.record(baseInput());

    expect(result.oldValues).toBeNull();
    expect(result.newValues).toBeNull();
    expect(result.performedBy).toBeNull();
  });

  it('preserves provided values and allows performedBy null', async () => {
    const result = await service.record({
      ...baseInput(),
      oldValues: { status: 'PENDING' },
      newValues: { status: 'APPROVED' },
      performedBy: null
    });

    expect(result.oldValues).toEqual({ status: 'PENDING' });
    expect(result.newValues).toEqual({ status: 'APPROVED' });
    expect(result.performedBy).toBeNull();
  });

  it('persists via repository.create with the same client passthrough', async () => {
    const client = { query: jest.fn() };

    await service.record(baseInput(), client as never);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][1]).toBe(client);
  });
});
