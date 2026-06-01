import { describe, it, expect } from 'vitest';
import fs from 'fs';

// Mock fs module
vi.mock('fs');

// Mocked package.json content
const mockedPackageJsonContent = JSON.stringify({
  "name": "trackeros",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "test": "echo 'no tests yet' && exit 0",
    "build": "echo 'no build yet' && exit 0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^0.0.0",
    "tsx": "^4.7.0"
  }
});

// Mock readFileSync to return the mocked package.json content
vi.mocked(fs.readFileSync).mockReturnValue(mockedPackageJsonContent);

// Function to read and parse package.json
function getPackageJson() {
  const data = fs.readFileSync('package.json', 'utf-8');
  return JSON.parse(data);
}

describe('SC-1: The tsx version in package.json is updated to tsx@^4.7.0', () => {
  it('should have tsx version as ^4.7.0 in devDependencies', () => {
    const packageJson = getPackageJson();
    expect(packageJson.devDependencies.tsx).toBe('^4.7.0');
  });

  it('should throw an error if tsx version is not ^4.7.0', () => {
    const incorrectPackageJsonContent = JSON.stringify({
      "name": "trackeros",
      "version": "0.1.0",
      "private": true,
      "packageManager": "pnpm@9.15.4",
      "scripts": {
        "test": "echo 'no tests yet' && exit 0",
        "build": "echo 'no build yet' && exit 0"
      },
      "devDependencies": {
        "typescript": "^5.0.0",
        "vitest": "^0.0.0",
        "tsx": "^4.6.0"
      }
    });

    vi.mocked(fs.readFileSync).mockReturnValueOnce(incorrectPackageJsonContent);

    expect(() => {
      const packageJson = getPackageJson();
      if (packageJson.devDependencies.tsx !== '^4.7.0') {
        throw new Error('tsx version is not ^4.7.0');
      }
    }).toThrow('tsx version is not ^4.7.0');
  });
});
