import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collectFiles(full, results);
    else if (/README|ARCHITECTURE|architecture/i.test(entry)) results.push(full);
  }
  return results;
}

describe('SC-7: architecture documentation', () => {
  it('documents LeaveRequest, LeaveType values and LeaveRequestStatus values', () => {
    const files = collectFiles(process.cwd());
    const content = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

    expect(content).toContain('LeaveRequest');
    expect(content).toContain('ANNUAL');
    expect(content).toContain('SICK');
    expect(content).toContain('EMERGENCY');
    expect(content).toContain('PENDING');
    expect(content).toContain('APPROVED');
    expect(content).toContain('REJECTED');
  });
});