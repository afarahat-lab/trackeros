export interface ILeaveBalanceService {
  checkBalance(employeeId: string, leaveType: string, days: number): Promise<boolean>;
}
