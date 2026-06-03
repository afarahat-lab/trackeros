import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test suite for package.json validation.
 */
describe('package.json Validation', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

  it('should have the correct name and version', () => {
    expect(packageJson.name).toBe('trackeros');
    expect(packageJson.version).toBe('0.1.0');
  });

  it('should have the correct scripts', () => {
    expect(packageJson.scripts.build).toBe('tsc');
    expect(packageJson.scripts.start).toBe('pnpm run build && node dist/index.js');
  });

  it('should have the correct devDependencies', () => {
    expect(packageJson.devDependencies.typescript).toBe('^5.0.0');
    expect(packageJson.devDependencies.vitest).toBe('^1.0.0');
    expect(packageJson.devDependencies.tsx).toBe('^1.0.0');
  });
});
