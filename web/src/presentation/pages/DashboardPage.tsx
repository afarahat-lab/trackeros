import { useEffect, useState } from 'react';
import { LogoutButton } from '../components/LogoutButton';
import type { IEmployeeService } from '../../modules/employee/index';
import type { IBalanceService } from '../../modules/leave/index';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([employeeService.getMe(), balanceService.getBalances()])
      .then(([profile, balanceViews]) => {
        if (cancelled) {
          return;
        }
        setEmployee(profile);
        setBalances(balanceViews);
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
  }, [employeeService, balanceService]);

  if (error !== null) {
    return <div role="alert">{error}</div>;
  }

  if (employee === null || balances === null) {
    return <div>Loading…</div>;
  }

  return (
    <div>
      <LogoutButton />
      <h1>
        {employee.firstName} {employee.lastName}
      </h1>
      <p>{employee.email}</p>
      <p>{employee.department}</p>
      <p>Hired: {formatUtcDate(employee.hireDate)}</p>

      <h2>Leave Balances</h2>
      <ul>
        {balances.map((balance) => (
          <li key={balance.id}>
            {balance.leaveTypeCode} — available: {balance.available} (
            {formatUtcDate(balance.periodStart)} to{' '}
            {formatUtcDate(balance.periodEnd)})
          </li>
        ))}
      </ul>
    </div>
  );
}
