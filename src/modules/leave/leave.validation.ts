import { z } from 'zod';
import { LeaveStatus } from '../../shared/types/index';

const isoDateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO date string' },
);

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, 'employeeId is required'),
  leaveTypeId: z.string().min(1, 'leaveTypeId is required'),
  startDate: isoDateString,
  endDate: isoDateString,
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (start >= end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate must be before endDate',
      path: ['startDate'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be after startDate',
      path: ['endDate'],
    });
  }
});

export const updateLeaveRequestSchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate must be before endDate',
        path: ['startDate'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be after startDate',
        path: ['endDate'],
      });
    }
  }
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestInput = z.infer<typeof updateLeaveRequestSchema>;
