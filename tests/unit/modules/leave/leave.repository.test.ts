import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  AuditRecord,
  CreateLeaveRequestInput,
  LeaveRequest,
} from '../../../../src/modules/leave/leave.model';
import {
  PostgreSQLLeaveRequestRepository,
} from '../../../../src/modules/leave/leave.repository';

describe('SC-2: repository exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports PostgreSQLLeaveRequestRepository', () => {
    expect(PostgreSQLLeaveRequestRepository).toBeDefined();
    expect(typeof PostgreSQLLeaveRequestRepository).toBe('function');
  });
});

describe('SC-3 and SC-4: repository contract signatures and audit requirements', () => {
  it('defines all required repository methods', () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    expect(typeof repository.createLeaveRequest).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.approveLeaveRequest).toBe('function');
    expect(typeof repository.rejectLeaveRequest).toBe('function');
    expect(typeof repository.findByEmployeeId).toBe('function');
  });

  it('requires audit parameters on all state-changing methods by declared arity', () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    expect(repository.createLeaveRequest.length).toBe(2);
    expect(repository.approveLeaveRequest.length).toBe(3);
    expect(repository.rejectLeaveRequest.length).toBe(3);
  });

  it('matches the expected repository contract at type level', () => {
    type RepositoryContract = {
      createLeaveRequest(
        input: CreateLeaveRequestInput,
        auditRecord: AuditRecord,
      ): Promise<LeaveRequest>;
      findById(id: string): Promise<LeaveRequest | null>;
      approveLeaveRequest(
        id: string,
        approvedBy: string,
        auditRecord: AuditRecord,
      ): Promise<LeaveRequest>;
      rejectLeaveRequest(
        id: string,
        rejectedBy: string,
        auditRecord: AuditRecord,
      ): Promise<LeaveRequest>;
      findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
    };

    const repository: RepositoryContract = new PostgreSQLLeaveRequestRepository();

    expect(repository).toBeInstanceOf(PostgreSQLLeaveRequestRepository);
  });
});

describe('SC-5: repository behavior scaffolding', () => {
  it('throws not implemented for createLeaveRequest', async () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    const input: CreateLeaveRequestInput = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date(),
      endDate: new Date(),
    };

    const audit: AuditRecord = {
      entityId: 'lr-1',
      entityType: 'LEAVE_REQUEST',
      action: 'CREATE',
      performedBy: 'manager-1',
      createdAt: new Date(),
    };

    await expect(repository.createLeaveRequest(input, audit)).rejects.toThrow('Not implemented');
  });

  it('throws not implemented for findById', async () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    await expect(repository.findById('lr-1')).rejects.toThrow('Not implemented');
  });

  it('throws not implemented for approveLeaveRequest', async () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    const audit: AuditRecord = {
      entityId: 'lr-1',
      entityType: 'LEAVE_REQUEST',
      action: 'APPROVE',
      performedBy: 'manager-1',
      createdAt: new Date(),
    };

    await expect(repository.approveLeaveRequest('lr-1', 'manager-1', audit)).rejects.toThrow('Not implemented');
  });

  it('throws not implemented for rejectLeaveRequest', async () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    const audit: AuditRecord = {
      entityId: 'lr-1',
      entityType: 'LEAVE_REQUEST',
      action: 'REJECT',
      performedBy: 'manager-1',
      createdAt: new Date(),
    };

    await expect(repository.rejectLeaveRequest('lr-1', 'manager-1', audit)).rejects.toThrow('Not implemented');
  });

  it('throws not implemented for findByEmployeeId', async () => {
    const repository = new PostgreSQLLeaveRequestRepository();

    await expect(repository.findByEmployeeId('emp-1')).rejects.toThrow('Not implemented');
  });
});
