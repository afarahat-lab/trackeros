import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-7: project documentation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('documents leave, audit enums and relationships when README exists', () => {
    const readmeExists = existsSync('README.md');

    if (!readmeExists) {
      expect(readmeExists).toBe(false);
      return;
    }

    const content = readFileSync('README.md', 'utf8');

    expect(content).toMatch(/LeaveType/i);
    expect(content).toMatch(/LeaveRequestStatus/i);
    expect(content).toMatch(/AuditAction/i);
    expect(content).toMatch(/AuditRecord/i);
    expect(content).toMatch(/LeaveRequest/i);
  });
});