import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-2: LeaveRepository contract', () => {
  it('exports repository definitions', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/modules/leave/leave.repository.ts', 'utf8');

    expect(source).toContain('LeaveRepository');
    expect(source).toContain('create(');
    expect(source).toContain('findById(');
    expect(source).toContain('findByEmployeeId(');
  });

  it('operates on LeaveRequest types imported from leave.model', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/modules/leave/leave.repository.ts', 'utf8');

    expect(source).toMatch(/leave\.model/);
    expect(source).toContain('LeaveRequest');
  });

  it('repository file exists', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/modules/leave/leave.repository.ts')).toBe(true);
  });
});