import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index';
import { canApproveLeave } from '../../modules/leave/index';

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

  if (!canApproveLeave(session.profile.role)) {
    // Someone who may not decide a leave request must not reach an approver route
    // directly: send them away from the guarded content.
    //
    // Asks the `leave` module rather than testing the role here. This used to read
    // `role === EMPLOYEE -> deny`, which is the same answer across today's three roles and
    // the OPPOSITE answer the day a fourth exists — the canonical rule denies an
    // unrecognised role, an inverted copy admits it, and it reaches other employees' data.
    // Fail-closed is a property of asking the one rule, not of writing this one carefully.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
