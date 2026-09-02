import type { FastifyReply, FastifyRequest } from 'fastify';

import { UserRole } from '../../shared/types';
import type { IEmployeeService } from '../employee';
import type { AuthUser } from './auth.middleware';

/**
 * Fixed role hierarchy: manager inherits every employee permission and
 * hr_admin supersedes both. No role may be granted a permission outside this
 * matrix. Higher rank inherits every lower rank.
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.employee]: 1,
  [UserRole.manager]: 2,
  [UserRole.hr_admin]: 3,
};

export function roleInherits(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Route-level RBAC guard. Applies the inheritance matrix: pass `UserRole.employee`
 * to let every role through (manager and hr_admin inherit it), pass
 * `UserRole.manager` to admit managers and hr_admin, and `UserRole.hr_admin`
 * to admit only hr_admin. Authorization failure -> 403 (FORBIDDEN).
 */
export function requireRole(...requiredRoles: UserRole[]) {
  return async function requireRoleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user: AuthUser | undefined = request.user;
    if (!user) {
      reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const permitted = requiredRoles.some((required) => roleInherits(user.role, required));
    if (!permitted) {
      reply
        .status(403)
        .send({ error: 'You do not have permission to perform this action', code: 'FORBIDDEN' });
    }
  };
}

/**
 * A resource is "own" iff its employeeId equals the authenticated principal's
 * employee id.
 */
export function isOwnResource(actorId: string, employeeId: string): boolean {
  return actorId === employeeId;
}

/**
 * Manager-over-subordinate resolution. B is a subordinate of A iff
 * B.managerId === A.id; this is read exclusively via the employee module's
 * `findByManager` (never recomputed here). Self-approval is always denied:
 * a manager is never treated as their own subordinate.
 */
export async function isSubordinate(
  managerId: string,
  employeeId: string,
  employeeService: Pick<IEmployeeService, 'findByManager'>
): Promise<boolean> {
  if (managerId === employeeId) {
    return false;
  }

  const subordinates = await employeeService.findByManager(managerId);
  return subordinates.some((subordinate) => subordinate.id === employeeId);
}
