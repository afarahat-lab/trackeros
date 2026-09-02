import { UserRole } from '../../shared/types';

/**
 * A seeded local development identity. Local auth uses these records instead
 * of a mock OIDC provider: a JWT is issued against one of these users and the
 * `{ id, role }` it carries is what the middleware verifies. Records hold no
 * credentials, so none are hardcoded anywhere.
 */
export interface LocalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** Seeded local users for development. Immutable by contract. */
export const LOCAL_USERS: readonly LocalUser[] = [
  {
    id: 'emp-1001',
    email: 'ada@trackeros.local',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: UserRole.employee,
  },
  {
    id: 'emp-1002',
    email: 'grace@trackeros.local',
    firstName: 'Grace',
    lastName: 'Hopper',
    role: UserRole.employee,
  },
  {
    id: 'mgr-2001',
    email: 'linus@trackeros.local',
    firstName: 'Linus',
    lastName: 'Torvalds',
    role: UserRole.manager,
  },
  {
    id: 'hr-3001',
    email: 'hr@trackeros.local',
    firstName: 'HR',
    lastName: 'Admin',
    role: UserRole.hr_admin,
  },
];

/** Look up a seeded local user by its principal id. */
export function findLocalUserById(id: string): LocalUser | undefined {
  return LOCAL_USERS.find((user) => user.id === id);
}
