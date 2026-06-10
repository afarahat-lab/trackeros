import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import fs from 'node:fs';
import path from 'node:path';

function findSqlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSqlFiles(fullPath));
    } else if (entry.name.endsWith('.sql')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('SC-4: leave migration structure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a migration creating leave_requests table and indexes', () => {
    const sqlFiles = findSqlFiles(process.cwd());
    const combined = sqlFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

    expect(combined).toMatch(/create\s+table\s+.*leave_requests/i);
    expect(combined).toMatch(/employee_id/i);
    expect(combined).toMatch(/status/i);
    expect(combined).toMatch(/index/i);
  });

  it('fails if no sql migrations are present', () => {
    const sqlFiles = findSqlFiles(process.cwd());
    expect(sqlFiles.length).toBeGreaterThan(0);
  });
});