import { z } from 'zod';

export const createLeaveSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().optional(),
}).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
  message: 'end_date must be on or after start_date',
  path: ['end_date'],
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
  employee_id: z.string().uuid(),
  year: z.coerce.number().int().optional(),
});
