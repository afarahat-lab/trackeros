import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as auditRepositoryModule from '../../../../src/modules/audit/audit.repository';

describe('SC-3: audit.repository exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports AuditRepository and PostgreSqlAuditRepository', () => {
    expect(auditRepositoryModule).toHaveProperty('PostgreSqlAuditRepository');
  });

  it('PostgreSqlAuditRepository is constructable', () => {
    expect(typeof auditRepositoryModule.PostgreSqlAuditRepository).toBe('function');
  });
});