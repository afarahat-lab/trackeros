import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const tsconfigJson = require('../../../tsconfig.json');

describe('SC-2: tsconfig.json', () => {
  it('should have strict mode enabled and target Node 22', () => {
    expect(tsconfigJson.compilerOptions.strict).toBe(true);
    expect(tsconfigJson.compilerOptions.target).toBe('ES2022');
  });
});
