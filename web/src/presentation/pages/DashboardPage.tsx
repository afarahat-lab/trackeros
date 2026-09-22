import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton';
import type { IEmployeeService } from '../../modules/employee/index';
import type { IBalanceService } from '../../modules/leave/index';
import { canApproveLeave } from '../../modules/leave/index';
import type { EmployeeProfile, LeaveBalanceView } from '../../shared/types/index';
import { formatUtcDate } from '../../shared/date/index';

export interface DashboardPageProps {
  employeeService: IEmployeeService;
  balanceService: IBalanceService;
}

export function DashboardPage({
  employeeService,
  balanceService,
}: DashboardPageProps) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [balances, setBalances] = useState<LeaveBalanceView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    Promise.all([employeeService.getMe(), balanceService.getBalances()])
      .then(([profile, balanceViews]) => {
        if (cancelled) {
          return;
        }
        setEmployee(profile);
        setBalances(balanceViews);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeService, balanceService]);

  if (error !== null) {
    return <div role="alert">{error}</div>;
  }

  if (loading) {
    return <div>Loading…</div>;
  }

  return (
    <div>
      <LogoutButton />
      {/* Asks the `leave` module rather than testing the role here: the link must appear
          exactly when the route behind it is reachable, and two copies of that rule drift.
          `RequireApprover` asks the same function, so the link and the guard cannot disagree. */}
      {canApproveLeave(employee!.role) && <Link to="/approvals">Approvals</Link>}
      <h1>
        {employee!.firstName} {employee!.lastName}
      </h1>
      <p>{employee!.email}</p>
      <p>{employee!.department}</p>
      <p>Hired: {formatUtcDate(employee!.hireDate)}</p>

      <h2>Leave Balances</h2>
      {balances!.length === 0 ? (
        <p>No balances yet</p>
      ) : (
        <ul>
          {balances!.map((balance) => (
            <li key={balance.id}>
              <strong>{balance.leaveTypeCode}</strong> (
              {formatUtcDate(balance.periodStart)} to{' '}
              {formatUtcDate(balance.periodEnd)})
              <ul>
                <li>Entitled: {balance.entitledDays}</li>
                <li>Used: {balance.usedDays}</li>
                <li>Pending: {balance.pendingDays}</li>
                <li>Available: {balance.available}</li>
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
