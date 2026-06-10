import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-7: documentation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains documentation describing leave and audit concepts', () => {
    const candidates = ['README.md', 'docs/README.md'];
    const existing = candidates.find((path) => existsSync(path));

    expect(existing).toBeDefined();

    const content = readFileSync(existing as string, 'utf8');

    expect(content).toContain('LeaveType');
    expect(content).toContain('LeaveRequestStatus');
    expect(content).toContain('AuditAction');
    expect(content).toContain('AuditRecord');
    expect(content).toContain('LeaveRequest');
  });
});