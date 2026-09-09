import { LeaveTypeCode } from '../../shared/types';

export enum LeavePolicyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
}

export interface LeavePolicy {
  id: string;
  leaveTypeCode: LeaveTypeCode;
  policyName: string;
  annualEntitlementDays: number;
  accrualPeriodMonths: number;
  carryForwardDays: number;
  minNoticeDays: number;
  maxRequestDays: number;
  requiresManagerApproval: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: LeavePolicyStatus;
}

export type CreateLeavePolicyInput = Omit<LeavePolicy, 'id'>;
