import type {
  AuthSessionStatus,
  EmployeeProfile,
} from '../../shared/types/index';

/**
 * The canonical authentication session shape. `status` is AUTHENTICATED when
 * a valid token + profile are held; there is no "anonymous session" object —
 * the not-authenticated state is represented by a `null` session everywhere
 * (service, context provider, and presentation guards) rather than a session
 * with `status: ANONYMOUS`.
 */
export interface AuthSession {
  token: string;
  profile: EmployeeProfile;
  status: AuthSessionStatus;
}
