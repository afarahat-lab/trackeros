import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-7: architecture documentation', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('documents LeaveRequest entity and supported values', () => {
    const filePath = path.resolve(process.cwd(), 'docs/DOMAIN.md');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('LeaveRequest');
    expect(content).toContain('ANNUAL');
    expect(content).toContain('SICK');
    expect(content).toContain('EMERGENCY');
    expect(content).toContain('PENDING');
    expect(content).toContain('APPROVED');
    expect(content).toContain('REJECTED');
  });

  it('fails if documentation file is missing', () => {
    const filePath = path.resolve(process.cwd(), 'docs/DOMAIN.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});