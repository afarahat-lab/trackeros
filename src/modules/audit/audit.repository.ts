export interface ILeaveAuditRepository {
  createLeaveBalanceAudit(data: {
    employeeId: string;
    policyId: string;
    fiscalYear: number;
    previousBalance: number;
    newBalance: number;
    action: string;
    actorId: string;
  }): Promise<void>;
}
