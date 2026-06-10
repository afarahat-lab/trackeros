import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-4: leave_requests migration', () => {
  it('migration exists and defines leave_requests table schema', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const candidates: string[] = [];
    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/leave.*\.(sql|ts|js)$/i.test(entry.name)) candidates.push(full);
      }
    };

    walk('src');
    walk('migrations');
    walk('database');

    expect(candidates.length).toBeGreaterThan(0);

    const content = candidates.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    expect(content).toMatch(/leave_requests/i);
    expect(content).toMatch(/employee_id/i);
    expect(content).toMatch(/leave_type/i);
    expect(content).toMatch(/start_date/i);
    expect(content).toMatch(/end_date/i);
    expect(content).toMatch(/status/i);
    expect(content).toMatch(/created_at/i);
  });
});