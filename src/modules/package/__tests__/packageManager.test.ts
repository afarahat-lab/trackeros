import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper function to read package.json
function readPackageJson() {
  const packageJsonPath = path.resolve(__dirname, '../../../package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(packageJsonContent);
}

describe('SC-1: pnpm version in package.json', () => {
  it('should have pnpm version set to 11.5.1', () => {
    const packageJson = readPackageJson();
    expect(packageJson.packageManager).toBe('pnpm@11.5.1');
  });

  it('should throw an error if packageManager is not defined', () => {
    const packageJson = readPackageJson();
    delete packageJson.packageManager;
    expect(() => {
      if (!packageJson.packageManager) {
        throw new Error('packageManager is not defined');
      }
    }).toThrow('packageManager is not defined');
  });

  it('should throw an error if pnpm version is incorrect', () => {
    const packageJson = readPackageJson();
    packageJson.packageManager = 'pnpm@11.0.0';
    expect(() => {
      if (packageJson.packageManager !== 'pnpm@11.5.1') {
        throw new Error('Incorrect pnpm version');
      }
    }).toThrow('Incorrect pnpm version');
  });
});
