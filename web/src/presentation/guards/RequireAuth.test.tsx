import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../modules/auth/index';
import type { IAuthService } from '../../modules/auth/index';
import type {
  EmployeeProfile,
  LeaveBalanceView,
  LeaveRequestView,
  LoginResponse,
} from '../../shared/types/index';
import { EmployeeRole, EmploymentStatus } from '../../shared/types/index';
import { RequireAuth } from './RequireAuth';

type AuthProviderProps = ComponentProps<typeof AuthProvider>;
type TestApiClient = AuthProviderProps['apiClient'];
type TestTokenStorage = AuthProviderProps['tokenStorage'];

const profile: EmployeeProfile = {
  id: 'emp-1',
  employeeNumber: 'E001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: EmployeeRole.EMPLOYEE,
  managerId: null,
  department: 'Engineering',
  hireDate: new Date('2021-01-01T00:00:00.000Z'),
  employmentStatus: EmploymentStatus.ACTIVE,
};

function buildAuthService(): IAuthService {
  return { login: vi.fn(), logout: vi.fn() };
}

function buildTokenStorage(getToken: () => string | null): TestTokenStorage {
  return { getToken, setToken: vi.fn(), clear: vi.fn() };
}

function buildApiClient(): TestApiClient {
  const login: TestApiClient['login'] = vi.fn().mockResolvedValue({
    token: 'tok',
    profile,
  } satisfies LoginResponse);
  const getMe: TestApiClient['getMe'] = vi.fn().mockResolvedValue(profile);
  const getLeaves: TestApiClient['getLeaves'] = vi.fn().mockResolvedValue(
    [] as LeaveRequestView[],
  );
  const getLeave: TestApiClient['getLeave'] = vi.fn();
  const getBalances: TestApiClient['getBalances'] = vi.fn().mockResolvedValue(
    [] as LeaveBalanceView[],
  );

  return { login, getMe, getLeaves, getLeave, getBalances };
}

function renderGuardedRoute(
  authService: IAuthService,
  tokenStorage: TestTokenStorage,
  apiClient: TestApiClient,
) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider
        authService={authService}
        tokenStorage={tokenStorage}
        apiClient={apiClient}
      >
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <div>protected-content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects to /login when there is no authenticated session', () => {
    renderGuardedRoute(
      buildAuthService(),
      buildTokenStorage(() => null),
      buildApiClient(),
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
  });
});
