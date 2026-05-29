import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { settingsSchema } from '../routes/settings-routes';

describe('SC-3: Input for PATCH /settings is validated using Zod', () => {
  it('should validate correct input', () => {
    const input = { settings: { key1: 'value1' } };
    expect(() => settingsSchema.parse(input)).not.toThrow();
  });

  it('should throw error for invalid input', () => {
    const input = { settings: 'invalid' };
    expect(() => settingsSchema.parse(input)).toThrow();
  });

  it('should allow partial updates', () => {
    const input = { settings: { key1: 'value1' } };
    expect(() => settingsSchema.parse(input)).not.toThrow();
  });
});
