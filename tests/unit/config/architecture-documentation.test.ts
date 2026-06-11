import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-7: architecture documentation updated', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('documents LeaveRequest entity and enum values', () => {
    const candidates = ['README.md', 'ARCHITECTURE.md', 'docs/architecture.md'];
    const existing = candidates.find((p) => existsSync(p));

    expect(existing).toBeDefined();

    const content = readFileSync(existing as string, 'utf8');
    expect(content).toContain('LeaveRequest');
    expect(content).toContain('ANNUAL');
    expect(content).toContain('SICK');
    expect(content).toContain('EMERGENCY');
    expect(content).toContain('PENDING');
    expect(content).toContain('APPROVED');
    expect(content).toContain('REJECTED');
  });
});