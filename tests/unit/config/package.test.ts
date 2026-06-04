import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('SC-1: package.json', () => {
  let packageJson;

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(`{
      "name": "leave-management",
      "version": "1.0.0",
      "main": "index.js",
      "license": "MIT",
      "scripts": {
        "start": "ts-node src/index.ts",
        "test": "jest"
      },
      "dependencies": {
        "express": "^4.17.1",
        "pg": "^8.7.1",
        "jsonwebtoken": "^8.5.1",
        "bcrypt": "^5.0.1",
        "dotenv": "^10.0.0"
      },
      "devDependencies": {
        "typescript": "^5.0.0",
        "ts-node": "^10.0.0",
        "jest": "^27.0.0",
        "@types/express": "^4.17.13",
        "@types/pg": "^8.6.1",
        "@types/jsonwebtoken": "^8.5.5",
        "@types/bcrypt": "^5.0.0",
        "@types/node": "^16.0.0",
        "@types/jest": "^27.0.0"
      }
    }`);
    packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have the correct dependencies', () => {
    expect(packageJson.dependencies).toEqual({
      "express": "^4.17.1",
      "pg": "^8.7.1",
      "jsonwebtoken": "^8.5.1",
      "bcrypt": "^5.0.1",
      "dotenv": "^10.0.0"
    });
  });

  it('should have the correct devDependencies', () => {
    expect(packageJson.devDependencies).toEqual({
      "typescript": "^5.0.0",
      "ts-node": "^10.0.0",
      "jest": "^27.0.0",
      "@types/express": "^4.17.13",
      "@types/pg": "^8.6.1",
      "@types/jsonwebtoken": "^8.5.5",
      "@types/bcrypt": "^5.0.0",
      "@types/node": "^16.0.0",
      "@types/jest": "^27.0.0"
    });
  });
});
