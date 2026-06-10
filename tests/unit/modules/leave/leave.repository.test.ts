import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-2: leave.repository interface contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveRepository module', async () => {
    const mod = await import('../../../../src/modules/leave/leave.repository');
    expect(mod).toBeDefined();
    expect('LeaveRepository' in mod).toBe(true);
  });

  it('repository source references leave.model and expected methods', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const repositoryPath = path.resolve(process.cwd(), 'src/modules/leave/leave.repository.ts');
    const content = fs.readFileSync(repositoryPath, 'utf8');

    expect(content).toContain('./leave.model');
    expect(content).toContain('create');
    expect(content).toContain('findById');
    expect(content).toContain('findByEmployeeId');
  });

  it('repository source file exists', async () => {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/modules/leave/leave.repository.ts')).toBe(true);
  });
});