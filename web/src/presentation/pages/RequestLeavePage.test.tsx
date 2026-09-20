import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ILeaveService } from '../../modules/leave/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { LeaveStatus, LeaveTypeCode } from '../../shared/types/index';
import { ApiError } from '../../infrastructure/api/index';
import { RequestLeavePage } from './RequestLeavePage';

const createdView = {
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
  submittedAt: new Date('2025-01-01T00:00:00.000Z'),
  decidedAt: null,
  cancelledBy: null,
  cancelledAt: null,
} satisfies LeaveRequestView;

function buildLeaveService(create = vi.fn()): ILeaveService {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create,
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    cancel: vi.fn(),
  };
}

function renderPage(leaveService: ILeaveService) {
  return render(
    <MemoryRouter initialEntries={['/leaves/new']}>
      <Routes>
        <Route
          path="/leaves/new"
          element={<RequestLeavePage leaveService={leaveService} />}
        />
        <Route
          path="/leaves/:id"
          element={<div data-testid="detail-page" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequestLeavePage', () => {
  it('renders validation errors and never calls create when input is invalid', async () => {
    const create = vi.fn();
    const leaveService = buildLeaveService(create);

    renderPage(leaveService);

    fireEvent.change(screen.getByLabelText('Leave type'), {
      target: { value: 'annual' },
    });
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2025-01-05' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2025-01-02' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(
      await screen.findByText('End date must not be before the start date.'),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('navigates to the created request detail page on success', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(createdView);
    const leaveService = buildLeaveService(create);

    renderPage(leaveService);

    fireEvent.change(screen.getByLabelText('Leave type'), {
      target: { value: 'annual' },
    });
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2025-01-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2025-01-03' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => {
      expect(screen.getByTestId('detail-page')).toBeInTheDocument();
    });

    expect(create).toHaveBeenCalledWith({
      leaveTypeCode: 'annual',
      startDate: '2025-01-01',
      endDate: '2025-01-03',
    });
  });

  it('surfaces the API error message when create rejects', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(new ApiError('Insufficient leave balance', 400));
    const leaveService = buildLeaveService(create);

    renderPage(leaveService);

    fireEvent.change(screen.getByLabelText('Leave type'), {
      target: { value: 'annual' },
    });
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2025-01-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2025-01-03' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Insufficient leave balance',
      );
    });
    expect(create).toHaveBeenCalled();
  });
});
