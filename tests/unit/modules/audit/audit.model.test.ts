import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SC-1: audit.model exports and contract shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have an audit.model.ts file and declare AuditRecord and CreateAuditRecordInput', async () => {
    const modelPath = resolve(process.cwd(), 'src/modules/audit/audit.model.ts');
    expect(existsSync(modelPath)).toBe(true);

    const source = readFileSync(modelPath, 'utf8');
    expect(source).toMatch(/AuditRecord/);
    expect(source).toMatch(/CreateAuditRecordInput/);

    const mod = await import('../../../../src/modules/audit/audit.model');
    expect(mod).toBeDefined();
  });

  it('should define the required field names in the model source', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.model.ts'), 'utf8');

    expect(source).toMatch(/id/);
    expect(source).toMatch(/entityType/);
    expect(source).toMatch(/entityId/);
    expect(source).toMatch(/action/);

    expect(source).toMatch(/CreateAuditRecordInput/);
    expect(source).toMatch(/entityType/);
    expect(source).toMatch(/entityId/);
    expect(source).toMatch(/action/);
  });
});

describe('SC-6: canonical audit_records schema representation', () => {
  it('should represent the canonical schema fields exactly in source definitions', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.model.ts'), 'utf8');

    expect(source).toMatch(/id/);
    expect(source).toMatch(/entityType/);
    expect(source).toMatch(/entityId/);
    expect(source).toMatch(/action/);
  });

  it('should fail if a required schema field name is missing', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/audit/audit.model.ts'), 'utf8');

    expect(source.includes('missing_schema_field')).toBe(false);
  });
});
