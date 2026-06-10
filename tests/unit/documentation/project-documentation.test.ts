import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('SC-7: project documentation', () => {
  it('documents leave and audit domain values and relationship', () => {
    const candidateFiles = ['README.md', 'docs/README.md'];
    const existing = candidateFiles.find((file) => existsSync(file));

    expect(existing).toBeDefined();

    const content = readFileSync(existing as string, 'utf8');

    expect(content).toMatch(/ANNUAL|SICK|EMERGENCY/);
    expect(content).toMatch(/PENDING|APPROVED|REJECTED/);
    expect(content).toMatch(/CREATED|APPROVED|REJECTED/);
    expect(content).toMatch(/AuditRecord/);
    expect(content).toMatch(/LeaveRequest/);
  });
});