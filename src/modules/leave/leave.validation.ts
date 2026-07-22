import { z } from 'zod';
import { LeaveRequestStatus } from './leave.model';

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
});

export const updateLeaveRequestSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

export const leaveRequestQuerySchema = z.object({
  status: z.nativeEnum(LeaveRequestStatus).optional(),
  leaveTypeId: z.string().min(1).optional(),
  startDateFrom: z.string().min(1).optional(),
  startDateTo: z.string().min(1).optional(),
  endDateFrom: z.string().min(1).optional(),
  endDateTo: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
