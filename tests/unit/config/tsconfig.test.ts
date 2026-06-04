import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('SC-2: tsconfig.json', () => {
  let tsconfigJson;

  beforeEach(() => {
    fs.readFileSync.mockReturnValue(`{
      "compilerOptions": {
        "target": "ES2022",
        "module": "commonjs",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "outDir": "./dist",
        "rootDir": "./src"
      },
      "include": ["src"],
      "exclude": ["node_modules", "dist"]
    }`);
    tsconfigJson = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have strict mode enabled', () => {
    expect(tsconfigJson.compilerOptions.strict).toBe(true);
  });

  it('should target ES2022', () => {
    expect(tsconfigJson.compilerOptions.target).toBe('ES2022');
  });
});
