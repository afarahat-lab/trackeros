import { describe, it, expect } from 'vitest';
import { NotificationSchema } from '../domain/notification';

// Unit test for SC-3

describe('Notification Validation Unit Tests', () => {
  describe('SC-3: Input validation using Zod', () => {
    it('should validate correct notification input', () => {
      const validInput = {
        userId: 'user123',
        title: 'Valid Title',
        body: 'Valid body content',
        channel: 'email',
        scheduledFor: new Date()
      };

      expect(() => NotificationSchema.parse(validInput)).not.toThrow();
    });

    it('should throw an error for invalid notification input', () => {
      const invalidInput = {
        userId: 'user123',
        title: 'Invalid Title',
        body: 'Invalid body content',
        channel: 'invalidChannel', // Invalid channel
        scheduledFor: 'not-a-date' // Invalid date
      };

      expect(() => NotificationSchema.parse(invalidInput)).toThrow();
    });
  });
});