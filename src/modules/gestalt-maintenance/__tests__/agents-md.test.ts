import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-003', () => {
  it('should contain a reference to GP-003', () => {
    const filePath = path.resolve(__dirname, '../../AGENTS.md');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    expect(fileContent).toContain('GP-003');
  });
});
