import { describe, it, expect } from 'vitest';
import fs from 'fs';

const jestConfigPath = 'jest.config.js';

describe('SC-3: jest.config.js', () => {
  it('should be created', () => {
    const jestConfig = require(`../../../../${jestConfigPath}`);
    expect(jestConfig.preset).toBe('ts-jest');
    expect(jestConfig.testEnvironment).toBe('node');
  });
});
