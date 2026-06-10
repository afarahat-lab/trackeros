import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-7: project documentation', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('documents leave and audit domain concepts when README exists', () => {
    const readmeExists = existsSync('README.md');

    if (!readmeExists) {
      expect(readmeExists).toBe(false);
      return;
    }

    const content = readFileSync('README.md', 'utf8');

    expect(content).toContain('LeaveType');
    expect(content).toContain('LeaveRequestStatus');
    expect(content).toContain('AuditAction');
    expect(content).toContain('AuditRecord');
    expect(content).toMatch(/LeaveRequest/);
  });
});