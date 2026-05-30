import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENTS_MD_PATH = path.resolve(__dirname, '../AGENTS.md');

/**
 * Reads the content of AGENTS.md and checks if it includes a reference to GP-004.
 */
describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-004', () => {
  it('should include a reference to GP-004', () => {
    const fileContent = fs.readFileSync(AGENTS_MD_PATH, 'utf-8');
    expect(fileContent).toContain('GP-004');
  });

  it('should throw an error if AGENTS.md does not exist', () => {
    const invalidPath = path.resolve(__dirname, '../INVALID_AGENTS.md');
    expect(() => fs.readFileSync(invalidPath, 'utf-8')).toThrowError();
  });
});
