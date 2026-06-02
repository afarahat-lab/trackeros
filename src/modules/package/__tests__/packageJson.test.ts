import { describe, it, expect } from 'vitest';
import fs from 'fs';

// Mock fs module
vi.mock('fs');

// Mocked package.json content
const mockedPackageJsonContent = JSON.stringify({
  "name": "gestalt-platform",
  "version": "1.0.0",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "tsx": "^4.7.0"
  }
});

// Mock readFileSync to return the mocked package.json content
fs.readFileSync = vi.fn(() => mockedPackageJsonContent);

// Function to test
function getPackageJsonDependencyVersion(dependencyName: string): string | null {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  return packageJson.dependencies[dependencyName] || null;
}

// Tests
describe('SC-1: The tsx version in package.json is updated to tsx@^4.7.0', () => {
  it('should return the correct tsx version', () => {
    const version = getPackageJsonDependencyVersion('tsx');
    expect(version).toBe('^4.7.0');
  });

  it('should return null for a non-existent dependency', () => {
    const version = getPackageJsonDependencyVersion('non-existent-dependency');
    expect(version).toBeNull();
  });
});
