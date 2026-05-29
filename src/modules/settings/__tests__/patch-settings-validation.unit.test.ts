import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { updateSettingsSchema } from '../routes/settings-routes';

describe('SC-3: Input for PATCH /settings is validated using Zod', () => {
  it('should validate correct input', () => {
    const input = { settings: { key1: 'value1' } };
    expect(() => updateSettingsSchema.parse(input)).not.toThrow();
  });

  it('should throw an error for invalid input', () => {
    const input = { settings: { key1: 123 } }; // Invalid because value is not a string
    expect(() => updateSettingsSchema.parse(input)).toThrow();
  });

  it('should throw an error for missing settings object', () => {
    const input = {};
    expect(() => updateSettingsSchema.parse(input)).toThrow();
  });
});