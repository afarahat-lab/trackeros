import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as auditRepositoryModule from '../../../../src/modules/audit/audit.repository';

describe('SC-3: audit.repository structure', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports PostgreSqlAuditRepository', () => {
    expect(auditRepositoryModule).toHaveProperty('PostgreSqlAuditRepository');
    expect(typeof (auditRepositoryModule as Record<string, unknown>).PostgreSqlAuditRepository).toBe('function');
  });

  it('repository class can be referenced', () => {
    expect((auditRepositoryModule as Record<string, unknown>).PostgreSqlAuditRepository).toBeDefined();
  });
});