/**
 * Represents an employee's leave balance for a specific leave policy
 * within a fiscal year (calendar year: Jan 1 – Dec 31).
 *
 * Lifecycle: ACTIVE → EXHAUSTED → CLOSED.
 * - A balance starts ACTIVE when initialized.
 * - It transitions to EXHAUSTED when remainingDays reaches 0.
 * - It transitions to CLOSED at the end of the fiscal year.
 * - Once CLOSED, no further mutations to usedDays or remainingDays are permitted.
 *
 * Composite uniqueness: at most one LeaveBalance row may exist for a given
 * (employeeId, leavePolicyId, fiscalYear) tuple.
 *
 * Derived-field consistency: remainingDays MUST equal totalEntitlement - usedDays
 * at all times. Any mutation to usedDays MUST recalculate remainingDays accordingly.
 */
export interface LeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  fiscalYear: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}
