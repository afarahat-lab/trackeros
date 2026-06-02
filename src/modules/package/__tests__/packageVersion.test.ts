import { describe, it, expect } from 'vitest';
import packageJson from '../../../package.json';

describe('SC-1: Validate package.json dependency versions', () => {
  it('should have valid version numbers for all dependencies', () => {
    const dependencies = packageJson.devDependencies;
    for (const [name, version] of Object.entries(dependencies)) {
      expect(version).not.toBe('0.0.0');
      expect(version).toMatch(/^\^?\d+\.\d+\.\d+/);
    }
  });
});
