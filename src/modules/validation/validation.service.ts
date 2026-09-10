import {
  CreateLeaveRequestDto,
  LeaveTypeCode,
  requestedDays,
} from '../../shared/types';
import { ValidationError, ConflictError } from '../../shared/errors';
import { LeaveBalance } from '../balance';
import { ValidationResult } from './validation.model';

/**
 * Shared helper for the inclusive calendar-day count. Delegates to the single
 * canonical derivation in shared/types so every consumer (sufficiency checks,
 * balance deduction, policy max-duration enforcement) uses the identical rule:
 * requestedDays = endDate - startDate + 1, whole-day only, no weekend or
 * holiday exclusion. Never re-derive this per module.
 */
export function calculateRequestedDays(startDate: Date, endDate: Date): number {
  return requestedDays(startDate, endDate);
}

export interface IValidationService {
  validateDateRange(startDate: Date, endDate: Date): void;
  validateSufficiency(balance: LeaveBalance, requestedDays: number): void;
  validateLeaveRequest(dto: CreateLeaveRequestDto, balance: LeaveBalance): void;
}

export class ValidationService implements IValidationService {
  /**
   * Rejects startDate > endDate (or a non-date argument) with a
   * {@link ValidationError} (400).
   */
  validateDateRange(startDate: Date, endDate: Date): void {
    this.assert(this.checkDateRange(startDate, endDate), ValidationError);
  }

  /**
   * Rejects with a {@link ConflictError} (409) when the unused balance is less
   * than the requested days: entitledDays - usedDays - pendingDays < requestedDays.
   */
  validateSufficiency(balance: LeaveBalance, requestedDays: number): void {
    this.assert(this.checkSufficiency(balance, requestedDays), ConflictError);
  }

  /**
   * Composes date-range validation (ValidationError) and balance-sufficiency
   * checking (ConflictError) for a leave request against the request's leave
   * type balance. The canonical inclusive day count is used to derive
   * requestedDays before the sufficiency check.
   */
  validateLeaveRequest(dto: CreateLeaveRequestDto, balance: LeaveBalance): void {
    this.checkLeaveRequestInput(dto);
    this.validateDateRange(dto.startDate, dto.endDate);

    const requested = calculateRequestedDays(dto.startDate, dto.endDate);
    this.assert(this.checkSufficiency(balance, requested), ConflictError);
  }

  /** Pure date-range rule; returns a {@link ValidationResult} without throwing. */
  checkDateRange(startDate: Date, endDate: Date): ValidationResult {
    const errors: string[] = [];

    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      errors.push('startDate must be a valid date');
    }
    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
      errors.push('endDate must be a valid date');
    }
    if (
      startDate instanceof Date &&
      endDate instanceof Date &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      startDate.getTime() > endDate.getTime()
    ) {
      errors.push('startDate must be before or equal to endDate');
    }

    return { valid: errors.length === 0, errors };
  }

  /** Pure sufficiency rule; returns a {@link ValidationResult} without throwing. */
  checkSufficiency(balance: LeaveBalance, requestedDays: number): ValidationResult {
    const errors: string[] = [];

    if (
      typeof requestedDays !== 'number' ||
      !Number.isFinite(requestedDays) ||
      requestedDays < 0
    ) {
      errors.push('requestedDays must be a non-negative number');
      return { valid: false, errors };
    }

    const unused = balance.entitledDays - balance.usedDays - balance.pendingDays;
    if (unused < requestedDays) {
      errors.push(
        `Insufficient leave balance: requested ${requestedDays} day(s), ${unused} available`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  private checkLeaveRequestInput(dto: CreateLeaveRequestDto): void {
    if (!dto || typeof dto !== 'object') {
      throw new ValidationError('Leave request is required');
    }
    if (typeof dto.employeeId !== 'string' || dto.employeeId.trim() === '') {
      throw new ValidationError('Invalid employeeId');
    }
    if (!Object.values(LeaveTypeCode).includes(dto.leaveTypeCode)) {
      throw new ValidationError('Invalid leaveTypeCode');
    }
  }

  private assert(
    result: ValidationResult,
    ErrorType: new (message: string) => Error
  ): void {
    if (!result.valid) {
      throw new ErrorType(result.errors.join('; '));
    }
  }
}
