import type { CreateLeaveRequestInput } from '../../shared/types/index';

/**
 * Pure client-side validator enforcing only the three rules the spec requires:
 * both dates present, end date not before the start date (compared as
 * calendar-date strings), and a leave type chosen. Backend policy such as
 * min-notice or max-duration is intentionally NOT mirrored here.
 */
export function validateLeaveRequestInput(
  input: CreateLeaveRequestInput,
): string[] {
  const errors: string[] = [];

  if (!input.startDate || input.startDate.trim() === '') {
    errors.push('Start date is required.');
  }

  if (!input.endDate || input.endDate.trim() === '') {
    errors.push('End date is required.');
  }

  if (
    input.startDate &&
    input.endDate &&
    input.endDate < input.startDate
  ) {
    errors.push('End date must not be before the start date.');
  }

  if (!input.leaveTypeCode) {
    errors.push('A leave type must be selected.');
  }

  return errors;
}
