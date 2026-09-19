import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../modules/auth/index';
import type { IAuthService } from '../../modules/auth/index';
import type { AuthSession } from '../../modules/auth/index';
import type {
  EmployeeProfile,
  LeaveBalanceView,
  LeaveRequestView,
  LoginResponse,
} from '../../shared/types/index';
import { AuthSessionStatus, EmployeeRole, EmploymentStatus } from '../../shared/types/index';
import { LoginPage } from './LoginPage';

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
  hireDate: new Date('2020-01-01T00:00:00.000Z'),
  employmentStatus: EmploymentStatus.ACTIVE,
};

function buildAuthService(): IAuthService {
  return { login: vi.fn(), logout: vi.fn() };
}

function buildTokenStorage(): TestTokenStorage {
  return { getToken: () => null, setToken: vi.fn(), clear: vi.fn() };
}

function buildApiClient(): TestApiClient {
  const login: TestApiClient['login'] = vi.fn().mockResolvedValue({
    token: 'tok',
    profile,
  } satisfies LoginResponse);
  const getMe: TestApiClient['getMe'] = vi.fn().mockResolvedValue(
    profile,
  );
  const getLeaves: TestApiClient['getLeaves'] = vi.fn().mockResolvedValue(
    [] as LeaveRequestView[],
  );
  const getLeave: TestApiClient['getLeave'] = vi.fn().mockRejectedValue(
    new Error('Not found'),
  );
  const getBalances: TestApiClient['getBalances'] = vi.fn().mockResolvedValue(
    [] as LeaveBalanceView[],
  );

  return { login, getMe, getLeaves, getLeave, getBalances };
}

function renderAtLogin(
  authService: IAuthService,
  tokenStorage: TestTokenStorage,
  apiClient: TestApiClient,
) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider
        authService={authService}
        tokenStorage={tokenStorage}
        apiClient={apiClient}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={<div data-testid="dashboard">dashboard</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('logs in successfully and navigates to the dashboard', async () => {
    const authService = buildAuthService();
    const loginMock = authService.login as ReturnType<typeof vi.fn>;
    loginMock.mockResolvedValue({
      token: 'tok',
      profile,
      status: AuthSessionStatus.AUTHENTICATED,
    } satisfies AuthSession);

    renderAtLogin(
      authService,
      buildTokenStorage(),
      buildApiClient(),
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(loginMock).toHaveBeenCalledWith('ada@example.com', 'secret');
  });

  it('shows the server error message when login fails', async () => {
    const authService = buildAuthService();
    const loginMock = authService.login as ReturnType<typeof vi.fn>;
    loginMock.mockRejectedValue(new Error('Invalid email or password'));

    renderAtLogin(
      authService,
      buildTokenStorage(),
      buildApiClient(),
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid email or password',
      );
    });
  });
});
