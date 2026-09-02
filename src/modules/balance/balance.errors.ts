import { RepositoryError } from '../employee/index';

export class BalanceNotFoundError extends RepositoryError {
  constructor(message: string) {
    super('BALANCE_NOT_FOUND', message);
    this.name = 'BalanceNotFoundError';
  }
}

export class InsufficientBalanceError extends RepositoryError {
  constructor(employeeId: string, policyId: string, fiscalYear: number) {
    super(
      'INSUFFICIENT_BALANCE',
      `Insufficient leave balance for employee '${employeeId}', policy '${policyId}', fiscal year ${fiscalYear}`
    );
    this.name = 'InsufficientBalanceError';
  }
}
