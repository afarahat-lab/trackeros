import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
import { RequireApprover } from './RequireApprover';

type AuthProviderProps = ComponentProps<typeof AuthProvider>;
type TestApiClient = AuthProviderProps['apiClient'];
type TestTokenStorage = AuthProviderProps['tokenStorage'];

function buildProfile(role: EmployeeRole): EmployeeProfile {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2021-01-01T00:00:00.000Z'),
    employmentStatus: EmploymentStatus.ACTIVE,
  };
}

function buildAuthService(): IAuthService {
  return { login: vi.fn(), logout: vi.fn() };
}

function buildTokenStorage(getToken: () => string | null): TestTokenStorage {
  return { getToken, setToken: vi.fn(), clear: vi.fn() };
}

function buildApiClient(profile: EmployeeProfile): TestApiClient {
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
    <MemoryRouter initialEntries={['/approvals']}>
      <AuthProvider
        authService={authService}
        tokenStorage={tokenStorage}
        apiClient={apiClient}
      >
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/" element={<div>home-page</div>} />
          <Route
            path="/approvals"
            element={
              <RequireApprover>
                <div>approver-content</div>
              </RequireApprover>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderWithSession(profile: EmployeeProfile) {
  return renderGuardedRoute(
    buildAuthService(),
    buildTokenStorage(() => 'tok'),
    buildApiClient(profile),
  );
}

describe('RequireApprover', () => {
  it('renders children for a MANAGER session', async () => {
    renderWithSession(buildProfile(EmployeeRole.MANAGER));

    await waitFor(() => {
      expect(screen.getByText('approver-content')).toBeInTheDocument();
    });
  });

  it('renders children for an ADMIN session', async () => {
    renderWithSession(buildProfile(EmployeeRole.ADMIN));

    await waitFor(() => {
      expect(screen.getByText('approver-content')).toBeInTheDocument();
    });
  });

  it('redirects away and does not render children for an EMPLOYEE session', async () => {
    renderWithSession(buildProfile(EmployeeRole.EMPLOYEE));

    await waitFor(() => {
      expect(screen.getByText('home-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('approver-content')).not.toBeInTheDocument();
  });

  it('redirects to /login and does not render children for a null session', () => {
    renderGuardedRoute(
      buildAuthService(),
      buildTokenStorage(() => null),
      buildApiClient(buildProfile(EmployeeRole.MANAGER)),
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('approver-content')).not.toBeInTheDocument();
  });
});
