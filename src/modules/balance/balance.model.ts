export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY';
  balance: number;
  fiscalYear: number;
}
