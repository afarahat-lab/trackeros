import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index';
import { EmployeeRole } from '../../shared/types/index';

export interface RequireApproverProps { children: ReactNode; }

/**
 * Route-level role guard: renders its children only when the signed-in
 * session exists AND its profile role can approve leave (MANAGER or ADMIN).
 * Reads the role from the auth session's profile — never decodes the JWT.
 */
export function RequireApprover({ children }: RequireApproverProps) {
  const { session, isRestoring } = useAuth();

  // Hold off on any redirect while a stored token is being revalidated on
  // mount, mirroring RequireAuth so a refresh does not bounce a valid
  // approver back to /login before restoration completes.
  if (isRestoring) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  if (session.profile.role === EmployeeRole.EMPLOYEE) {
    // An EMPLOYEE reaching an approver route directly must not see any other
    // employee's data: send them away from the guarded content.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
