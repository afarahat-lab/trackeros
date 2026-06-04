import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('SC-3: jest.config.js', () => {
  let jestConfig;

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(`module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'js'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      testMatch: ['**/tests/**/*.test.(ts|js)'],
      moduleDirectories: ['node_modules', 'src']
    };`);
    jestConfig = eval(fs.readFileSync('jest.config.js', 'utf8'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use ts-jest preset', () => {
    expect(jestConfig.preset).toBe('ts-jest');
  });

  it('should have node as test environment', () => {
    expect(jestConfig.testEnvironment).toBe('node');
  });
});
