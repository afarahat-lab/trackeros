jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { NotificationService } from '../../../../src/modules/notification/notification.service';
import {
  NotificationInput,
  INotificationRepository
} from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  let repository: jest.Mocked<INotificationRepository>;
  let service: NotificationService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRecipient: jest.fn(),
      updateStatus: jest.fn()
    };
    repository.create.mockImplementation(async (notification) => notification);
    service = new NotificationService(repository);
  });

  function baseInput(): NotificationInput {
    return {
      recipientId: 'emp-1',
      type: 'LEAVE_APPROVED',
      title: 'Leave approved',
      message: 'Your leave was approved'
    };
  }

  it('sets createdAt at write time and generates an id', async () => {
    const result = await service.notify(baseInput());

    expect(result.id).toHaveLength(36);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('creates with status PENDING and readAt null', async () => {
    const result = await service.notify(baseInput());

    expect(result.status).toBe('PENDING');
    expect(result.readAt).toBeNull();
  });

  it('coerces absent related fields to null', async () => {
    const result = await service.notify(baseInput());

    expect(result.relatedEntityType).toBeNull();
    expect(result.relatedEntityId).toBeNull();
  });

  it('preserves provided related fields', async () => {
    const result = await service.notify({
      ...baseInput(),
      relatedEntityType: 'LeaveRequest',
      relatedEntityId: 'req-1'
    });

    expect(result.relatedEntityType).toBe('LeaveRequest');
    expect(result.relatedEntityId).toBe('req-1');
  });

  it('rejects input where only relatedEntityType is provided', async () => {
    await expect(
      service.notify({ ...baseInput(), relatedEntityType: 'LeaveRequest' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects input where only relatedEntityId is provided', async () => {
    await expect(
      service.notify({ ...baseInput(), relatedEntityId: 'req-1' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('persists via repository.create with the same client passthrough', async () => {
    const client = { query: jest.fn() };

    await service.notify(baseInput(), client as never);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][1]).toBe(client);
  });
});
