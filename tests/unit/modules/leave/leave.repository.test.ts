import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-2: LeaveRepository interface contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('repository file exists', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/modules/leave/leave.repository.ts')).toBe(true);
  });

  it('declares LeaveRepository with required methods', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/modules/leave/leave.repository.ts', 'utf8');

    expect(content).toContain('interface LeaveRepository');
    expect(content).toContain('create');
    expect(content).toContain('findById');
    expect(content).toContain('findByEmployeeId');
  });

  it('uses LeaveRequest types imported from leave.model', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/modules/leave/leave.repository.ts', 'utf8');

    expect(content).toMatch(/leave\.model/);
    expect(content).toContain('LeaveRequest');
  });
});