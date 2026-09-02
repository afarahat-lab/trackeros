import type { UserRole } from '../../shared/types';
import { UserRole as UserRoleValue } from '../../shared/types';

/**
 * The auth principal populated onto `request.user` after successful JWT
 * verification. The shape is fixed by the auth contract: an `id` (the
 * authenticated party's principal identifier) and a `role` restricted to the
 * {@link UserRole} enum.
 */
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

const USER_ROLE_VALUES: readonly string[] = Object.values(UserRoleValue) as string[];

/**
 * Narrow a decoded JWT `role` claim to the {@link UserRole} enum. Returns false
 * for any value outside the role matrix, so a token can never grant a role
 * that is not one of `employee` | `manager` | `hr_admin`.
 */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLE_VALUES.includes(value);
}
