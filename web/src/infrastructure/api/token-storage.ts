const STORAGE_KEY = 'trackeros.token';

/**
 * Owns all persistence of the bearer token. The token lives in sessionStorage
 * so it survives a page reload but is cleared when the tab closes.
 */
export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clear(): void;
}

export class TokenStorage implements ITokenStorage {
  getToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
