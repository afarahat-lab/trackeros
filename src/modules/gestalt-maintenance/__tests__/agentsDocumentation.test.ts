import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AGENTS_DOC_PATH = resolve(__dirname, '../documentation/AGENTS.md');

/**
 * Test suite for verifying the golden principles in AGENTS.md
 */
describe('AGENTS.md Documentation', () => {
  it('should contain a reference to golden principle GP-004', () => {
    const content = readFileSync(AGENTS_DOC_PATH, 'utf-8');
    expect(content).toContain('GP-004: No sensitive data in logs');
  });

  it('should not contain any incorrect references to GP-004', () => {
    const content = readFileSync(AGENTS_DOC_PATH, 'utf-8');
    const incorrectReferences = content.match(/GP-004:.*\n/g);
    if (incorrectReferences) {
      incorrectReferences.forEach(reference => {
        expect(reference).toBe('GP-004: No sensitive data in logs\n');
      });
    }
  });
});
