import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ILeaveService } from '../../modules/leave/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { LeaveStatus, LeaveTypeCode } from '../../shared/types/index';
import { LeaveListPage } from './LeaveListPage';

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

describe('LeaveListPage', () => {
  it('renders a Request leave link to /leaves/new', async () => {
    const leaveService = buildLeaveService({
      list: vi.fn().mockResolvedValue([]),
    });

    render(
      <MemoryRouter>
        <LeaveListPage leaveService={leaveService} />
      </MemoryRouter>,
    );

    await screen.findByText('No leave requests');
    const link = screen.getByRole('link', { name: 'Request leave' });
    expect(link).toHaveAttribute('href', '/leaves/new');
  });

  it('renders each leave request with a link to its detail page', async () => {
    const leaveService = buildLeaveService({
      list: vi.fn().mockResolvedValue([
        buildView({ id: 'leave-1', leaveTypeCode: LeaveTypeCode.ANNUAL }),
        buildView({ id: 'leave-2', leaveTypeCode: LeaveTypeCode.SICK }),
      ]),
    });

    render(
      <MemoryRouter>
        <LeaveListPage leaveService={leaveService} />
      </MemoryRouter>,
    );

    const detailLink = await screen.findByRole('link', {
      name: LeaveTypeCode.ANNUAL,
    });
    expect(detailLink).toHaveAttribute('href', '/leaves/leave-1');
    expect(screen.getByRole('link', { name: LeaveTypeCode.SICK })).toHaveAttribute(
      'href',
      '/leaves/leave-2',
    );
  });
});
