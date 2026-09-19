import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index';

export interface RequireAuthProps { children: ReactNode; }

export function RequireAuth({ children }: RequireAuthProps) {
  const { session } = useAuth();
  if (session === null) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
