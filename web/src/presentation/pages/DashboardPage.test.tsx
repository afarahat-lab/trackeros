import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../modules/auth/index';
import type { IAuthService } from '../../modules/auth/index';
import type { IEmployeeService } from '../../modules/employee/index';
import type { IBalanceService } from '../../modules/leave/index';
import type {
  EmployeeProfile,
  LeaveBalanceView,
} from '../../shared/types/index';
import {
  EmployeeRole,
  EmploymentStatus,
  LeaveTypeCode,
} from '../../shared/types/index';
import { DashboardPage } from './DashboardPage';
import { formatUtcDate } from '../../shared/date/index';

type AuthProviderProps = ComponentProps<typeof AuthProvider>;
type TestApiClient = AuthProviderProps['apiClient'];
type TestTokenStorage = AuthProviderProps['tokenStorage'];

function buildAuthService(): IAuthService {
  return { login: vi.fn(), logout: vi.fn() };
}

function buildTokenStorage(): TestTokenStorage {
  return { getToken: () => null, setToken: vi.fn(), clear: vi.fn() };
}

function buildApiClient(): TestApiClient {
  const login: TestApiClient['login'] = vi.fn();
  const getMe: TestApiClient['getMe'] = vi.fn();
  const getLeaves: TestApiClient['getLeaves'] = vi.fn();
  const getLeave: TestApiClient['getLeave'] = vi.fn();
  const getBalances: TestApiClient['getBalances'] = vi.fn();
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

function buildProfile(
  overrides: Partial<EmployeeProfile> = {},
): EmployeeProfile {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01T00:00:00.000Z'),
    employmentStatus: EmploymentStatus.ACTIVE,
    ...overrides,
  };
}

function buildBalance(
  overrides: Partial<LeaveBalanceView> = {},
): LeaveBalanceView {
  return {
    id: 'bal-1',
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    periodStart: new Date('2025-01-01T00:00:00.000Z'),
    periodEnd: new Date('2025-12-31T00:00:00.000Z'),
    entitledDays: 20,
    usedDays: 0,
    pendingDays: 0,
    available: 20,
    ...overrides,
  };
}

interface RenderPageOptions {
  role?: EmployeeRole;
  balances?: LeaveBalanceView[];
  getBalances?: IBalanceService['getBalances'];
}

function renderPage(options: RenderPageOptions = {}) {
  const { role = EmployeeRole.EMPLOYEE, balances, getBalances } = options;
  const employeeService: IEmployeeService = {
    getMe: vi.fn().mockResolvedValue(buildProfile({ role })),
  };
  const balanceService: IBalanceService = {
    getBalances:
      getBalances ?? vi.fn().mockResolvedValue(balances ?? [buildBalance()]),
  };

  return render(
    <MemoryRouter>
      <AuthProvider
        authService={buildAuthService()}
        tokenStorage={buildTokenStorage()}
        apiClient={buildApiClient()}
      >
        <DashboardPage
          employeeService={employeeService}
          balanceService={balanceService}
        />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  it('shows the approvals link for a MANAGER', async () => {
    renderPage({ role: EmployeeRole.MANAGER });

    const link = await screen.findByRole('link', { name: 'Approvals' });
    expect(link).toHaveAttribute('href', '/approvals');
  });

  it('shows the approvals link for an ADMIN', async () => {
    renderPage({ role: EmployeeRole.ADMIN });

    const link = await screen.findByRole('link', { name: 'Approvals' });
    expect(link).toHaveAttribute('href', '/approvals');
  });

  it('does not show the approvals link for an EMPLOYEE', async () => {
    renderPage({ role: EmployeeRole.EMPLOYEE });

    await screen.findByText('John Doe');
    expect(
      screen.queryByRole('link', { name: 'Approvals' }),
    ).not.toBeInTheDocument();
  });

  it('renders the full balance breakdown', async () => {
    renderPage({
      balances: [
        buildBalance({
          entitledDays: 20,
          usedDays: 8,
          pendingDays: 2,
          available: 10,
        }),
      ],
    });

    await screen.findByText('John Doe');

    expect(screen.getByText('Entitled: 20')).toBeInTheDocument();
    expect(screen.getByText('Used: 8')).toBeInTheDocument();
    expect(screen.getByText('Pending: 2')).toBeInTheDocument();
    expect(screen.getByText('Available: 10')).toBeInTheDocument();

    const start = formatUtcDate(new Date('2025-01-01T00:00:00.000Z'));
    const end = formatUtcDate(new Date('2025-12-31T00:00:00.000Z'));
    const balanceItem = screen.getByText('annual').closest('li');
    expect(balanceItem).not.toBeNull();
    expect(balanceItem).toHaveTextContent(`${start} to ${end}`);
  });

  it('shows the empty state when there are no balances', async () => {
    renderPage({ balances: [] });

    expect(await screen.findByText('No balances yet')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows an alert when loading balances fails', async () => {
    renderPage({
      getBalances: vi.fn().mockRejectedValue(new Error('balances failed')),
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('balances failed');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });
});
