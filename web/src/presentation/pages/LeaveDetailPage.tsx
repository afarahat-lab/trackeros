import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton';
import type { ILeaveService } from '../../modules/leave/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { formatUtcDate } from '../../shared/date/index';

export interface LeaveDetailPageProps {
  leaveService: ILeaveService;
}

export function LeaveDetailPage({ leaveService }: LeaveDetailPageProps) {
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<LeaveRequestView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      return;
    }

    let cancelled = false;

    leaveService
      .getById(id)
      .then((view) => {
        if (cancelled) {
          return;
        }
        setRequest(view);
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
  }, [leaveService, id]);

  if (error !== null) {
    return <div role="alert">{error}</div>;
  }

  if (request === null) {
    return <div>Loading…</div>;
  }

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
      <p>Approval comment: {request.approvalComment ?? '—'}</p>
      {request.submittedAt !== null && (
        <p>Submitted: {formatUtcDate(request.submittedAt)}</p>
      )}
      {request.decidedAt !== null && (
        <p>Decided: {formatUtcDate(request.decidedAt)}</p>
      )}
      {request.cancelledAt !== null && (
        <p>Cancelled: {formatUtcDate(request.cancelledAt)}</p>
      )}
    </div>
  );
}
