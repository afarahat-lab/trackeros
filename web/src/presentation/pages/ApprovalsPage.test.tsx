import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('ApprovalsPage', () => {
  it('renders an explicit empty state when the queue is empty', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([]),
    });

    render(
      <MemoryRouter>
        <ApprovalsPage approvalsService={approvalsService} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('nothing waiting on you')).toBeInTheDocument();
  });

  it('renders each queued request with a truncated monospace employee id and a detail link', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([
        buildQueueItem({ requestId: 'req-1', employeeId: 'emp-0001-abcdef' }),
      ]),
    });

    render(
      <MemoryRouter>
        <ApprovalsPage approvalsService={approvalsService} />
      </MemoryRouter>,
    );

    const detailLink = await screen.findByRole('link', { name: 'View' });
    expect(screen.getByText('emp-0001')).toBeInTheDocument();
    expect(detailLink).toHaveAttribute('href', '/leaves/req-1');
    expect(screen.getByText('employee names require an API change')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('replaces a decided row with the returned view and removes its controls', async () => {
    const approvedView = buildView({
      id: 'req-1',
      status: LeaveStatus.APPROVED,
      decidedAt: new Date('2025-01-10T00:00:00.000Z'),
    });
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockResolvedValue([buildQueueItem({ requestId: 'req-1' })]),
      decide: vi.fn().mockResolvedValue(approvedView),
    });

    render(
      <MemoryRouter>
        <ApprovalsPage approvalsService={approvalsService} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(approvalsService.decide).toHaveBeenCalledWith('req-1', 'approve');
    expect(await screen.findByText(LeaveStatus.APPROVED)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('surfaces a failure as an alert', async () => {
    const approvalsService = buildApprovalsService({
      getQueue: vi.fn().mockRejectedValue(new Error('boom')),
    });

    render(
      <MemoryRouter>
        <ApprovalsPage approvalsService={approvalsService} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});
