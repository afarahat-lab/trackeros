import {
  NotificationService,
  INotificationService,
  LeaveNotification,
} from '../../../../src/modules/notification';
import { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { IEmployeeRepository, Employee } from '../../../../src/modules/employee';
import { LeaveRequest } from '../../../../src/modules/leave-request/leave-request.model';
import { LeaveStatus, NotificationStatus, EmploymentStatus } from '../../../../src/shared/types';

describe('NotificationService', () => {
  let service: INotificationService;
  let notificationRepo: jest.Mocked<INotificationRepository>;
  let employeeRepo: jest.Mocked<IEmployeeRepository>;

  const mockEmployee: Employee = {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2025-01-01'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockEmployeeNoManager: Employee = {
    ...mockEmployee,
    id: 'emp-002',
    employeeNumber: 'E002',
    managerId: null,
  };

  const mockLeaveRequest: LeaveRequest = {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-05'),
    reason: 'Vacation',
    status: LeaveStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-05-15'),
    updatedAt: new Date('2026-05-15'),
  };

  const mockNotification: LeaveNotification = {
    id: 'notif-001',
    recipientId: 'mgr-001',
    type: 'SUBMITTED',
    title: 'New Leave Request Submitted',
    message: 'John Doe has submitted a leave request for 2026-06-01 to 2026-06-05.',
    leaveRequestId: 'lr-001',
    status: NotificationStatus.PENDING,
    createdAt: new Date('2026-05-15'),
    readAt: null,
  };

  beforeEach(() => {
    notificationRepo = {
      findById: jest.fn(),
      findByRecipientId: jest.fn(),
      findByLeaveRequestId: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<INotificationRepository>;

    employeeRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IEmployeeRepository>;

    service = new NotificationService(notificationRepo, employeeRepo);
  });

  describe('notifyLeaveSubmitted', () => {
    it('should create a SUBMITTED notification for the manager', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployee);
      notificationRepo.create.mockResolvedValue(mockNotification);

      const result = await service.notifyLeaveSubmitted(mockLeaveRequest);

      expect(result).toEqual(mockNotification);
      expect(employeeRepo.findById).toHaveBeenCalledWith('emp-001');
      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'mgr-001',
          type: 'SUBMITTED',
          leaveRequestId: 'lr-001',
          status: NotificationStatus.PENDING,
          readAt: null,
        }),
      );
    });

    it('should throw EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.notifyLeaveSubmitted(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });

    it('should throw NO_MANAGER_ASSIGNED when employee has no manager', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployeeNoManager);

      await expect(service.notifyLeaveSubmitted(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee has no manager assigned',
        code: 'NO_MANAGER_ASSIGNED',
      });
    });
  });

  describe('notifyLeaveApproved', () => {
    it('should create an APPROVED notification for the employee', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployee);
      const approvedNotification: LeaveNotification = {
        ...mockNotification,
        type: 'APPROVED',
        title: 'Leave Request Approved',
        recipientId: 'emp-001',
      };
      notificationRepo.create.mockResolvedValue(approvedNotification);

      const result = await service.notifyLeaveApproved(mockLeaveRequest);

      expect(result.type).toBe('APPROVED');
      expect(result.recipientId).toBe('emp-001');
      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'emp-001',
          type: 'APPROVED',
          status: NotificationStatus.PENDING,
          readAt: null,
        }),
      );
    });

    it('should throw EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.notifyLeaveApproved(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });
  });

  describe('notifyLeaveRejected', () => {
    it('should create a REJECTED notification for the employee', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployee);
      const rejectedNotification: LeaveNotification = {
        ...mockNotification,
        type: 'REJECTED',
        title: 'Leave Request Rejected',
        recipientId: 'emp-001',
      };
      notificationRepo.create.mockResolvedValue(rejectedNotification);

      const result = await service.notifyLeaveRejected(mockLeaveRequest);

      expect(result.type).toBe('REJECTED');
      expect(result.recipientId).toBe('emp-001');
    });

    it('should throw EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.notifyLeaveRejected(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });
  });

  describe('notifyLeaveCancelled', () => {
    it('should create a CANCELLED notification for the manager', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployee);
      const cancelledNotification: LeaveNotification = {
        ...mockNotification,
        type: 'CANCELLED',
        title: 'Leave Request Cancelled',
      };
      notificationRepo.create.mockResolvedValue(cancelledNotification);

      const result = await service.notifyLeaveCancelled(mockLeaveRequest);

      expect(result.type).toBe('CANCELLED');
      expect(result.recipientId).toBe('mgr-001');
    });

    it('should throw EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.notifyLeaveCancelled(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });

    it('should throw NO_MANAGER_ASSIGNED when employee has no manager', async () => {
      employeeRepo.findById.mockResolvedValue(mockEmployeeNoManager);

      await expect(service.notifyLeaveCancelled(mockLeaveRequest)).rejects.toEqual({
        error: 'Employee has no manager assigned',
        code: 'NO_MANAGER_ASSIGNED',
      });
    });
  });

  describe('getNotificationsForUser', () => {
    it('should return notifications for a recipient', async () => {
      const notifications = [mockNotification];
      notificationRepo.findByRecipientId.mockResolvedValue(notifications);

      const result = await service.getNotificationsForUser('mgr-001');

      expect(result).toEqual(notifications);
      expect(notificationRepo.findByRecipientId).toHaveBeenCalledWith('mgr-001');
    });

    it('should return an empty array when no notifications exist', async () => {
      notificationRepo.findByRecipientId.mockResolvedValue([]);

      const result = await service.getNotificationsForUser('mgr-001');

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should update status to READ for a PENDING notification', async () => {
      const pendingNotification: LeaveNotification = {
        ...mockNotification,
        status: NotificationStatus.PENDING,
        readAt: null,
      };
      notificationRepo.findById.mockResolvedValue(pendingNotification);
      notificationRepo.updateStatus.mockResolvedValue({
        ...pendingNotification,
        status: NotificationStatus.READ,
        readAt: new Date(),
      });

      await service.markAsRead('notif-001');

      expect(notificationRepo.findById).toHaveBeenCalledWith('notif-001');
      expect(notificationRepo.updateStatus).toHaveBeenCalledWith('notif-001', NotificationStatus.READ);
    });

    it('should update status to READ for a SENT notification', async () => {
      const sentNotification: LeaveNotification = {
        ...mockNotification,
        status: NotificationStatus.SENT,
        readAt: null,
      };
      notificationRepo.findById.mockResolvedValue(sentNotification);
      notificationRepo.updateStatus.mockResolvedValue({
        ...sentNotification,
        status: NotificationStatus.READ,
        readAt: new Date(),
      });

      await service.markAsRead('notif-001');

      expect(notificationRepo.updateStatus).toHaveBeenCalledWith('notif-001', NotificationStatus.READ);
    });

    it('should be idempotent for an already READ notification', async () => {
      const readNotification: LeaveNotification = {
        ...mockNotification,
        status: NotificationStatus.READ,
        readAt: new Date('2026-05-16'),
      };
      notificationRepo.findById.mockResolvedValue(readNotification);

      await service.markAsRead('notif-001');

      expect(notificationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should be idempotent for an ARCHIVED notification', async () => {
      const archivedNotification: LeaveNotification = {
        ...mockNotification,
        status: NotificationStatus.ARCHIVED,
        readAt: new Date('2026-05-16'),
      };
      notificationRepo.findById.mockResolvedValue(archivedNotification);

      await service.markAsRead('notif-001');

      expect(notificationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw NOTIFICATION_NOT_FOUND when notification does not exist', async () => {
      notificationRepo.findById.mockResolvedValue(null);

      await expect(service.markAsRead('notif-001')).rejects.toEqual({
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND',
      });
    });
  });
});
