import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../modules/auth/index';
import type { IAuthService } from '../../modules/auth/index';
import type { ILeaveService } from '../../modules/leave/index';
import type { IEmployeeService } from '../../modules/employee/index';
import type {
  EmployeeProfile,
  LeaveRequestView,
} from '../../shared/types/index';
import {
  EmploymentStatus,
  EmployeeRole,
  LeaveStatus,
  LeaveTypeCode,
} from '../../shared/types/index';
import { ApiError } from '../../infrastructure/api/index';
import { LeaveDetailPage } from './LeaveDetailPage';

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

function buildView(
  overrides: Partial<LeaveRequestView> = {},
): LeaveRequestView {
  return {
    id: 'leave-1',
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2025-01-03T00:00:00.000Z'),
    requestedDays: 3,
    reason: null,
    status: LeaveStatus.DRAFT,
    approverId: null,
    approvalComment: null,
    submittedAt: null,
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    ...overrides,
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

function buildLeaveService(
  overrides: Partial<ILeaveService> = {},
): ILeaveService {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

function buildEmployeeService(getMe = vi.fn()): IEmployeeService {
  return { getMe };
}

function renderPage(
  leaveService: ILeaveService,
  employeeService: IEmployeeService,
) {
  return render(
    <MemoryRouter initialEntries={['/leaves/leave-1']}>
      <AuthProvider
        authService={buildAuthService()}
        tokenStorage={buildTokenStorage()}
        apiClient={buildApiClient()}
      >
        <Routes>
          <Route
            path="/leaves/:id"
            element={
              <LeaveDetailPage
                leaveService={leaveService}
                employeeService={employeeService}
              />
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LeaveDetailPage', () => {
  it('shows submit/cancel for an owner viewing a draft and no approve/reject', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ status: LeaveStatus.DRAFT }));
    const leaveService = buildLeaveService({ getById });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-1', role: EmployeeRole.EMPLOYEE }),
        ),
    );

    renderPage(leaveService, employeeService);

    expect(
      await screen.findByRole('button', { name: 'Submit' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject' }),
    ).not.toBeInTheDocument();
  });

  it('shows approve/reject for a manager viewing a submitted request and no submit/cancel', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ status: LeaveStatus.SUBMITTED }));
    const leaveService = buildLeaveService({ getById });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-2', role: EmployeeRole.MANAGER }),
        ),
    );

    renderPage(leaveService, employeeService);

    expect(
      await screen.findByRole('button', { name: 'Approve' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Submit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
  });

  it('renders no actions when the role/ownership forbids them', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ status: LeaveStatus.DRAFT }));
    const leaveService = buildLeaveService({ getById });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-2', role: EmployeeRole.MANAGER }),
        ),
    );

    renderPage(leaveService, employeeService);

    await screen.findByText('Leave Request');
    expect(
      screen.queryByRole('button', { name: 'Submit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject' }),
    ).not.toBeInTheDocument();
  });

  it('updates the displayed status after a successful action without reloading', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ status: LeaveStatus.DRAFT }));
    const submit = vi
      .fn()
      .mockResolvedValue(
        buildView({
          status: LeaveStatus.SUBMITTED,
          submittedAt: new Date('2025-01-01T00:00:00.000Z'),
        }),
      );
    const leaveService = buildLeaveService({ getById, submit });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-1', role: EmployeeRole.EMPLOYEE }),
        ),
    );

    renderPage(leaveService, employeeService);

    await screen.findByRole('button', { name: 'Submit' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Status: SUBMITTED')).toBeInTheDocument();
    });
    expect(submit).toHaveBeenCalledWith('leave-1');
    expect(getById).toHaveBeenCalledTimes(1);
  });

  it('surfaces the API error message when an action fails', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ status: LeaveStatus.DRAFT }));
    const submit = vi
      .fn()
      .mockRejectedValue(new ApiError('Cannot submit', 400));
    const leaveService = buildLeaveService({ getById, submit });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-1', role: EmployeeRole.EMPLOYEE }),
        ),
    );

    renderPage(leaveService, employeeService);

    await screen.findByRole('button', { name: 'Submit' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Cannot submit');
    });
  });

  it('omits the approval comment row when approvalComment is null', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(buildView({ approvalComment: null }));
    const leaveService = buildLeaveService({ getById });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-1', role: EmployeeRole.EMPLOYEE }),
        ),
    );

    renderPage(leaveService, employeeService);

    await screen.findByText('Leave Request');
    expect(screen.queryByText(/Approval comment/)).not.toBeInTheDocument();
  });

  it('renders the approval comment row when approvalComment is present', async () => {
    const getById = vi
      .fn()
      .mockResolvedValue(
        buildView({ approvalComment: 'Enjoy your time off' }),
      );
    const leaveService = buildLeaveService({ getById });
    const employeeService = buildEmployeeService(
      vi
        .fn()
        .mockResolvedValue(
          buildProfile({ id: 'emp-1', role: EmployeeRole.EMPLOYEE }),
        ),
    );

    renderPage(leaveService, employeeService);

    expect(
      await screen.findByText('Approval comment: Enjoy your time off'),
    ).toBeInTheDocument();
  });
});
