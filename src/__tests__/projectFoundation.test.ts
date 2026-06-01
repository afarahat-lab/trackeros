import { describe, it, expect } from 'vitest';
import fs from 'fs';

const readFile = (path) => {
  return fs.readFileSync(path, 'utf-8');
};

describe('SC-1: Project Foundation Files', () => {
  it('should have a valid package.json with correct configurations', () => {
    const packageJson = JSON.parse(readFile('package.json'));
    expect(packageJson.name).toBe('gestalt-platform');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.main).toBe('src/index.ts');
    expect(packageJson.scripts.build).toBe('tsc');
    expect(packageJson.scripts.start).toBe('node dist/index.js');
    expect(packageJson.dependencies.typescript).toBe('^4.5.4');
    expect(packageJson.dependencies['@gestalt/core']).toBe('^1.0.0');
    expect(packageJson.devDependencies['ts-node']).toBe('^10.4.0');
  });

  it('should have a valid tsconfig.json with correct configurations', () => {
    const tsconfigJson = JSON.parse(readFile('tsconfig.json'));
    expect(tsconfigJson.compilerOptions.target).toBe('ES2020');
    expect(tsconfigJson.compilerOptions.module).toBe('commonjs');
    expect(tsconfigJson.compilerOptions.strict).toBe(true);
    expect(tsconfigJson.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfigJson.compilerOptions.skipLibCheck).toBe(true);
    expect(tsconfigJson.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
    expect(tsconfigJson.compilerOptions.outDir).toBe('dist');
    expect(tsconfigJson.compilerOptions.rootDir).toBe('src');
    expect(tsconfigJson.include).toContain('src');
    expect(tsconfigJson.exclude).toContain('node_modules');
    expect(tsconfigJson.exclude).toContain('dist');
  });

  it('should have a valid src/index.ts file with correct initial setup', () => {
    const indexTsContent = readFile('src/index.ts');
    expect(indexTsContent).toContain("import { createContextLogger } from '@gestalt/core';");
    expect(indexTsContent).toContain("const logger = createContextLogger('gestalt-platform');");
    expect(indexTsContent).toContain('function main() {');
    expect(indexTsContent).toContain("logger.info('Starting Gestalt platform application...');");
    expect(indexTsContent).toContain('main();');
  });
});
