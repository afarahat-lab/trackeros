import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveType: z.enum(['ANNUAL', 'SICK', 'EMERGENCY']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  managerId: z.string().uuid().optional()
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
});

export const updateLeaveRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  managerId: z.string().uuid()
});

export const updateLeaveRequestSchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveType: z.enum(['ANNUAL', 'SICK', 'EMERGENCY']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  reason: z.string().optional(),
  managerId: z.string().uuid().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
});
