import { NotificationService } from '../../../../src/modules/notification/notification.service';
import { LeaveRequestDTO } from '../../../../src/shared/types/index';
import { LeaveStatus } from '../../../../src/shared/types/enums';

function makeRequest(overrides: Partial<LeaveRequestDTO> = {}): LeaveRequestDTO {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    reason: 'Vacation',
    rejectionReason: undefined,
    status: LeaveStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new NotificationService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('notifyLeaveSubmitted', () => {
    it('should log the submitted notification without throwing', async () => {
      const request = makeRequest({ status: LeaveStatus.SUBMITTED });

      await expect(service.notifyLeaveSubmitted(request)).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleLogSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[Notification] Leave submitted');
      expect(logMessage).toContain('requestId=lr-1');
      expect(logMessage).toContain('employeeId=emp-1');
      expect(logMessage).toContain('leaveType=lt-annual');
    });
  });

  describe('notifyLeaveApproved', () => {
    it('should log the approved notification without throwing', async () => {
      const request = makeRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: '2026-06-16T10:00:00.000Z',
      });

      await expect(service.notifyLeaveApproved(request)).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleLogSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[Notification] Leave approved');
      expect(logMessage).toContain('requestId=lr-1');
      expect(logMessage).toContain('approvedBy=mgr-1');
    });
  });

  describe('notifyLeaveRejected', () => {
    it('should log the rejected notification with rejection reason', async () => {
      const request = makeRequest({
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Insufficient staffing',
      });

      await expect(service.notifyLeaveRejected(request)).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleLogSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[Notification] Leave rejected');
      expect(logMessage).toContain('reason=Insufficient staffing');
    });

    it('should log the rejected notification with N/A when no rejection reason', async () => {
      const request = makeRequest({
        status: LeaveStatus.REJECTED,
        rejectionReason: undefined,
      });

      await expect(service.notifyLeaveRejected(request)).resolves.toBeUndefined();

      const logMessage = consoleLogSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('reason=N/A');
    });
  });

  describe('notifyLeaveCancelled', () => {
    it('should log the cancelled notification without throwing', async () => {
      const request = makeRequest({
        status: LeaveStatus.CANCELLED,
        cancelledAt: '2026-06-17T10:00:00.000Z',
      });

      await expect(service.notifyLeaveCancelled(request)).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleLogSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[Notification] Leave cancelled');
      expect(logMessage).toContain('cancelledAt=2026-06-17T10:00:00.000Z');
    });
  });

  describe('all notification methods', () => {
    it('should all resolve to void without throwing', async () => {
      const request = makeRequest();

      await expect(service.notifyLeaveSubmitted(request)).resolves.toBeUndefined();
      await expect(service.notifyLeaveApproved(request)).resolves.toBeUndefined();
      await expect(service.notifyLeaveRejected(request)).resolves.toBeUndefined();
      await expect(service.notifyLeaveCancelled(request)).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });
  });
});
