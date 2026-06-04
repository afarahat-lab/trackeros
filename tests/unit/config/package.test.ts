import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const packageJson = require('../../../package.json');

describe('SC-1: package.json', () => {
  it('should have the correct dependencies', () => {
    const expectedDependencies = {
      express: '^4.18.2',
      pg: '^8.7.1',
      jsonwebtoken: '^9.0.0',
      bcrypt: '^5.0.1',
      dotenv: '^16.0.3'
    };
    expect(packageJson.dependencies).toEqual(expectedDependencies);
  });

  it('should have the correct devDependencies', () => {
    const expectedDevDependencies = {
      typescript: '^5.0.0',
      'ts-node': '^10.9.1',
      jest: '^29.0.0',
      '@types/express': '^4.17.13',
      '@types/pg': '^8.6.5',
      '@types/jsonwebtoken': '^9.0.0',
      '@types/bcrypt': '^5.0.0',
      '@types/node': '^18.0.0'
    };
    expect(packageJson.devDependencies).toEqual(expectedDevDependencies);
  });
});
