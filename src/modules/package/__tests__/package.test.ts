import { describe, it, expect } from 'vitest';
import fs from 'fs';

const packageJsonPath = 'package.json';

const expectedDependencies = {
  express: '^4.18.2',
  pg: '^8.7.1',
  jsonwebtoken: '^9.0.0',
  bcrypt: '^5.0.1',
  dotenv: '^16.0.3'
};

const expectedDevDependencies = {
  typescript: '^5.0.0',
  'ts-node': '^10.9.1',
  jest: '^29.0.0',
  '@types/node': '^18.0.0',
  '@types/jest': '^29.0.0',
  '@types/express': '^4.17.14',
  '@types/jsonwebtoken': '^9.0.0',
  '@types/bcrypt': '^5.0.0'
};

describe('SC-1: package.json', () => {
  it('should be created with specified dependencies and dev dependencies', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJson.dependencies).toEqual(expectedDependencies);
    expect(packageJson.devDependencies).toEqual(expectedDevDependencies);
  });
});
