import { NotificationService } from "../../../../src/modules/notification/notification.service";
import { INotificationRepository } from "../../../../src/modules/notification/notification.repository.interface";
import { Notification } from "../../../../src/shared/types/index";

describe("NotificationService", () => {
  let service: NotificationService;
  let mockRepo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      markAsRead: jest.fn(),
      markAsSent: jest.fn(),
    };
    service = new NotificationService(mockRepo);
  });

  it("should create a notification", async () => {
    const notification: Notification = { id: "1", employeeId: "emp1", message: "test", createdAt: new Date(), sentAt: undefined, readAt: undefined };
    mockRepo.create.mockResolvedValue(notification);
    const result = await service.createNotification("emp1", "test", "lr1");
    expect(result).toEqual(notification);
    expect(mockRepo.create).toHaveBeenCalledWith({ employeeId: "emp1", leaveRequestId: "lr1", message: "test" });
  });

  // Additional tests for other methods would follow the same pattern
});
