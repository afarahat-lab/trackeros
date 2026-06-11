import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

describe('SC-5: repository abstraction architecture', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('postgres repository contains database access', () => {
    const content = readFileSync('src/modules/leave/postgresql-leave.repository.ts', 'utf8');
    expect(content).toContain('pool.query');
  });

  it('leave repository abstraction does not contain direct postgres access', () => {
    const content = readFileSync('src/modules/leave/leave.repository.ts', 'utf8');
    expect(content.includes('pool.query')).toBe(false);
  });
});