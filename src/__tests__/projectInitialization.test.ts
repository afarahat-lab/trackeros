import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/api/index.ts',
  'src/api/routes/index.ts',
  'src/shared/db/index.ts',
  'src/shared/auth/index.ts',
  'src/shared/utils/logger.ts'
];

describe('SC-1: Project Initialization', () => {
  it('should have all required configuration files present', () => {
    requiredFiles.forEach((file) => {
      const filePath = path.join(__dirname, '../..', file);
      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);
    });
  });

  it('should have a valid package.json file', () => {
    const packageJsonPath = path.join(__dirname, '../..', 'package.json');
    const packageJsonExists = fs.existsSync(packageJsonPath);
    expect(packageJsonExists).toBe(true);

    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    expect(packageJson).toHaveProperty('name', 'trackeros');
    expect(packageJson).toHaveProperty('version', '1.0.0');
    expect(packageJson).toHaveProperty('main', 'index.js');
    expect(packageJson.scripts).toHaveProperty('start', 'node dist/index.js');
    expect(packageJson.scripts).toHaveProperty('build', 'tsc');
    expect(packageJson.scripts).toHaveProperty('dev', 'ts-node-dev src/index.ts');
    expect(packageJson.dependencies).toHaveProperty('fastify', '^4.0.0');
    expect(packageJson.dependencies).toHaveProperty('zod', '^3.0.0');
    expect(packageJson.dependencies).toHaveProperty('pg', '^8.0.0');
    expect(packageJson.devDependencies).toHaveProperty('typescript', '^5.0.0');
    expect(packageJson.devDependencies).toHaveProperty('ts-node-dev', '^2.0.0');
  });

  it('should have a valid tsconfig.json file', () => {
    const tsconfigJsonPath = path.join(__dirname, '../..', 'tsconfig.json');
    const tsconfigJsonExists = fs.existsSync(tsconfigJsonPath);
    expect(tsconfigJsonExists).toBe(true);

    const tsconfigJsonContent = fs.readFileSync(tsconfigJsonPath, 'utf-8');
    const tsconfigJson = JSON.parse(tsconfigJsonContent);

    expect(tsconfigJson.compilerOptions).toHaveProperty('target', 'ES2020');
    expect(tsconfigJson.compilerOptions).toHaveProperty('module', 'commonjs');
    expect(tsconfigJson.compilerOptions).toHaveProperty('strict', true);
    expect(tsconfigJson.compilerOptions).toHaveProperty('esModuleInterop', true);
    expect(tsconfigJson.compilerOptions).toHaveProperty('skipLibCheck', true);
    expect(tsconfigJson.compilerOptions).toHaveProperty('forceConsistentCasingInFileNames', true);
    expect(tsconfigJson.compilerOptions).toHaveProperty('outDir', 'dist');
    expect(tsconfigJson).toHaveProperty('include');
    expect(tsconfigJson.include).toContain('src');
  });
});
