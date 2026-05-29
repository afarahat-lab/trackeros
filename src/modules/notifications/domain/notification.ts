import { z } from 'zod';

/**
 * Notification entity type definition.
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  channel: 'email' | 'sms' | 'push';
  scheduledFor: Date;
  createdAt: Date;
}

/**
 * Zod schema for validating Notification creation input.
 */
export const NotificationSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  channel: z.enum(['email', 'sms', 'push']),
  scheduledFor: z.date()
});
