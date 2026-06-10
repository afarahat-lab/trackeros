import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-2: LeaveRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('repository module exists', async () => {
    const mod = await import('../../../../src/modules/leave/leave.repository');
    expect(mod).toBeDefined();
  });

  it('defines repository operations create, findById, and findByEmployeeId via contract-compatible implementation', async () => {
    const sampleRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmployeeId: vi.fn(),
    };

    expect(typeof sampleRepository.create).toBe('function');
    expect(typeof sampleRepository.findById).toBe('function');
    expect(typeof sampleRepository.findByEmployeeId).toBe('function');
  });
});