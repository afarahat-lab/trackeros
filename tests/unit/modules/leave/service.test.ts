import { LeaveRequestService, LeaveRequestServiceImpl } from '../../../../src/modules/leave/leave.service';
import { LeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';
import { NotificationService } from '../../../../src/modules/notification/notification.service';
import { AuditLogService } from '../../../../src/modules/audit/audit.service';

describe('LeaveRequestService', () => {
  let mockLeaveRequestRepo: jest.Mocked<LeaveRequestRepository>;
  let mockLeaveBalanceRepo: jest.Mocked<LeaveBalanceRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;
  let service: LeaveRequestService;

  beforeEach(() => {
    mockLeaveRequestRepo = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByManagerId: jest.fn(),
      findByStatus: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    mockLeaveBalanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    mockNotificationService = {
      createNotification: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadNotifications: jest.fn(),
    };
    mockAuditLogService = {
      log: jest.fn(),
    };
    service = new LeaveRequestServiceImpl(
      mockLeaveRequestRepo,
      mockLeaveBalanceRepo,
      mockNotificationService,
      mockAuditLogService
    );
  });

  it('should be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('should have createDraft method', () => {
    expect(service.createDraft).toBeDefined();
  });

  it('should have submitRequest method', () => {
    expect(service.submitRequest).toBeDefined();
  });

  it('should have approveRequest method', () => {
    expect(service.approveRequest).toBeDefined();
  });

  it('should have rejectRequest method', () => {
    expect(service.rejectRequest).toBeDefined();
  });

  it('should have cancelRequest method', () => {
    expect(service.cancelRequest).toBeDefined();
  });

  it('should have getEmployeeRequests method', () => {
    expect(service.getEmployeeRequests).toBeDefined();
  });

  it('should have getManagerPendingRequests method', () => {
    expect(service.getManagerPendingRequests).toBeDefined();
  });
});
