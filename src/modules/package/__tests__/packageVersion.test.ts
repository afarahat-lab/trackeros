import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper function to read package.json
function readPackageJson() {
  const packageJsonPath = path.resolve(__dirname, '../../..', 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(packageJsonContent);
}

describe('SC-1: package.json version verification', () => {
  it('should have packageManager version set to 10.34.1', () => {
    const packageJson = readPackageJson();
    expect(packageJson.packageManager).toBe('pnpm@10.34.1');
  });

  it('should throw an error if packageManager version is not 10.34.1', () => {
    const packageJson = readPackageJson();
    const incorrectVersion = 'pnpm@10.0.0'; // Example of an incorrect version
    expect(() => {
      if (packageJson.packageManager !== 'pnpm@10.34.1') {
        throw new Error(`Expected packageManager version to be 10.34.1, but got ${packageJson.packageManager}`);
      }
    }).toThrow(`Expected packageManager version to be 10.34.1, but got ${incorrectVersion}`);
  });
});
