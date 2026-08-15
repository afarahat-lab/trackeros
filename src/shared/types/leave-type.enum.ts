export const LeaveType = {
  ANNUAL: 'annual',
  SICK: 'sick',
  EMERGENCY: 'emergency',
  UNPAID: 'unpaid',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
} as const;

export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const LEAVE_TYPE_VALUES: readonly LeaveType[] = Object.values(LeaveType) as readonly LeaveType[];
