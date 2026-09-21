import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton';
import type { ILeaveService } from '../../modules/leave/index';
import { getAvailableLeaveActions } from '../../modules/leave/index';
import type { IEmployeeService } from '../../modules/employee/index';
import type {
  EmployeeProfile,
  LeaveRequestView,
} from '../../shared/types/index';
import { formatUtcDate } from '../../shared/date/index';

export interface LeaveDetailPageProps {
  leaveService: ILeaveService;
  employeeService: IEmployeeService;
}

const actionLabels: Record<string, string> = {
  submit: 'Submit',
  cancel: 'Cancel',
  approve: 'Approve',
  reject: 'Reject',
};

export function LeaveDetailPage({
  leaveService,
  employeeService,
}: LeaveDetailPageProps) {
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<LeaveRequestView | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      return;
    }

    let cancelled = false;

    Promise.all([leaveService.getById(id), employeeService.getMe()])
      .then(([view, me]) => {
        if (cancelled) {
          return;
        }
        setRequest(view);
        setProfile(me);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Something went wrong');
      });

    return () => {
      cancelled = true;
    };
  }, [leaveService, employeeService, id]);

  async function handleAction(action: string): Promise<void> {
    if (request === null) {
      return;
    }

    try {
      let updated: LeaveRequestView;
      if (action === 'submit') {
        updated = await leaveService.submit(request.id);
      } else if (action === 'cancel') {
        updated = await leaveService.cancel(request.id);
      } else if (action === 'approve') {
        updated = await leaveService.approve(request.id);
      } else {
        updated = await leaveService.reject(request.id);
      }
      setRequest(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (error !== null) {
    return <div role="alert">{error}</div>;
  }

  if (request === null || profile === null) {
    return <div>Loading…</div>;
  }

  const isOwner = profile.id === request.employeeId;
  const actions = getAvailableLeaveActions(
    request.status,
    profile.role,
    isOwner,
  );

  return (
    <div>
      <LogoutButton />
      <h1>Leave Request</h1>
      <p>Type: {request.leaveTypeCode}</p>
      <p>Status: {request.status}</p>
      <p>Requested days: {request.requestedDays}</p>
      <p>
        Dates: {formatUtcDate(request.startDate)} to{' '}
        {formatUtcDate(request.endDate)}
      </p>
      <p>Reason: {request.reason ?? '—'}</p>
      {request.approvalComment !== null && (
        <p>Approval comment: {request.approvalComment}</p>
      )}
      {request.submittedAt !== null && (
        <p>Submitted: {formatUtcDate(request.submittedAt)}</p>
      )}
      {request.decidedAt !== null && (
        <p>Decided: {formatUtcDate(request.decidedAt)}</p>
      )}
      {request.cancelledAt !== null && (
        <p>Cancelled: {formatUtcDate(request.cancelledAt)}</p>
      )}
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => {
            void handleAction(action);
          }}
        >
          {actionLabels[action] ?? action}
        </button>
      ))}
    </div>
  );
}
