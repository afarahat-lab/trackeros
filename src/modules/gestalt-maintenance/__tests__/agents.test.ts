import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENTS_MD_PATH = path.resolve(__dirname, '../docs/AGENTS.md');

function readAgentsMd() {
  return fs.readFileSync(AGENTS_MD_PATH, 'utf-8');
}

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-003', () => {
  it('should include a reference to GP-003 in the Golden Principles section', () => {
    const content = readAgentsMd();
    const hasGP003 = content.includes('**GP-003**: No sensitive data in logs. Ensure all sensitive fields are masked before logging.');
    expect(hasGP003).toBe(true);
  });

  it('should not have any malformed references to GP-003', () => {
    const content = readAgentsMd();
    const malformedGP003 = content.match(/\*\*GP-003\*\*[^:]*:/g);
    expect(malformedGP003).toBeNull();
  });
});
