import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../../..');

const filesToCheck = [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/index.test.ts'
];

describe('SC-1: Project Scaffold', () => {
  filesToCheck.forEach((file) => {
    it(`should have ${file} file`, () => {
      const filePath = path.join(projectRoot, file);
      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);
    });
  });

  it('should have correct package.json content', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJsonContent.name).toBe('trackeros');
    expect(packageJsonContent.version).toBe('0.1.0');
    expect(packageJsonContent.private).toBe(true);
    expect(packageJsonContent.scripts).toEqual({
      build: 'tsc',
      test: 'vitest run',
      dev: 'tsx src/index.ts'
    });
    expect(packageJsonContent.devDependencies).toHaveProperty('typescript');
    expect(packageJsonContent.devDependencies).toHaveProperty('vitest');
    expect(packageJsonContent.devDependencies).toHaveProperty('tsx');
  });

  it('should have correct tsconfig.json content', () => {
    const tsconfigJsonPath = path.join(projectRoot, 'tsconfig.json');
    const tsconfigJsonContent = JSON.parse(fs.readFileSync(tsconfigJsonPath, 'utf-8'));
    expect(tsconfigJsonContent.compilerOptions.target).toBe('ES2022');
    expect(tsconfigJsonContent.compilerOptions.moduleResolution).toBe('node');
    expect(tsconfigJsonContent.compilerOptions.strict).toBe(true);
    expect(tsconfigJsonContent.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfigJsonContent.compilerOptions.skipLibCheck).toBe(true);
    expect(tsconfigJsonContent.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    expect(tsconfigJsonContent.include).toEqual(['src']);
  });
});
