import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index';

export interface RequireAuthProps { children: ReactNode; }

export function RequireAuth({ children }: RequireAuthProps) {
  const { session, isRestoring } = useAuth();

  // While a stored token is being revalidated on mount, hold off on the
  // redirect so a page refresh with a valid sessionStorage token does not
  // throw the user back to /login before restoration completes.
  if (isRestoring) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
