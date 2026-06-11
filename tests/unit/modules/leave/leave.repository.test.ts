import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-2: LeaveRequestRepository contract', () => {
  it('exports required repository methods', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.repository.ts'), 'utf8');
    expect(file).toContain('interface LeaveRequestRepository');
    expect(file).toContain('create(');
    expect(file).toContain('findById(');
    expect(file).toContain('findByEmployeeId(');
    expect(file).toContain('update(');
  });

  it('uses LeaveRequest as persistence contract input/output', () => {
    const file = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.repository.ts'), 'utf8');
    expect(file).toContain('LeaveRequest');
  });
});