import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-6: architecture documentation records leave domain enums and lifecycle states', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains documented leave types and status lifecycle in a project document', () => {
    const candidateFiles = [
      'README.md',
      'docs/architecture.md',
      'docs/ARCHITECTURE.md'
    ];

    const existingFile = candidateFiles.find((file) => existsSync(file));

    expect(existingFile).toBeDefined();

    const content = readFileSync(existingFile as string, 'utf8');

    expect(content).toContain('ANNUAL');
    expect(content).toContain('SICK');
    expect(content).toContain('EMERGENCY');
    expect(content).toContain('PENDING');
    expect(content).toContain('APPROVED');
    expect(content).toContain('REJECTED');
  });

  it('fails when no architecture-related documentation file exists', () => {
    const hasDocument = existsSync('README.md') || existsSync('docs/architecture.md') || existsSync('docs/ARCHITECTURE.md');
    expect(hasDocument).toBe(true);
  });
});