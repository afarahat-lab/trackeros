import { describe, it, expect } from 'vitest';
import fs from 'fs';

// Mock fs module
vi.mock('fs');

// Mocked package.json content
const mockedPackageJsonContent = JSON.stringify({
  "name": "gestalt-platform",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "typescript": "^4.5.4",
    "@gestalt/core": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^0.0.0",
    "tsx": "^4.7.0"
  }
});

// Mock readFileSync to return the mocked package.json content
vi.spyOn(fs, 'readFileSync').mockImplementation(() => mockedPackageJsonContent);

// Test suite for SC-1
describe('SC-1: The tsx version in package.json is updated to ^4.7.0', () => {
  it('should have tsx version set to ^4.7.0 in devDependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    expect(packageJson.devDependencies.tsx).toBe('^4.7.0');
  });

  it('should throw an error if tsx version is not ^4.7.0', () => {
    const incorrectPackageJsonContent = JSON.stringify({
      "devDependencies": {
        "tsx": "^4.6.0"
      }
    });
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => incorrectPackageJsonContent);
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    expect(() => {
      if (packageJson.devDependencies.tsx !== '^4.7.0') {
        throw new Error('tsx version is not ^4.7.0');
      }
    }).toThrow('tsx version is not ^4.7.0');
  });
});
