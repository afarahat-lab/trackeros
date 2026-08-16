import { AuditLog } from '../../../../src/modules/audit';

describe('AuditLog interface', () => {
  const validAuditLog: AuditLog = {
    id: 'audit-001',
    entityType: 'LeaveRequest',
    entityId: 'lr-001',
    action: 'CREATE',
    oldValues: null,
    newValues: { status: 'SUBMITTED', employeeId: 'emp-001' },
    performedBy: 'emp-001',
    performedAt: new Date('2026-08-16T10:00:00Z'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-08-16T10:00:00Z'),
  };

  it('should accept a valid AuditLog shape with all fields', () => {
    expect(validAuditLog.id).toBe('audit-001');
    expect(validAuditLog.entityType).toBe('LeaveRequest');
    expect(validAuditLog.entityId).toBe('lr-001');
    expect(validAuditLog.action).toBe('CREATE');
    expect(validAuditLog.oldValues).toBeNull();
    expect(validAuditLog.newValues).toEqual({ status: 'SUBMITTED', employeeId: 'emp-001' });
    expect(validAuditLog.performedBy).toBe('emp-001');
    expect(validAuditLog.performedAt).toBeInstanceOf(Date);
    expect(validAuditLog.ipAddress).toBe('192.168.1.1');
    expect(validAuditLog.userAgent).toBe('Mozilla/5.0');
    expect(validAuditLog.createdAt).toBeInstanceOf(Date);
  });

  it('should allow oldValues to be null for CREATE actions', () => {
    const createLog: AuditLog = {
      ...validAuditLog,
      id: 'audit-002',
      action: 'CREATE',
      oldValues: null,
      newValues: { status: 'DRAFT' },
    };
    expect(createLog.oldValues).toBeNull();
    expect(createLog.newValues).not.toBeNull();
  });

  it('should allow newValues to be null for DELETE actions', () => {
    const deleteLog: AuditLog = {
      ...validAuditLog,
      id: 'audit-003',
      action: 'DELETE',
      oldValues: { status: 'APPROVED' },
      newValues: null,
    };
    expect(deleteLog.oldValues).not.toBeNull();
    expect(deleteLog.newValues).toBeNull();
  });

  it('should require both oldValues and newValues to be non-null for UPDATE actions', () => {
    const updateLog: AuditLog = {
      ...validAuditLog,
      id: 'audit-004',
      action: 'UPDATE',
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'SUBMITTED' },
    };
    expect(updateLog.oldValues).not.toBeNull();
    expect(updateLog.newValues).not.toBeNull();
  });

  it('should allow performedBy to be null for system actions', () => {
    const systemLog: AuditLog = {
      ...validAuditLog,
      id: 'audit-005',
      performedBy: null,
    };
    expect(systemLog.performedBy).toBeNull();
  });

  it('should allow ipAddress and userAgent to be null', () => {
    const minimalLog: AuditLog = {
      ...validAuditLog,
      id: 'audit-006',
      ipAddress: null,
      userAgent: null,
    };
    expect(minimalLog.ipAddress).toBeNull();
    expect(minimalLog.userAgent).toBeNull();
  });

  it('should support free-form action strings', () => {
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUBMIT', 'CANCEL'];
    actions.forEach((action) => {
      const log: AuditLog = {
        ...validAuditLog,
        id: `audit-action-${action}`,
        action,
        oldValues: action === 'CREATE' ? null : { status: 'DRAFT' },
        newValues: action === 'DELETE' ? null : { status: 'SUBMITTED' },
      };
      expect(log.action).toBe(action);
    });
  });

  it('should have exactly the expected field names', () => {
    const expectedFields = [
      'id',
      'entityType',
      'entityId',
      'action',
      'oldValues',
      'newValues',
      'performedBy',
      'performedAt',
      'ipAddress',
      'userAgent',
      'createdAt',
    ];

    const actualFields = Object.keys(validAuditLog).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(11);
  });
});
