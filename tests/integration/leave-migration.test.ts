import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-4: leave_requests migration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contains a migration creating leave_requests table', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const migrationDirs = ['migrations', 'src/migrations'];

    let migrationContent = '';

    for (const dir of migrationDirs) {
      const resolved = path.resolve(process.cwd(), dir);
      if (fs.existsSync(resolved)) {
        const files = fs.readdirSync(resolved);
        for (const file of files) {
          const content = fs.readFileSync(path.join(resolved, file), 'utf8');
          if (content.includes('leave_requests')) {
            migrationContent = content;
          }
        }
      }
    }

    expect(migrationContent.length).toBeGreaterThan(0);
    expect(migrationContent).toMatch(/create table/i);
    expect(migrationContent).toContain('leave_requests');
  });

  it('defines expected columns and indexes', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    let content = '';

    for (const dir of ['migrations', 'src/migrations']) {
      const resolved = path.resolve(process.cwd(), dir);
      if (fs.existsSync(resolved)) {
        for (const file of fs.readdirSync(resolved)) {
          const current = fs.readFileSync(path.join(resolved, file), 'utf8');
          if (current.includes('leave_requests')) {
            content = current;
          }
        }
      }
    }

    expect(content).toContain('employee');
    expect(content).toContain('leave');
    expect(content).toContain('status');
    expect(/index/i.test(content)).toBe(true);
  });
});