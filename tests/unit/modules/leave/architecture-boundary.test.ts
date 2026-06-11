import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SC-6: persistence access routed through repository', () => {
  it('repository implementation owns database access', () => {
    const repoImpl = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/postgresql-leave.repository.ts'), 'utf8');
    expect(repoImpl).toContain('pool.query');
  });

  it('repository contract does not expose database-specific APIs', () => {
    const contract = fs.readFileSync(path.resolve(process.cwd(), 'src/modules/leave/leave.repository.ts'), 'utf8');
    expect(contract).not.toContain('pool.query');
    expect(contract).not.toContain('SELECT ');
    expect(contract).not.toContain('INSERT INTO');
  });
});