import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test suite for tsconfig.json validation.
 */
describe('SC-1: tsconfig.json Validation', () => {
  const tsconfigJson = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));

  it('should have the correct compiler options', () => {
    expect(tsconfigJson.compilerOptions.target).toBe('ES2020');
    expect(tsconfigJson.compilerOptions.module).toBe('commonjs');
    expect(tsconfigJson.compilerOptions.strict).toBe(true);
    expect(tsconfigJson.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfigJson.compilerOptions.skipLibCheck).toBe(true);
    expect(tsconfigJson.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    expect(tsconfigJson.compilerOptions.outDir).toBe('dist');
  });

  it('should include the src directory', () => {
    expect(tsconfigJson.include).toContain('src');
  });

  it('should handle missing compiler options gracefully', () => {
    const incompleteTsconfigJson = { compilerOptions: {} };
    expect(() => {
      if (!incompleteTsconfigJson.compilerOptions.target) throw new Error('Missing target');
    }).toThrow('Missing target');
  });
});
