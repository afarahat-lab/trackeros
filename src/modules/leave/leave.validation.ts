import { z } from 'zod';

export const createLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
}).refine(data => data.startDate <= data.endDate, {
  message: "startDate must be before or equal to endDate",
  path: ["endDate"],
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime());
}, {
  message: "startDate and endDate must be valid dates",
  path: ["startDate"],
});

export const approveLeaveParamsSchema = z.object({
  id: z.string().uuid(),
});

export const rejectLeaveParamsSchema = z.object({
  id: z.string().uuid(),
});

export const rejectLeaveBodySchema = z.object({
  reason: z.string().optional(),
});

export const cancelLeaveParamsSchema = z.object({
  id: z.string().uuid(),
});

export const getLeaveParamsSchema = z.object({
  id: z.string().uuid(),
});

export const getBalanceParamsSchema = z.object({
  leaveTypeId: z.string().uuid(),
});
