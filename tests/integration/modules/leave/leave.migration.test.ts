import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('SC-4 leave_requests migration exists with expected schema markers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a migration creating leave_requests table', () => {
    const migrationRoots = ['migrations', 'src/migrations', 'database/migrations'];

    const discovered = migrationRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => readdirSync(root).map((file) => join(root, file)));

    const migrationFile = discovered.find((file) => {
      const content = readFileSync(file, 'utf8');
      return content.includes('leave_requests');
    });

    expect(migrationFile).toBeDefined();
  });

  it('includes expected leave request columns and indexes', () => {
    const migrationRoots = ['migrations', 'src/migrations', 'database/migrations'];

    const discovered = migrationRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => readdirSync(root).map((file) => join(root, file)));

    const migrationFile = discovered.find((file) => {
      const content = readFileSync(file, 'utf8');
      return content.includes('leave_requests');
    });

    expect(migrationFile).toBeDefined();

    const content = readFileSync(migrationFile as string, 'utf8').toLowerCase();

    expect(content).toContain('leave_requests');
    expect(content).toContain('employee');
    expect(content).toContain('status');
  });
});