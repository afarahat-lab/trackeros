import { FastifyReply, FastifyRequest } from 'fastify';

import { UserRole } from '../../shared/types';
import type { AuthenticatedUser } from './authenticated-user';

const roleRank: Record<UserRole, number> = {
  [UserRole.employee]: 1,
  [UserRole.manager]: 2,
  [UserRole.hr_admin]: 3,
};

/** True iff `user` satisfies the minimum `required` role (manager inherits employee, hr_admin supersedes both). */
export function hasRole(user: AuthenticatedUser, required: UserRole): boolean {
  return roleRank[user.role] >= roleRank[required];
}

/**
 * `true` iff the principal owns the resource: its `employeeId` equals the
 * authenticated principal's id. This is the sole ownership test used by
 * leave routes for "view own balances" and "cancel own request".
 */
export function isOwnResource(user: AuthenticatedUser, employeeId: string): boolean {
  return user.id === employeeId;
}

/**
 * `true` iff `manager` may act (approve/reject) on `applicant`'s request: the
 * applicant reports directly to the manager (`applicant.managerId ===
 * manager.id`) and is not the manager themself (self-approval always denied).
 *
 * `managerId` must be read from the applicant via the employee module
 * (`IEmployeeService.findByManager` / `Employee.managerId`); this helper never
 * touches the employees table itself.
 */
export function isSubordinate(
  manager: AuthenticatedUser,
  applicantId: string,
  applicantManagerId: string | null
): boolean {
  return applicantManagerId === manager.id && applicantId !== manager.id;
}

type FastifyPreHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void> | void;

/**
 * Route-level RBAC guard. Produces a `preHandler` that rejects requests whose
 * authenticated principal does not meet the minimum role with `403` and the
 * `{ error, code }` body (`code: FORBIDDEN`). The matrix is enforced here at
 * the route boundary only — never inline in a service.
 */
export function requireRole(required: UserRole): FastifyPreHandler {
  return function requireRoleGuard(request: FastifyRequest, reply: FastifyReply): void {
    const user = request.user;
    if (!user || !hasRole(user, required)) {
      reply.status(403).send({
        error: 'Insufficient permissions for this action',
        code: 'FORBIDDEN',
      });
      return;
    }
  };
}
