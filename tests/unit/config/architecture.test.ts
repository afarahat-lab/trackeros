import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import * as fs from 'node:fs';
import * as path from 'node:path';

describe('SC-6: architecture documentation records leave enums', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('documents all supported leave types', () => {
    const docPath = path.resolve(process.cwd(), 'docs/ARCHITECTURE.md');
    const content = fs.readFileSync(docPath, 'utf8');

    expect(content).toContain('ANNUAL');
    expect(content).toContain('SICK');
    expect(content).toContain('EMERGENCY');
  });

  it('documents all leave request statuses', () => {
    const docPath = path.resolve(process.cwd(), 'docs/ARCHITECTURE.md');
    const content = fs.readFileSync(docPath, 'utf8');

    expect(content).toContain('PENDING');
    expect(content).toContain('APPROVED');
    expect(content).toContain('REJECTED');
  });
});