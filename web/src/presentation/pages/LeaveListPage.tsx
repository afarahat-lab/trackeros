import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ILeaveService } from '../../modules/leave/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { formatUtcDate } from '../../shared/date/index';

export interface LeaveListPageProps {
  leaveService: ILeaveService;
}

export function LeaveListPage({ leaveService }: LeaveListPageProps) {
  const [requests, setRequests] = useState<LeaveRequestView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    leaveService
      .list()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setRequests(list);
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
  }, [leaveService]);

  let listContent;
  if (error !== null) {
    listContent = <div role="alert">{error}</div>;
  } else if (requests === null) {
    listContent = <div>Loading…</div>;
  } else if (requests.length === 0) {
    listContent = <div>No leave requests</div>;
  } else {
    listContent = (
      <ul>
        {requests.map((request) => (
          <li key={request.id}>
            <Link to={`/leaves/${request.id}`}>{request.leaveTypeCode}</Link>{' '}
            {formatUtcDate(request.startDate)} to{' '}
            {formatUtcDate(request.endDate)} — {request.status}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <Link to="/leaves/new">Request leave</Link>
      {listContent}
    </>
  );
}
