import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SC-2: AuditRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export AuditRepository and declare create and findByEntity methods', async () => {
    const repoPath = resolve(process.cwd(), 'src/modules/audit/audit.repository.ts');
    expect(existsSync(repoPath)).toBe(true);

    const source = readFileSync(repoPath, 'utf8');
    expect(source).toMatch(/AuditRepository/);
    expect(source).toMatch(/create/);
    expect(source).toMatch(/findByEntity/);

    const mod = await import('../../../../src/modules/audit/audit.repository');
    expect(mod).toBeDefined();
  });

  it('should reference audit model types', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.repository.ts'), 'utf8');

    expect(source).toMatch(/AuditRecord/);
    expect(source).toMatch(/CreateAuditRecordInput/);
  });
});

describe('SC-3: PostgreSqlAuditRepository abstract contract', () => {
  it('should export PostgreSqlAuditRepository as an abstract class contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.repository.ts'), 'utf8');

    expect(source).toMatch(/PostgreSqlAuditRepository/);
    expect(source).toMatch(/abstract class/);
  });

  it('should declare matching repository method names', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.repository.ts'), 'utf8');

    expect(source).toMatch(/create/);
    expect(source).toMatch(/findByEntity/);
  });
});

describe('SC-4: model type usage and circular dependency protection', () => {
  it('should import audit model types from audit.model', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.repository.ts'), 'utf8');

    expect(source).toMatch(/audit\.model/);
    expect(source).toMatch(/AuditRecord/);
    expect(source).toMatch(/CreateAuditRecordInput/);
  });

  it('should not import the repository from the model file', () => {
    const modelSource = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.model.ts'), 'utf8');

    expect(modelSource).not.toMatch(/audit\.repository/);
  });
});

describe('SC-5: repository contract spec file', () => {
  it('should contain the required Vitest-based spec file', () => {
    const specPath = resolve(process.cwd(), 'tests/unit/modules/audit/audit.repository.spec.ts');
    expect(existsSync(specPath)).toBe(true);

    const source = readFileSync(specPath, 'utf8');
    expect(source).toMatch(/from\s+["']vitest["']/);
    expect(source).toMatch(/AuditRepository/);
    expect(source).toMatch(/AuditRecord/);
    expect(source).toMatch(/CreateAuditRecordInput/);
  });

  it('should not use forbidden test frameworks', () => {
    const source = readFileSync(resolve(process.cwd(), 'tests/unit/modules/audit/audit.repository.spec.ts'), 'utf8');

    expect(source).not.toMatch(/from\s+["']jest["']/);
    expect(source).not.toMatch(/from\s+["']mocha["']/);
  });
});
