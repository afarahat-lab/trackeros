import type { Employee } from '../../../../src/modules/employee';
import {
  requireRole,
  roleInherits,
  isOwnResource,
  isSubordinate,
} from '../../../../src/modules/auth/rbac';
import type { AuthUser } from '../../../../src/modules/auth/auth.middleware';
import { EmploymentStatus, UserRole } from '../../../../src/shared/types';

interface FakeReply {
  statusCode: number;
  body: unknown;
  status(code: number): FakeReply;
  send(body: unknown): FakeReply;
}

function makeReply(): FakeReply {
  const reply: FakeReply = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return reply;
}

function makeRequest(user?: AuthUser): { user?: AuthUser } {
  return { user };
}

function employee(id: string, managerId: string | null = null): Employee {
  return {
    id,
    employeeNumber: `E-${id}`,
    firstName: 'First',
    lastName: 'Last',
    email: `${id}@example.com`,
    managerId,
    department: null,
    hireDate: new Date('2020-01-01'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('requireRole', () => {
  it('returns 403 FORBIDDEN when the principal lacks the required role', async () => {
    const guard = requireRole(UserRole.hr_admin);
    const request = makeRequest({ id: 'emp-carol', role: UserRole.manager });
    const reply = makeReply();

    await guard(request as never, reply as never);

    expect(reply.statusCode).toBe(403);
    expect(reply.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns 401 when no principal is present', async () => {
    const guard = requireRole(UserRole.employee);
    const request = makeRequest(undefined);
    const reply = makeReply();

    await guard(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('admits a matching role and leaves the reply untouched', async () => {
    const guard = requireRole(UserRole.manager);
    const request = makeRequest({ id: 'emp-carol', role: UserRole.manager });
    const reply = makeReply();

    await guard(request as never, reply as never);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toBeUndefined();
  });

  it('admits hr_admin for a manager-required route (supersedes)', async () => {
    const guard = requireRole(UserRole.manager);
    const request = makeRequest({ id: 'emp-dave', role: UserRole.hr_admin });
    const reply = makeReply();

    await guard(request as never, reply as never);

    expect(reply.statusCode).toBe(200);
  });

  it('denies a bare employee from a manager-required route', async () => {
    const guard = requireRole(UserRole.manager);
    const request = makeRequest({ id: 'emp-alice', role: UserRole.employee });
    const reply = makeReply();

    await guard(request as never, reply as never);

    expect(reply.statusCode).toBe(403);
  });
});

describe('roleInherits', () => {
  it('manager inherits every employee permission', () => {
    expect(roleInherits(UserRole.manager, UserRole.employee)).toBe(true);
  });

  it('hr_admin inherits employee and manager permissions', () => {
    expect(roleInherits(UserRole.hr_admin, UserRole.employee)).toBe(true);
    expect(roleInherits(UserRole.hr_admin, UserRole.manager)).toBe(true);
  });

  it('employee never inherits manager or hr_admin permissions', () => {
    expect(roleInherits(UserRole.employee, UserRole.manager)).toBe(false);
    expect(roleInherits(UserRole.employee, UserRole.hr_admin)).toBe(false);
  });

  it('manager never inherits hr_admin permission', () => {
    expect(roleInherits(UserRole.manager, UserRole.hr_admin)).toBe(false);
  });
});

describe('isOwnResource', () => {
  it('is own when the employeeId matches the actor id', () => {
    expect(isOwnResource('emp-alice', 'emp-alice')).toBe(true);
  });

  it('is not own when ids differ', () => {
    expect(isOwnResource('emp-alice', 'emp-bob')).toBe(false);
  });
});

describe('isSubordinate', () => {
  it('resolves a subordinate through the employee service findByManager', async () => {
    const managerId = 'emp-carol';
    const subordinateId = 'emp-alice';
    const service = {
      findByManager: jest.fn().mockResolvedValue([
        employee(subordinateId, managerId),
        employee('emp-bob', managerId),
      ]),
    };

    await expect(isSubordinate(managerId, subordinateId, service)).resolves.toBe(true);
    expect(service.findByManager).toHaveBeenCalledWith(managerId);
  });

  it('returns false for a manager trying to approve their own request (self-approval denied)', async () => {
    const managerId = 'emp-carol';
    const service = {
      findByManager: jest.fn().mockResolvedValue([employee(managerId, 'someone-else')]),
    };

    await expect(isSubordinate(managerId, managerId, service)).resolves.toBe(false);
    expect(service.findByManager).not.toHaveBeenCalled();
  });

  it('returns false when the employee is not among the manager subordinates', async () => {
    const service = {
      findByManager: jest.fn().mockResolvedValue([employee('emp-bob', 'emp-carol')]),
    };

    await expect(isSubordinate('emp-carol', 'emp-alice', service)).resolves.toBe(false);
  });
});
