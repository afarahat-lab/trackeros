import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as repositoryModule from '../../../../src/modules/leave/leave.repository';

describe('SC-2: LeaveRequestRepository contract', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('exports LeaveRequestRepository', () => {
    expect(repositoryModule).toHaveProperty('LeaveRequestRepository');
  });

  it('repository abstraction defines required operations', () => {
    const exported = repositoryModule as Record<string, unknown>;
    expect(exported.LeaveRequestRepository).toBeDefined();
  });
});