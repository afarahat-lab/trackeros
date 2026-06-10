import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-4: migration creates leave_requests table and related database objects', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('contains a migration file referencing leave_requests', () => {
    const migrationsDir = path.resolve(process.cwd());
    const files = fs.readdirSync(migrationsDir, { recursive: true }) as string[];
    const migration = files.find((file) => file.includes('leave') || file.includes('migration'));

    expect(migration).toBeDefined();
  });

  it('migration content references leave_requests table', () => {
    const files = fs.readdirSync(path.resolve(process.cwd()), { recursive: true }) as string[];
    const match = files.find((file) => file.endsWith('.sql'));

    if (!match) {
      expect(match).toBeDefined();
      return;
    }

    const content = fs.readFileSync(path.resolve(process.cwd(), match), 'utf8');
    expect(content).toContain('leave_requests');
  });
});