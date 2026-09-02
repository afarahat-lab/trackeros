import type { FastifyReply, FastifyRequest } from 'fastify';

import { UserRole } from '../../../../src/shared/types';
import { hasRole, isOwnResource, isSubordinate, requireRole } from '../../../../src/modules/auth/rbac';
import type { AuthenticatedUser } from '../../../../src/modules/auth';

const user = (id: string, role: UserRole): AuthenticatedUser => ({ id, role });

describe('hasRole', () => {
  it('employee satisfies employee checkout', () => {
    expect(hasRole(user('e1', UserRole.employee), UserRole.employee)).toBe(true);
  });

  it('manager inherits employee permissions', () => {
    expect(hasRole(user('m1', UserRole.manager), UserRole.employee)).toBe(true);
    expect(hasRole(user('m1', UserRole.manager), UserRole.manager)).toBe(true);
  });

  it('hr_admin supersedes manager and employee', () => {
    expect(hasRole(user('h1', UserRole.hr_admin), UserRole.employee)).toBe(true);
    expect(hasRole(user('h1', UserRole.hr_admin), UserRole.manager)).toBe(true);
    expect(hasRole(user('h1', UserRole.hr_admin), UserRole.hr_admin)).toBe(true);
  });

  it('employee does not satisfy manager or hr_admin roles', () => {
    expect(hasRole(user('e1', UserRole.employee), UserRole.manager)).toBe(false);
    expect(hasRole(user('e1', UserRole.employee), UserRole.hr_admin)).toBe(false);
  });

  it('manager does not satisfy hr_admin', () => {
    expect(hasRole(user('m1', UserRole.manager), UserRole.hr_admin)).toBe(false);
  });
});

describe('isOwnResource', () => {
  it('is true when principal id equals the resource employeeId', () => {
    expect(isOwnResource(user('e1', UserRole.employee), 'e1')).toBe(true);
  });

  it('is false when the principal id differs', () => {
    expect(isOwnResource(user('e1', UserRole.employee), 'e2')).toBe(false);
  });
});

describe('isSubordinate', () => {
  it('allows a manager to act on a direct report', () => {
    expect(isSubordinate(user('m1', UserRole.manager), 'e2', 'm1')).toBe(true);
  });

  it('denies self-approval even when managerId matches', () => {
    expect(isSubordinate(user('m1', UserRole.manager), 'm1', 'm1')).toBe(false);
  });

  it('denies when the applicant reports to a different manager', () => {
    expect(isSubordinate(user('m1', UserRole.manager), 'e2', 'm2')).toBe(false);
  });

  it('denies when the applicant has no manager', () => {
    expect(isSubordinate(user('m1', UserRole.manager), 'e2', null)).toBe(false);
  });
});

describe('requireRole', () => {
  function makeRequest(principal?: AuthenticatedUser): FastifyRequest {
    return { user: principal } as unknown as FastifyRequest;
  }

  function makeReply(): { reply: FastifyReply; send: jest.Mock } {
    const send = jest.fn();
    const reply = { status: jest.fn().mockReturnThis(), send } as unknown as FastifyReply;
    return { reply, send };
  }

  it('allows a principal meeting the required role through', () => {
    const guard = requireRole(UserRole.manager);
    const { reply, send } = makeReply();

    guard(makeRequest(user('m1', UserRole.manager)), reply);

    expect(send).not.toHaveBeenCalled();
  });

  it('inherits: a manager passes an employee guard', () => {
    const guard = requireRole(UserRole.employee);
    const { reply, send } = makeReply();

    guard(makeRequest(user('m1', UserRole.manager)), reply);

    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a lower role with 403 and code FORBIDDEN', () => {
    const guard = requireRole(UserRole.manager);
    const { reply, send } = makeReply();

    guard(makeRequest(user('e1', UserRole.employee)), reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith({
      error: 'Insufficient permissions for this action',
      code: 'FORBIDDEN',
    });
  });

  it('rejects an unauthenticated request (no user) with 403', () => {
    const guard = requireRole(UserRole.hr_admin);
    const { reply, send } = makeReply();

    guard(makeRequest(undefined), reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FORBIDDEN' })
    );
  });
});
