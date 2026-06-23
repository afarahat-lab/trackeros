import { LeaveBalance, CreateLeaveBalanceDto } from '../../shared/types/index';

export { LeaveBalance, CreateLeaveBalanceDto };

export enum BalanceStatus {
  INITIALIZED = 'INITIALIZED',
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
}
