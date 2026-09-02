export type { AuthenticatedUser } from './authenticated-user';
export { isUserRole } from './authenticated-user';
export { AuthenticationError } from './auth.errors';
export { authenticate } from './auth.middleware';
export {
  hasRole,
  isOwnResource,
  isSubordinate,
  requireRole,
} from './rbac';
export type { LocalUser } from './local-users';
export { LOCAL_USERS, findLocalUserById } from './local-users';
