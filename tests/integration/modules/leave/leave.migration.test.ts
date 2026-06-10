import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-4: leave request migration exists', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a migration creating leave_requests table with key columns', () => {
    const projectRoot = process.cwd();
    const candidates = [
      path.join(projectRoot, 'migrations'),
      path.join(projectRoot, 'src', 'migrations'),
      path.join(projectRoot, 'database', 'migrations'),
    ];

    const existingDir = candidates.find((dir) => fs.existsSync(dir));
    expect(existingDir).toBeDefined();

    const files = fs.readdirSync(existingDir as string);
    const migrationFile = files.find((file) => /leave/i.test(file));

    expect(migrationFile).toBeDefined();

    const content = fs.readFileSync(path.join(existingDir as string, migrationFile as string), 'utf8');
    expect(content).toMatch(/create\s+table\s+.*leave_requests/i);
    expect(content).toMatch(/employee_id/i);
    expect(content).toMatch(/leave_type/i);
    expect(content).toMatch(/start_date/i);
    expect(content).toMatch(/end_date/i);
    expect(content).toMatch(/status/i);
  });
});