import { describe, it, expect } from 'vitest';
import fs from 'fs';

const tsconfigJsonPath = 'tsconfig.json';

describe('SC-2: tsconfig.json', () => {
  it('should be created with strict mode targeting Node 22', () => {
    const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigJsonPath, 'utf-8'));
    expect(tsconfigJson.compilerOptions.strict).toBe(true);
    expect(tsconfigJson.compilerOptions.target).toBe('ES2022');
  });
});
