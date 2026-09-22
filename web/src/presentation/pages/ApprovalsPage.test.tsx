import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  ApprovalsQueueItem,
  IApprovalsService,
} from '../../modules/approvals/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { LeaveStatus, LeaveTypeCode } from '../../shared/types/index';
import { ApprovalsPage } from './ApprovalsPage';

function buildQueueItem(
  overrides: Partial<ApprovalsQueueItem> = {},
): ApprovalsQueueItem {
  return {
    requestId: 'req-1',
    employeeId: 'employee-12345678',
    employeeName: null,
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2025-01-03T00:00:00.000Z'),
    status: LeaveStatus.SUBMITTED,
    ...overrides,
  };
}

function buildView(
  overrides: Partial<LeaveRequestView> = {},
): LeaveRequestView {
  return {
    id: 'req-1',
    employeeId: 'employee-12345678',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2025-01-03T00:00:00.000Z'),
    requestedDays: 3,
    reason: null,
    status: LeaveStatus.SUBMITTED,
    approverId: null,
    approvalComment: null,
    submittedAt: null,
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    ...overrides,
  };
}

function buildApprovalsService(
  overrides: Partial<IApprovalsService> = {},
): IApprovalsService {
  return {
    getQueue: vi.fn(),
    decide: vi.fn(),
    ...overrides,
  };
}

function renderPage(approvalsService: IApprovalsService) {
  return render(
    <MemoryRouter>
      <ApprovalsPage approvalsService={approvalsService} />
    </MemoryRouter>,
  );
}

describe('ApprovalsPage', () => {
  it('renders the loading state before the fetch resolves', () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(approvalsService);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders an explicit empty state when the queue is empty', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([]),
    });

    renderPage(approvalsService);

    expect(
      await screen.findByText('nothing waiting on you'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('renders each queued request with the truncated monospace employee id, leave type, dates, and a detail link', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([
        buildQueueItem({
          requestId: 'req-1',
          employeeId: 'employee-12345678',
          leaveTypeCode: LeaveTypeCode.ANNUAL,
          startDate: new Date('2025-01-01T00:00:00.000Z'),
          endDate: new Date('2025-01-03T00:00:00.000Z'),
        }),
      ]),
    });

    renderPage(approvalsService);

    const detailLink = await screen.findByRole('link', { name: 'View' });
    expect(detailLink).toHaveAttribute('href', '/leaves/req-1');

    // Only the first 8 characters of the employee id are rendered, monospace.
    const employeeCell = screen.getByText('employee');
    expect(employeeCell).toHaveStyle({ fontFamily: 'monospace' });
    expect(screen.queryByText('employee-12345678')).not.toBeInTheDocument();

    // Leave type and formatted dates are rendered for the row.
    expect(screen.getByText(LeaveTypeCode.ANNUAL)).toBeInTheDocument();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getByText('2025-01-03')).toBeInTheDocument();
  });

  it('renders the employee-names note in the UI', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([buildQueueItem()]),
    });

    renderPage(approvalsService);

    expect(
      await screen.findByText('employee names require an API change'),
    ).toBeInTheDocument();
  });

  it('renders the error state when getQueue rejects', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockRejectedValue(new Error('boom')),
    });

    renderPage(approvalsService);

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });

  it('calls decide with approve and replaces the row with the returned view without re-fetching', async () => {
    const approvedView = buildView({
      id: 'req-1',
      status: LeaveStatus.APPROVED,
      decidedAt: new Date('2025-01-10T00:00:00.000Z'),
    });
    const getQueue = vi.fn().mockResolvedValue([buildQueueItem()]);
    const decide = vi.fn().mockResolvedValue(approvedView);
    const approvalsService = buildApprovalsService({ getQueue, decide });

    renderPage(approvalsService);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(decide).toHaveBeenCalledWith('req-1', 'approve');
    expect(await screen.findByText(LeaveStatus.APPROVED)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(getQueue).toHaveBeenCalledTimes(1);
  });

  it('calls decide with reject and replaces the row with the returned view', async () => {
    const rejectedView = buildView({
      id: 'req-1',
      status: LeaveStatus.REJECTED,
      decidedAt: new Date('2025-01-10T00:00:00.000Z'),
    });
    const decide = vi.fn().mockResolvedValue(rejectedView);
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([buildQueueItem()]),
      decide,
    });

    renderPage(approvalsService);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

    expect(decide).toHaveBeenCalledWith('req-1', 'reject');
    expect(await screen.findByText(LeaveStatus.REJECTED)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('surfaces the error state when decide rejects', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([buildQueueItem()]),
      decide: vi.fn().mockRejectedValue(new Error('decision failed')),
    });

    renderPage(approvalsService);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('decision failed');
    });
  });
});
