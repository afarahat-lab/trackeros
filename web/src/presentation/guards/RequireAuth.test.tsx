import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../modules/auth/index';
import type { IAuthService } from '../../modules/auth/index';
import { ApiError } from '../../infrastructure/api/index';
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
  const createLeave: TestApiClient['createLeave'] = vi.fn();
  const submitLeave: TestApiClient['submitLeave'] = vi.fn();
  const approveLeave: TestApiClient['approveLeave'] = vi.fn();
  const rejectLeave: TestApiClient['rejectLeave'] = vi.fn();
  const cancelLeave: TestApiClient['cancelLeave'] = vi.fn();

  return {
    login,
    getMe,
    getLeaves,
    getLeave,
    getBalances,
    createLeave,
    submitLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
  };
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

  it('renders children when a stored token restores an authenticated session', async () => {
    renderGuardedRoute(
      buildAuthService(),
      buildTokenStorage(() => 'tok'),
      buildApiClient(),
    );

    await waitFor(() => {
      expect(screen.getByText('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
  });

  it('routes to /login rather than an empty page when a 401 clears the token', async () => {
    const tokenStorage = buildTokenStorage(() => 'tok');
    const apiClient = buildApiClient();
    // Reproduce the real ApiClient contract: an authenticated 401 clears the
    // stored token before surfacing ApiError(status 401).
    (tokenStorage.clear as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        tokenStorage.getToken = () => null;
      },
    );
    (apiClient.getMe as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        tokenStorage.clear();
        throw new ApiError('Unauthorized', 401);
      },
    );

    renderGuardedRoute(buildAuthService(), tokenStorage, apiClient);

    await waitFor(() => {
      expect(screen.getByText('login-page')).toBeInTheDocument();
    });
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
  });
});
