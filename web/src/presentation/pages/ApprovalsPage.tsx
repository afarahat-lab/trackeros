import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type {
  ApprovalsQueueItem,
  IApprovalsService,
} from '../../modules/approvals/index';
import type { LeaveRequestView } from '../../shared/types/index';
import { formatUtcDate } from '../../shared/date/index';

export interface ApprovalsPageProps {
  approvalsService: IApprovalsService;
}

/**
 * A queue row is either a pending item awaiting the signed-in approver's
 * decision, or the authoritative post-decision view returned by `decide`
 * (rendered verbatim once its request has been decided).
 */
type QueueRow =
  | { kind: 'pending'; item: ApprovalsQueueItem }
  | { kind: 'decided'; view: LeaveRequestView };

const employeeCellStyle: CSSProperties = { fontFamily: 'monospace' };

export function ApprovalsPage({
  approvalsService,
}: ApprovalsPageProps) {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    approvalsService
      .getQueue()
      .then((queue) => {
        if (cancelled) {
          return;
        }
        setRows(queue.map((item) => ({ kind: 'pending', item })));
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
  }, [approvalsService]);

  async function handleDecide(
    requestId: string,
    action: 'approve' | 'reject',
  ): Promise<void> {
    if (rows === null) {
      return;
    }

    try {
      const view = await approvalsService.decide(requestId, action);
      setRows((current) =>
        current === null
          ? current
          : current.map((row) =>
              row.kind === 'pending' && row.item.requestId === requestId
                ? { kind: 'decided', view }
                : row,
            ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (error !== null) {
    return <div role="alert">{error}</div>;
  }

  if (rows === null) {
    return <div>Loading…</div>;
  }

  if (rows.length === 0) {
    return <div>nothing waiting on you</div>;
  }

  return (
    <div>
      <h1>Approvals</h1>
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Leave type</th>
            <th>Start</th>
            <th>End</th>
            <th>Detail</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.kind === 'decided') {
              const { view } = row;
              return (
                <tr key={view.id}>
                  <td style={employeeCellStyle}>
                    {view.employeeId.slice(0, 8)}
                  </td>
                  <td>{view.leaveTypeCode}</td>
                  <td>{formatUtcDate(view.startDate)}</td>
                  <td>{formatUtcDate(view.endDate)}</td>
                  <td>
                    <Link to={`/leaves/${view.id}`}>View</Link>
                  </td>
                  <td>{view.status}</td>
                </tr>
              );
            }

            const { item } = row;
            return (
              <tr key={item.requestId}>
                <td style={employeeCellStyle}>
                  {item.employeeId.slice(0, 8)}
                </td>
                <td>{item.leaveTypeCode}</td>
                <td>{formatUtcDate(item.startDate)}</td>
                <td>{formatUtcDate(item.endDate)}</td>
                <td>
                  <Link to={`/leaves/${item.requestId}`}>View</Link>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDecide(item.requestId, 'approve');
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDecide(item.requestId, 'reject');
                    }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>employee names require an API change</p>
    </div>
  );
}
