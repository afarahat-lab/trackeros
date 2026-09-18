import { AuthSessionStatus } from '../../shared/types/index';
import * as api from '../../infrastructure/api';
import type { AuthSession } from './auth-session';

export interface IAuthService {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): void;
}

/**
 * Owns the login/logout flow. The API client is the single source of truth for
 * the bearer header and 401-clearing behaviour; this service only persists the
 * token it is handed and assembles the canonical {@link AuthSession}.
 *
 * On login failure the server's error message (ApiError.message) propagates
 * verbatim — no email-existence hint is added, and the stored token is left
 * untouched so an already-authenticated caller's session survives a later
 * failed login attempt.
 */
export class AuthService implements IAuthService {
  private readonly apiClient: api.IApiClient;
  private readonly tokenStorage: api.ITokenStorage;

  constructor(apiClient: api.IApiClient, tokenStorage: api.ITokenStorage) {
    this.apiClient = apiClient;
    this.tokenStorage = tokenStorage;
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await this.apiClient.login(email, password);
    this.tokenStorage.setToken(response.token);
    return {
      token: response.token,
      profile: response.profile,
      status: AuthSessionStatus.AUTHENTICATED,
    };
  }

  logout(): void {
    this.tokenStorage.clear();
  }
}
