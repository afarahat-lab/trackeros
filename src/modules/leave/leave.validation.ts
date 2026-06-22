// @ts-ignore
import { z } from 'zod';

export const createLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().optional(),
}).refine((data: any) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'startDate must be before or equal to endDate',
  path: ['endDate'],
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
