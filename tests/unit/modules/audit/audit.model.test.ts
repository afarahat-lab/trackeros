import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as auditModel from '../../../../src/modules/audit/audit.model';

describe('SC-2: audit.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports AuditAction', () => {
    expect(auditModel).toHaveProperty('AuditAction');
  });

  it('exposes AuditAction as an enum-like object', () => {
    expect(typeof auditModel.AuditAction).toBe('object');
  });
});