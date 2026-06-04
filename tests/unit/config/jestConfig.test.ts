import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const jestConfig = require('../../../jest.config.js');

describe('SC-3: jest.config.js', () => {
  it('should be configured correctly', () => {
    expect(jestConfig.preset).toBe('ts-jest');
    expect(jestConfig.testEnvironment).toBe('node');
    expect(jestConfig.testMatch).toEqual(['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts']);
    expect(jestConfig.moduleFileExtensions).toEqual(['ts', 'js', 'json', 'node']);
    expect(jestConfig.globals['ts-jest'].tsconfig).toBe('tsconfig.json');
  });
});
