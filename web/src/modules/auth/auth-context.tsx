import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AuthSessionStatus } from '../../shared/types/index';
import type { IApiClient, ITokenStorage } from '../../infrastructure/api';
import type { AuthSession } from './auth-session';
import type { IAuthService } from './auth.service';

interface IAuthContextValue {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => void;
}

interface AuthProviderProps {
  authService: IAuthService;
  tokenStorage: ITokenStorage;
  apiClient: IApiClient;
  children: ReactNode;
}

const AuthContext = createContext<IAuthContextValue | null>(null);

/**
 * Holds the current auth session in plain React state. The anonymous state is
 * a `null` session — the same single representation the {@link AuthService}
 * uses after `logout` and the presentation guards test against.
 */
export function AuthProvider({
  authService,
  tokenStorage,
  apiClient,
  children,
}: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const token = tokenStorage.getToken();
    if (token === null) {
      return;
    }

    let cancelled = false;

    // The token survives sessionStorage across a reload, but the in-memory
    // profile does not; re-fetch it so a refresh restores an authenticated
    // session instead of throwing the user back to the login screen.
    apiClient
      .getMe()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setSession({ token, profile, status: AuthSessionStatus.AUTHENTICATED });
      })
      .catch(() => {
        // A failure here is non-fatal — the session stays anonymous and the
        // presentation guards redirect to login (the ApiClient's 401 handler
        // already cleared the token from storage on expiry).
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, tokenStorage]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthSession> => {
      const next = await authService.login(email, password);
      setSession(next);
      return next;
    },
    [authService],
  );

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, [authService]);

  const value = useMemo(
    () => ({ session, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): IAuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
