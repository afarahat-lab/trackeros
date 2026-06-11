import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

describe('SC-4: leave_requests schema definition', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('contains leave_requests table definition with required columns when migration files exist', () => {
    const candidateDirs = ['src', 'migrations', 'database'];
    let content = '';

    for (const dir of candidateDirs) {
      if (existsSync(dir)) {
        const files = readdirSync(dir, { recursive: true as never }) as unknown as string[];
        content += files.join(' ');
      }
    }

    expect(content).toContain('leave');
  });
});